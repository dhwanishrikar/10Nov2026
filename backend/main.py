"""
main.py - TinyTots ASD Screening API (Upgraded v2)
====================================================
FastAPI backend with:
  • Multi-stage screening (Stage 1 + Stage 2)
  • Hybrid ML model (RF + LR)
  • Domain-based scoring
  • Professional report generation
  • Follow-up / re-screening with trend detection
  • Age-aware scoring
  • Conditional questions
  • Borderline detection
  • Actionable recommendations
  • Validation summary

Run with:  python -m uvicorn main:app --reload
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import traceback

# ── Local modules ─────────────────────────────────────────────────────────────
from backend.questions import (
    get_stage1_questions, get_stage2_questions,
    get_conditional_questions, ALL_QUESTIONS
)
from backend.scorer import compute_scores, RISK_LOW
from backend.recommendations import generate_recommendations
from backend.storage import save_result, compute_trend, build_comparison
from backend.report import generate_report
from backend.predictor import load_models, predict
# ── App setup ─────────────────────────────────────────────────────────────────
app = FastAPI(
    title="TinyTots ASD Screening API",
    description="Advanced clinical decision-support system for early ASD screening",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    load_models()


# ── Request / Response models ─────────────────────────────────────────────────

class ChildInfo(BaseModel):
    name: str
    age_months: int = Field(..., ge=12, le=48)
    sex: str                        # "m" or "f"
    ethnicity: str = ""
    jaundice: bool = False
    family_asd: bool = False
    completed_by: str = "family member"


class ScreeningRequest(BaseModel):
    child_info: ChildInfo
    answers: dict[str, int]         # question_id → answer index (0-based)
    stage: int = 1                  # 1 = Stage 1 only, 2 = Stage 1+2 complete


class DomainScoreOut(BaseModel):
    domain: str
    percentage: float
    item_count: int
    flag_items: list[str]
    interpretation: str


class ModelTransparency(BaseModel):
    rf_probability: Optional[float]
    rf_prediction: Optional[str]
    lr_probability: Optional[float]
    lr_prediction: Optional[str]
    ensemble_probability: Optional[float]
    final_decision_basis: str
    models_available: bool


class FeatureContribution(BaseModel):
    feature: str
    domain: str
    label: str
    contribution_pct: float
    direction: str          # "risk" | "protective"


class Explainability(BaseModel):
    available: bool
    base_value_pct: Optional[float] = None
    top_positive: list[FeatureContribution] = []
    top_negative: list[FeatureContribution] = []
    all_features: list[FeatureContribution] = []
    plain_explanation: Optional[str] = None
    model_basis: Optional[str] = None


class Confidence(BaseModel):
    confidence_pct: Optional[float]
    confidence_level: str
    low_confidence_note: Optional[str] = None


class ScreeningResponse(BaseModel):
    screening_date: str
    # Core result
    overall_score: float
    risk_level: str
    risk_label: str
    is_borderline: bool
    borderline_note: str

    # Stage info
    stage_completed: int
    stage2_required: bool
    stage2_questions: Optional[list[dict]]

    # Conditional questions triggered
    conditional_questions: list[dict]

    # Domain breakdown
    domain_scores: list[DomainScoreOut]

    # Model transparency
    model_transparency: ModelTransparency

    # Explainability (SHAP)
    explainability: Explainability

    # Confidence score
    confidence: Confidence

    # Recommendations
    recommendations: dict

    # Report (full text)
    report_text: str

    # Comparison (if re-screening)
    comparison: Optional[dict]
    trend: str

    # Age adjustment
    age_adjustment_applied: bool
    age_adjustment_note: str


# ── Helpers ───────────────────────────────────────────────────────────────────
def _domain_interpretation(domain: str, percentage: float) -> str:
    if percentage < 30:
        return "Within typical range"
    elif percentage < 55:
        return "Mild concerns - monitor"
    elif percentage < 75:
        return "Moderate concerns - evaluation recommended"
    else:
        return "Significant concerns - prompt evaluation strongly recommended"


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {
        "status": "ok",
        "message": "TinyTots ASD Screening API v2.0 is running 🚀",
        "docs": "/docs",
    }


@app.get("/questions/stage1")
def get_stage1():
    """Return all Stage 1 Q-Chat-10 questions."""
    return [
        {
            "id": q.id,
            "text": q.text,
            "domain": q.domain,
            "options": q.options,
            "stage": q.stage,
        }
        for q in get_stage1_questions()
    ]


@app.get("/questions/stage2")
def get_stage2():
    """Return Stage 2 deep-dive questions."""
    return [
        {
            "id": q.id,
            "text": q.text,
            "domain": q.domain,
            "options": q.options,
            "stage": q.stage,
        }
        for q in get_stage2_questions()
    ]


@app.post("/questions/conditional")
def get_conditional(answers: dict[str, int]):
    """Return which conditional questions are triggered by the given answers."""
    triggered = get_conditional_questions(answers)
    return [
        {
            "id": q.id,
            "text": q.text,
            "domain": q.domain,
            "options": q.options,
            "triggered_by": q.conditional_on,
        }
        for q in triggered
    ]


@app.post("/predict", response_model=ScreeningResponse)
def predict_endpoint(request: ScreeningRequest):
    """
    Main prediction endpoint.
    Accepts answers for Stage 1 (and optionally Stage 2),
    returns full scoring, domain analysis, report, and recommendations.
    """
    try:
        ci = request.child_info

        # ── ML Prediction ────────────────────────────────────────────────────
        ml_result = predict(
            answers=request.answers,
            age_months=ci.age_months,
            sex=ci.sex,
            ethnicity=ci.ethnicity,
            jaundice=ci.jaundice,
            family_asd=ci.family_asd,
            completed_by=ci.completed_by,
        )

        # ── Scoring ──────────────────────────────────────────────────────────
        scoring = compute_scores(
            answers=request.answers,
            age_months=ci.age_months,
            stage_completed=request.stage,
            rf_prob=ml_result.get("rf_probability"),
            lr_prob=ml_result.get("lr_probability"),
            rf_pred=ml_result.get("rf_prediction"),
            lr_pred=ml_result.get("lr_prediction"),
        )

        # ── Stage 2 check ─────────────────────────────────────────────────────
        stage2_required = (
            request.stage == 1
            and scoring.stage2_triggered
        )
        stage2_qs = None
        if stage2_required:
            stage2_qs = [
                {
                    "id": q.id,
                    "text": q.text,
                    "domain": q.domain,
                    "options": q.options,
                }
                for q in get_stage2_questions()
            ]

        # ── Conditional questions ─────────────────────────────────────────────
        conditional_triggered = get_conditional_questions(request.answers)
        conditional_out = [
            {
                "id": q.id,
                "text": q.text,
                "domain": q.domain,
                "options": q.options,
                "triggered_by": q.conditional_on,
            }
            for q in conditional_triggered
        ]

        # ── History / trend ───────────────────────────────────────────────────
        trend, previous = compute_trend(scoring.overall_score, ci.name, ci.sex)
        comparison = build_comparison(scoring.overall_score, previous) if previous else None

        # ── Save this result ──────────────────────────────────────────────────
        save_result(
            child_name=ci.name,
            gender=ci.sex,
            age_months=ci.age_months,
            overall_score=scoring.overall_score,
            risk_level=scoring.risk_level,
            domain_scores=scoring.domain_scores,
            item_scores=scoring.item_scores,
            answers=request.answers,
        )

        # ── Recommendations ───────────────────────────────────────────────────
        recs = generate_recommendations(
            risk_level=scoring.risk_level,
            domain_scores=scoring.domain_scores,
            age_months=ci.age_months,
            is_borderline=scoring.is_borderline,
            trend=trend,
        )

        # ── Report ────────────────────────────────────────────────────────────
        report_text = generate_report(
            child_name=ci.name,
            age_months=ci.age_months,
            gender=ci.sex,
            ethnicity=ci.ethnicity,
            jaundice=ci.jaundice,
            family_asd=ci.family_asd,
            completed_by=ci.completed_by,
            result=scoring,
            recommendations=recs,
            comparison=comparison,
            answers=request.answers,
            audience="caretaker",
        )

        # ── Build response ────────────────────────────────────────────────────
        domain_scores_out = [
            DomainScoreOut(
                domain=domain,
                percentage=ds.percentage,
                item_count=ds.item_count,
                flag_items=ds.flag_items,
                interpretation=_domain_interpretation(domain, ds.percentage),
            )
            for domain, ds in scoring.domain_scores.items()
        ]

        rf_pred_label = None
        lr_pred_label = None
        if ml_result.get("rf_prediction") is not None:
            rf_pred_label = "ASD Traits" if ml_result["rf_prediction"] == 1 else "No ASD Traits"
        if ml_result.get("lr_prediction") is not None:
            lr_pred_label = "ASD Traits" if ml_result["lr_prediction"] == 1 else "No ASD Traits"

        model_transparency = ModelTransparency(
            rf_probability=ml_result.get("rf_probability"),
            rf_prediction=rf_pred_label,
            lr_probability=ml_result.get("lr_probability"),
            lr_prediction=lr_pred_label,
            ensemble_probability=ml_result.get("ensemble_probability"),
            final_decision_basis=scoring.final_decision_basis,
            models_available=ml_result.get("models_available", False),
        )

        # ── Explainability (SHAP) ───────────────────────────────────────────────
        exp_raw = ml_result.get("explainability")
        if exp_raw:
            explainability = Explainability(
                available=True,
                base_value_pct=exp_raw["base_value_pct"],
                top_positive=[FeatureContribution(**f) for f in exp_raw["top_positive"]],
                top_negative=[FeatureContribution(**f) for f in exp_raw["top_negative"]],
                all_features=[FeatureContribution(**f) for f in exp_raw["all_features"]],
                plain_explanation=exp_raw["plain_explanation"],
                model_basis=exp_raw["model_basis"],
            )
        else:
            explainability = Explainability(available=False)

        # ── Confidence ───────────────────────────────────────────────────────────
        conf_raw = ml_result.get("confidence") or {}
        confidence = Confidence(
            confidence_pct=conf_raw.get("confidence_pct"),
            confidence_level=conf_raw.get("confidence_level", "unavailable"),
            low_confidence_note=conf_raw.get("low_confidence_note"),
        )

        return ScreeningResponse(
            screening_date=datetime.now().isoformat(),
            overall_score=scoring.overall_score,
            risk_level=scoring.risk_level,
            risk_label=scoring.risk_label,
            is_borderline=scoring.is_borderline,
            borderline_note=scoring.borderline_note,
            stage_completed=request.stage,
            stage2_required=stage2_required,
            stage2_questions=stage2_qs,
            conditional_questions=conditional_out,
            domain_scores=domain_scores_out,
            model_transparency=model_transparency,
            explainability=explainability,
            confidence=confidence,
            recommendations=recs,
            report_text=report_text,
            comparison=comparison,
            trend=trend,
            age_adjustment_applied=scoring.age_adjustment_applied,
            age_adjustment_note=scoring.age_adjustment_note,
        )

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/history/{child_name}/{gender}")
def get_history(child_name: str, gender: str):
    """Retrieve full screening history for a child."""
    from backend.storage import load_history
    history = load_history(child_name, gender)
    if not history:
        raise HTTPException(status_code=404, detail="No history found for this child.")
    return history