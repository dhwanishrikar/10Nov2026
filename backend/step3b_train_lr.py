"""
STEP 3b - Train Logistic Regression (alongside existing Random Forest)
=======================================================================
Run this with:  python step3b_train_lr.py
Input:          balanced_qchat.csv  (from step2_smote.py)
Output:         asd_lr_model.pkl
"""

import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
from sklearn.preprocessing import StandardScaler
import joblib

# ── Load balanced data ────────────────────────────────────────────────────────
df = pd.read_csv("balanced_qchat.csv")

FEATURE_COLS = [
    "A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8", "A9", "A10",
    "Age_Mons", "Sex", "Ethnicity", "Jaundice",
    "Family_mem_with_ASD", "Who completed the test"
]
TARGET_COL = "Class/ASD Traits"

X = df[FEATURE_COLS]
y = df[TARGET_COL]

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# ── Scale features (LR benefits from scaling) ─────────────────────────────────
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled  = scaler.transform(X_test)

# ── Train Logistic Regression ─────────────────────────────────────────────────
print("Training Logistic Regression...")
lr = LogisticRegression(max_iter=1000, random_state=42, C=1.0)
lr.fit(X_train_scaled, y_train)
print("Training complete ✅")

# ── Evaluate ──────────────────────────────────────────────────────────────────
y_pred = lr.predict(X_test_scaled)
acc = accuracy_score(y_test, y_pred)
print(f"\nLogistic Regression Accuracy: {acc * 100:.2f}%")
print("\nClassification Report:")
print(classification_report(y_test, y_pred, target_names=["No ASD", "ASD"]))

# ── Save model + scaler ───────────────────────────────────────────────────────
# Wrap the scaler inside the pipeline so we don't need to pass it separately
from sklearn.pipeline import Pipeline
pipeline = Pipeline([("scaler", scaler), ("lr", lr)])
# Re-fit the pipeline
pipeline.fit(X_train, y_train)

joblib.dump(pipeline, "asd_lr_model.pkl")
print("\n✅  Saved: asd_lr_model.pkl (LR pipeline with scaler)")
print("\nDone! You now have both asd_model.pkl (RF) and asd_lr_model.pkl (LR).")