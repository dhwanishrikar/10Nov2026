"""
explainer.py - SHAP-based explainability for the TinyTots hybrid ASD model
=============================================================================
Uses shap.TreeExplainer on the Random Forest model (the dominant 60% member
of the ensemble, and the natural fit for SHAP's exact tree algorithm) to
compute per-feature contributions to the predicted ASD-risk probability.

Design notes:
  • TreeExplainer with a background sample gives SHAP values already in
    probability space (model_output="probability"), so a feature's SHAP
    value can be read directly as "+/- N percentage points of risk".
  • A small background sample (from the training data) is cached at
    startup so per-request explanation stays fast (<50ms).
  • Every raw feature (A1-A10 + demographics) is mapped to a clinically
    worded, direction-aware phrase so parents see plain language, not
    feature codes.
  • Falls back gracefully (returns None) if SHAP or the model isn't
    available, so /predict never breaks because of this module.
"""

import os
import warnings
from typing import Optional

import numpy as np
import pandas as pd

warnings.filterwarnings("ignore", category=UserWarning)

BASE_DIR = os.path.dirname(__file__)

FEATURE_ORDER = [
    "A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8", "A9", "A10",
    "Age_Mons", "Sex", "Ethnicity", "Jaundice",
    "Family_mem_with_ASD", "Who completed the test",
]

# ── Clinical phrasing for each feature, direction-aware ──────────────────────
# "risk" = phrase to show when this feature pushed the prediction TOWARD risk
# "protective" = phrase to show when it pushed AWAY from risk
FEATURE_META = {
    "A1":  {"domain": "Social Interaction",  "risk": "Doesn't consistently respond when name is called",       "protective": "Responds well when name is called"},
    "A2":  {"domain": "Social Interaction",  "risk": "Poor eye contact",                                        "protective": "Good eye contact"},
    "A3":  {"domain": "Communication",       "risk": "Doesn't point to request items",                          "protective": "Points to request items"},
    "A4":  {"domain": "Communication",       "risk": "Doesn't point to share interest",                         "protective": "Points to share interest with others"},
    "A5":  {"domain": "Social Interaction",  "risk": "Limited pretend play",                                    "protective": "Engages in pretend play"},
    "A6":  {"domain": "Social Interaction",  "risk": "Doesn't follow others' gaze",                             "protective": "Follows others' gaze / joint attention"},
    "A7":  {"domain": "Social Interaction",  "risk": "Doesn't show comforting behaviour toward others",         "protective": "Shows comforting behaviour toward others"},
    "A8":  {"domain": "Communication",       "risk": "Delayed or unusual early speech development",             "protective": "Typical early speech development"},
    "A9":  {"domain": "Communication",       "risk": "Limited use of simple gestures (e.g. waving)",            "protective": "Uses simple gestures appropriately"},
    "A10": {"domain": "Behavioral Patterns", "risk": "Frequent unexplained staring episodes",                   "protective": "No unusual staring behaviour"},
    "Age_Mons":                {"domain": "Demographic", "risk": "Age at screening",              "protective": "Age at screening"},
    "Sex":                     {"domain": "Demographic", "risk": "Sex assigned at birth",         "protective": "Sex assigned at birth"},
    "Ethnicity":               {"domain": "Demographic", "risk": "Ethnicity",                     "protective": "Ethnicity"},
    "Jaundice":                {"domain": "Medical History", "risk": "History of neonatal jaundice", "protective": "No history of neonatal jaundice"},
    "Family_mem_with_ASD":     {"domain": "Medical History", "risk": "Family history of ASD",     "protective": "No family history of ASD"},
    "Who completed the test":  {"domain": "Demographic", "risk": "Respondent completing the assessment", "protective": "Respondent completing the assessment"},
}

_explainer = None
_background = None
_ready = False


def init_explainer(rf_model) -> bool:
    """Build (once) a TreeExplainer for the RF model using a cached background
    sample from the training data. Call this after the RF model is loaded."""
    global _explainer, _background, _ready
    try:
        import shap  # imported lazily so the app still boots without it

        csv_path = os.path.join(BASE_DIR, "cleaned_qchat.csv")
        if os.path.exists(csv_path):
            df = pd.read_csv(csv_path)
            sample_n = min(60, len(df))
            _background = df[FEATURE_ORDER].sample(sample_n, random_state=42).values
        else:
            # Minimal synthetic fallback background if the CSV isn't shipped
            _background = np.zeros((10, len(FEATURE_ORDER)))

        _explainer = shap.TreeExplainer(rf_model, _background, model_output="probability")
        _ready = True
        print("✅  SHAP TreeExplainer initialised")
    except Exception as e:
        print(f"⚠   SHAP explainer unavailable ({e}); explainability will be disabled")
        _ready = False
    return _ready


def is_ready() -> bool:
    return _ready


def _humanize(feature_id: str, contribution_pct: float, answer_value: Optional[int]) -> dict:
    meta = FEATURE_META.get(feature_id, {"domain": "Other", "risk": feature_id, "protective": feature_id})
    is_risk_direction = contribution_pct > 0
    label = meta["risk"] if is_risk_direction else meta["protective"]
    return {
        "feature": feature_id,
        "domain": meta["domain"],
        "label": label,
        "contribution_pct": round(contribution_pct, 1),
        "direction": "risk" if is_risk_direction else "protective",
    }


def explain(
    answers: dict[str, int],
    age_months: int,
    sex_enc: int,
    eth_enc: int,
    jaundice_enc: int,
    fasd_enc: int,
    who_enc: int,
) -> Optional[dict]:
    """
    Compute a SHAP-based explanation for a single screening.
    Returns None if the explainer isn't available (caller should handle
    that gracefully - explainability is an enhancement, not a hard
    requirement for a prediction to be returned).
    """
    if not _ready or _explainer is None:
        return None

    try:
        x = np.array([[
            answers.get("A1", 0), answers.get("A2", 0), answers.get("A3", 0),
            answers.get("A4", 0), answers.get("A5", 0), answers.get("A6", 0),
            answers.get("A7", 0), answers.get("A8", 0), answers.get("A9", 0),
            answers.get("A10", 0),
            age_months, sex_enc, eth_enc, jaundice_enc, fasd_enc, who_enc,
        ]])

        shap_values = _explainer.shap_values(x)  # shape (1, n_features, 2) for binary clf
        arr = np.array(shap_values)

        if arr.ndim == 3:
            # (samples, features, classes) -> take class 1 (ASD risk)
            class1 = arr[0, :, 1]
            base_value = float(np.array(_explainer.expected_value)[1])
        else:
            # Older SHAP API returns a list of two (n_samples, n_features) arrays
            class1 = arr[1][0]
            base_value = float(_explainer.expected_value[1])

        contributions_pct = class1 * 100.0

        items = []
        for i, fid in enumerate(FEATURE_ORDER):
            items.append(_humanize(fid, float(contributions_pct[i]), answers.get(fid)))

        # Sort by absolute contribution
        items_sorted = sorted(items, key=lambda d: abs(d["contribution_pct"]), reverse=True)

        top_positive = [d for d in items_sorted if d["direction"] == "risk"][:4]
        top_negative = [d for d in items_sorted if d["direction"] == "protective"][:4]

        summary_terms = [d["label"].lower() for d in top_positive[:3]]
        if summary_terms:
            if len(summary_terms) == 1:
                joined = summary_terms[0]
            elif len(summary_terms) == 2:
                joined = f"{summary_terms[0]} and {summary_terms[1]}"
            else:
                joined = f"{', '.join(summary_terms[:-1])}, and {summary_terms[-1]}"
            plain_explanation = (
                f"Based on your responses, these behaviours contributed most to the "
                f"prediction: {joined}."
            )
        else:
            plain_explanation = (
                "Based on your responses, no single behaviour stood out as a strong "
                "risk contributor - responses were broadly consistent with typical "
                "development."
            )

        return {
            "base_value_pct": round(base_value * 100, 1),
            "top_positive": top_positive,
            "top_negative": top_negative,
            "all_features": items_sorted,
            "plain_explanation": plain_explanation,
            "model_basis": "Random Forest (SHAP TreeExplainer, exact)",
        }

    except Exception as e:
        print(f"⚠   SHAP explanation error: {e}")
        return None


def compute_confidence(
    rf_probability: Optional[float],
    lr_probability: Optional[float],
    ensemble_probability: Optional[float],
) -> dict:
    """
    Confidence reflects how decisively the model committed to its answer:
      • Distance of the ensemble probability from the 0.5 decision boundary
        (further from 0.5 = more decisive).
      • Agreement between RF and LR predicted classes (agreement raises
        confidence, disagreement lowers it).
    Returns a 0-100 confidence score plus a human note for low-confidence cases.
    """
    if ensemble_probability is None:
        return {
            "confidence_pct": None,
            "confidence_level": "unavailable",
            "low_confidence_note": None,
        }

    distance_score = abs(ensemble_probability - 0.5) * 2.0  # 0..1
    confidence = distance_score * 100.0

    if rf_probability is not None and lr_probability is not None:
        rf_class = 1 if rf_probability >= 0.5 else 0
        lr_class = 1 if lr_probability >= 0.5 else 0
        if rf_class == lr_class:
            confidence = min(100.0, confidence + 8.0)
        else:
            confidence = max(0.0, confidence - 15.0)

    confidence = round(min(100.0, max(0.0, confidence)), 1)

    if confidence >= 80:
        level = "High"
    elif confidence >= 60:
        level = "Moderate"
    else:
        level = "Low"

    low_note = None
    if confidence < 60:
        low_note = "This prediction has lower confidence. A professional assessment is recommended."

    return {
        "confidence_pct": confidence,
        "confidence_level": level,
        "low_confidence_note": low_note,
    }
