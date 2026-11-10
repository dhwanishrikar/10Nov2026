"""
predictor.py - ML model loader and hybrid predictor
=====================================================
Loads Random Forest + Logistic Regression from disk.
Returns individual and ensemble predictions with probabilities.
Falls back gracefully if models are not available.
"""

import os
import numpy as np
import joblib
from typing import Optional

from backend import explainer as shap_explainer

BASE_DIR = os.path.dirname(__file__)

MODEL_PATH    = os.path.join(BASE_DIR, "asd_model.pkl")
LR_MODEL_PATH = os.path.join(BASE_DIR, "asd_lr_model.pkl")
ENCODERS_PATH = os.path.join(BASE_DIR, "encoders.pkl")

FEATURE_ORDER = [
    "A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8", "A9", "A10",
    "Age_Mons", "Sex", "Ethnicity", "Jaundice",
    "Family_mem_with_ASD", "Who completed the test"
]

_rf_model   = None
_lr_model   = None
_encoders   = None
_models_loaded = False


def load_models():
    global _rf_model, _lr_model, _encoders, _models_loaded
    try:
        if os.path.exists(MODEL_PATH):
            _rf_model = joblib.load(MODEL_PATH)
            print(f"✅  Random Forest loaded from {MODEL_PATH}")
        else:
            print(f"⚠   RF model not found at {MODEL_PATH}")

        if os.path.exists(LR_MODEL_PATH):
            _lr_model = joblib.load(LR_MODEL_PATH)
            print(f"✅  Logistic Regression loaded from {LR_MODEL_PATH}")
        else:
            print(f"ℹ   LR model not found - will use RF only")

        if os.path.exists(ENCODERS_PATH):
            _encoders = joblib.load(ENCODERS_PATH)
            print(f"✅  Encoders loaded from {ENCODERS_PATH}")

        _models_loaded = _rf_model is not None

        if _rf_model is not None:
            shap_explainer.init_explainer(_rf_model)
    except Exception as e:
        print(f"⚠   Model loading error: {e}")
        _models_loaded = False


def _encode_input(
    answers: dict[str, int],
    age_months: int,
    sex: str,
    ethnicity: str,
    jaundice: bool,
    family_asd: bool,
    completed_by: str,
):
    """Build the feature vector in the exact order used during training.
    Returns (feature_array, encoded_scalars_dict) or (None, None)."""
    if not _encoders:
        return None, None

    try:
        # Binary
        sex_enc  = 1 if sex.lower() == "m" else 0
        jaun_enc = 1 if jaundice else 0
        fasd_enc = 1 if family_asd else 0

        # Label-encoded
        eth_le   = _encoders.get("Ethnicity")
        who_le   = _encoders.get("Who completed the test")

        eth_norm = ethnicity.lower().strip()
        who_norm = completed_by.lower().strip()

        # Handle unseen labels gracefully
        if eth_le and eth_norm in eth_le.classes_:
            eth_enc = eth_le.transform([eth_norm])[0]
        else:
            eth_enc = 0   # default to first class

        if who_le and who_norm in who_le.classes_:
            who_enc = who_le.transform([who_norm])[0]
        else:
            who_enc = 0

        # Build feature vector
        features = [
            answers.get("A1", 0),
            answers.get("A2", 0),
            answers.get("A3", 0),
            answers.get("A4", 0),
            answers.get("A5", 0),
            answers.get("A6", 0),
            answers.get("A7", 0),
            answers.get("A8", 0),
            answers.get("A9", 0),
            answers.get("A10", 0),
            age_months,
            sex_enc,
            eth_enc,
            jaun_enc,
            fasd_enc,
            who_enc,
        ]
        encoded = {
            "sex_enc": sex_enc,
            "eth_enc": int(eth_enc),
            "jaundice_enc": jaun_enc,
            "fasd_enc": fasd_enc,
            "who_enc": int(who_enc),
        }
        return np.array(features).reshape(1, -1), encoded

    except Exception as e:
        print(f"⚠   Feature encoding error: {e}")
        return None, None


def predict(
    answers: dict[str, int],
    age_months: int,
    sex: str,
    ethnicity: str,
    jaundice: bool,
    family_asd: bool,
    completed_by: str,
) -> dict:
    """
    Returns:
    {
        rf_probability: float | None,
        rf_prediction: int | None,
        lr_probability: float | None,
        lr_prediction: int | None,
        ensemble_probability: float | None,
        models_available: bool,
    }
    """
    result = {
        "rf_probability": None,
        "rf_prediction": None,
        "lr_probability": None,
        "lr_prediction": None,
        "ensemble_probability": None,
        "models_available": _models_loaded,
        "explainability": None,
        "confidence": None,
    }

    if not _models_loaded:
        return result

    X, encoded = _encode_input(answers, age_months, sex, ethnicity, jaundice, family_asd, completed_by)
    if X is None:
        return result

    try:
        # Random Forest
        if _rf_model:
            rf_proba = _rf_model.predict_proba(X)[0]
            result["rf_probability"] = float(rf_proba[1])  # P(ASD)
            result["rf_prediction"]  = int(_rf_model.predict(X)[0])

        # Logistic Regression
        if _lr_model:
            lr_proba = _lr_model.predict_proba(X)[0]
            result["lr_probability"] = float(lr_proba[1])
            result["lr_prediction"]  = int(_lr_model.predict(X)[0])

        # Ensemble
        if result["rf_probability"] is not None and result["lr_probability"] is not None:
            result["ensemble_probability"] = (
                0.60 * result["rf_probability"] + 0.40 * result["lr_probability"]
            )
        elif result["rf_probability"] is not None:
            result["ensemble_probability"] = result["rf_probability"]

        # SHAP explainability (Random Forest based)
        if shap_explainer.is_ready() and encoded is not None:
            result["explainability"] = shap_explainer.explain(
                answers=answers,
                age_months=age_months,
                sex_enc=encoded["sex_enc"],
                eth_enc=encoded["eth_enc"],
                jaundice_enc=encoded["jaundice_enc"],
                fasd_enc=encoded["fasd_enc"],
                who_enc=encoded["who_enc"],
            )

        # Confidence score
        result["confidence"] = shap_explainer.compute_confidence(
            rf_probability=result["rf_probability"],
            lr_probability=result["lr_probability"],
            ensemble_probability=result["ensemble_probability"],
        )

    except Exception as e:
        print(f"⚠   Prediction error: {e}")

    return result