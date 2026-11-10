"""
scorer.py - Risk scoring engine for TinyTots ASD Screening
===========================================================
• Converts raw answers → weighted domain scores → overall 0-100 risk score
• Age-aware score adjustment (developmental expectations differ under 4)
• Threshold-based risk classification with borderline detection
• Hybrid model transparency (RF + LR predictions exposed)
"""

from dataclasses import dataclass
from typing import Optional
from backend.questions import (
    Question, ALL_QUESTIONS,
    DOMAIN_SOCIAL, DOMAIN_COMMUNICATION, DOMAIN_BEHAVIORAL,
)


# ── Risk thresholds ───────────────────────────────────────────────────────────
RISK_LOW       = 30   # 0–29   → Low Risk
RISK_MODERATE  = 55   # 30–54  → Moderate Risk  (Stage 2 triggered at >= 30)
RISK_HIGH      = 75   # 55–74  → High Risk
# >= 75 → Very High Risk

BORDERLINE_MARGIN = 5  # within ±5 of a threshold = borderline


@dataclass
class DomainScore:
    domain: str
    raw_score: float        # sum of weighted item scores
    max_score: float        # maximum possible score
    percentage: float       # 0–100
    item_count: int
    flag_items: list[str]   # question IDs that flagged (scored as risk)


@dataclass
class ScoringResult:
    # Overall
    overall_score: float          # 0–100
    risk_level: str               # Low / Moderate / High / Very High
    risk_label: str               # human-readable label
    is_borderline: bool
    borderline_note: str

    # Stage info
    stage_completed: int          # 1 or 2
    stage2_triggered: bool

    # Domain breakdown
    domain_scores: dict[str, DomainScore]

    # Per-item
    item_scores: dict[str, int]   # question_id → 0 or 1 (risk flag)

    # Model transparency
    rf_probability: Optional[float] = None   # Random Forest P(ASD)
    lr_probability: Optional[float] = None   # Logistic Regression P(ASD)
    rf_prediction: Optional[int] = None
    lr_prediction: Optional[int] = None
    final_decision_basis: str = ""

    # Age context
    age_adjustment_applied: bool = False
    age_adjustment_note: str = ""


def _score_item(question: Question, answer_index: int) -> int:
    """Return 1 (risk indicator) or 0 for a single answer."""
    if question.reverse_scored:
        # Higher answer index = LOWER risk (e.g., staring "Never" = good)
        return 1 if answer_index <= 2 else 0
    else:
        # Higher answer index = HIGHER risk (e.g., eye contact "Never" = bad)
        return 1 if answer_index >= 2 else 0


def _age_adjustment(score: float, age_months: int) -> tuple[float, bool, str]:
    """
    Apply age-aware adjustment to the raw score.
    Younger toddlers (12-18 months) naturally show fewer social behaviours,
    so we soften the score slightly to avoid over-flagging.
    """
    if age_months < 18:
        adjusted = score * 0.88
        return adjusted, True, (
            f"Score softened by ~12% because the child is {age_months} months old. "
            "Some behaviours assessed are still developing at this age."
        )
    elif age_months < 24:
        adjusted = score * 0.94
        return adjusted, True, (
            f"Score softened by ~6% because the child is {age_months} months old. "
            "Certain social-communication skills are still emerging at this age."
        )
    return score, False, ""


def _classify_risk(score: float) -> tuple[str, str]:
    if score < RISK_LOW:
        return "Low", "No significant ASD traits detected"
    elif score < RISK_MODERATE:
        return "Moderate", "Some ASD indicators - further assessment recommended"
    elif score < RISK_HIGH:
        return "High", "Multiple ASD indicators - professional evaluation strongly recommended"
    else:
        return "Very High", "Significant ASD indicators - urgent professional evaluation recommended"


def _detect_borderline(score: float) -> tuple[bool, str]:
    for threshold, name in [
        (RISK_LOW, "Low/Moderate"),
        (RISK_MODERATE, "Moderate/High"),
        (RISK_HIGH, "High/Very High"),
    ]:
        if abs(score - threshold) <= BORDERLINE_MARGIN:
            return True, (
                f"⚠ BORDERLINE CASE: Score ({score:.1f}) is within {BORDERLINE_MARGIN} points "
                f"of the {name} threshold ({threshold}). A small change in responses could "
                f"shift the classification. Additional assessment is particularly recommended."
            )
    return False, ""


def compute_scores(
    answers: dict[str, int],        # question_id → answer index
    age_months: int,
    stage_completed: int = 1,
    rf_prob: Optional[float] = None,
    lr_prob: Optional[float] = None,
    rf_pred: Optional[int] = None,
    lr_pred: Optional[int] = None,
) -> ScoringResult:
    """
    Main scoring function. Call with all collected answers.
    Returns a full ScoringResult with domain breakdown, borderline detection, etc.
    """

    # ── Per-item scoring ──────────────────────────────────────────────────────
    item_scores: dict[str, int] = {}
    for qid, ans_idx in answers.items():
        q = ALL_QUESTIONS.get(qid)
        if q:
            item_scores[qid] = _score_item(q, ans_idx)

    # ── Domain scoring ────────────────────────────────────────────────────────
    domain_accum: dict[str, dict] = {
        DOMAIN_SOCIAL:        {"raw": 0.0, "max": 0.0, "flags": [], "count": 0},
        DOMAIN_COMMUNICATION: {"raw": 0.0, "max": 0.0, "flags": [], "count": 0},
        DOMAIN_BEHAVIORAL:    {"raw": 0.0, "max": 0.0, "flags": [], "count": 0},
    }

    for qid, raw_score in item_scores.items():
        q = ALL_QUESTIONS[qid]
        d = domain_accum[q.domain]
        d["raw"]   += raw_score * q.weight
        d["max"]   += 1.0 * q.weight
        d["count"] += 1
        if raw_score == 1:
            d["flags"].append(qid)

    domain_scores: dict[str, DomainScore] = {}
    for domain, acc in domain_accum.items():
        pct = (acc["raw"] / acc["max"] * 100) if acc["max"] > 0 else 0.0
        domain_scores[domain] = DomainScore(
            domain=domain,
            raw_score=round(acc["raw"], 2),
            max_score=round(acc["max"], 2),
            percentage=round(pct, 1),
            item_count=acc["count"],
            flag_items=acc["flags"],
        )

    # ── Overall score (weighted average of domain percentages) ────────────────
    # Weights: Social=35%, Communication=35%, Behavioral=30%
    domain_weights = {
        DOMAIN_SOCIAL:        0.35,
        DOMAIN_COMMUNICATION: 0.35,
        DOMAIN_BEHAVIORAL:    0.30,
    }
    raw_overall = sum(
        domain_scores[d].percentage * w
        for d, w in domain_weights.items()
    )

    # ── ML model blending ─────────────────────────────────────────────────────
    # If ML probabilities are available, blend them with rule-based score
    ml_score = None
    decision_basis = "Rule-based Q-Chat-10 scoring only"

    if rf_prob is not None and lr_prob is not None:
        # Ensemble: 60% RF + 40% LR
        ml_prob = 0.60 * rf_prob + 0.40 * lr_prob
        ml_score = ml_prob * 100
        # Final blend: 50% rule-based + 50% ML
        raw_overall = 0.50 * raw_overall + 0.50 * ml_score
        decision_basis = (
            f"Hybrid: 50% rule-based Q-Chat-10 score + "
            f"50% ML ensemble (RF {rf_prob:.2f} × 0.6 + LR {lr_prob:.2f} × 0.4)"
        )
    elif rf_prob is not None:
        ml_score = rf_prob * 100
        raw_overall = 0.60 * raw_overall + 0.40 * ml_score
        decision_basis = f"Hybrid: 60% rule-based + 40% Random Forest (P={rf_prob:.2f})"

    # ── Age adjustment ────────────────────────────────────────────────────────
    adjusted_score, age_adj_applied, age_adj_note = _age_adjustment(raw_overall, age_months)
    final_score = round(min(max(adjusted_score, 0), 100), 1)

    # ── Classification & borderline ───────────────────────────────────────────
    risk_level, risk_label = _classify_risk(final_score)
    is_borderline, borderline_note = _detect_borderline(final_score)

    stage2_triggered = final_score >= RISK_LOW  # trigger Stage 2 if score >= 30

    return ScoringResult(
        overall_score=final_score,
        risk_level=risk_level,
        risk_label=risk_label,
        is_borderline=is_borderline,
        borderline_note=borderline_note,
        stage_completed=stage_completed,
        stage2_triggered=stage2_triggered,
        domain_scores=domain_scores,
        item_scores=item_scores,
        rf_probability=rf_prob,
        lr_probability=lr_prob,
        rf_prediction=rf_pred,
        lr_prediction=lr_pred,
        final_decision_basis=decision_basis,
        age_adjustment_applied=age_adj_applied,
        age_adjustment_note=age_adj_note,
    )