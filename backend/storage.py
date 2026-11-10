"""
storage.py - File-based screening history storage
===================================================
Stores screening results per child (keyed by name + age).
Compares current vs previous scores to detect trend (improving/declining/stable).
Uses simple JSON files - no database needed.
"""

import json
import os
from datetime import datetime
from typing import Optional


HISTORY_DIR = "screening_history"


def _ensure_dir():
    os.makedirs(HISTORY_DIR, exist_ok=True)


def _child_key(name: str, gender: str) -> str:
    """Generate a safe filename key from child name and gender."""
    safe = "".join(c if c.isalnum() else "_" for c in name.lower().strip())
    return f"{safe}_{gender.lower()}"


def save_result(
    child_name: str,
    gender: str,
    age_months: int,
    overall_score: float,
    risk_level: str,
    domain_scores: dict,
    item_scores: dict,
    answers: Optional[dict[str, int]] = None,
) -> str:
    """Save a screening result. Returns the record ID."""
    _ensure_dir()
    key = _child_key(child_name, gender)
    filepath = os.path.join(HISTORY_DIR, f"{key}.json")

    # Load existing history or start fresh
    if os.path.exists(filepath):
        with open(filepath, "r") as f:
            history = json.load(f)
    else:
        history = {"child": child_name, "gender": gender, "records": []}

    record_id = datetime.now().strftime("%Y%m%d_%H%M%S")
    record = {
        "id": record_id,
        "timestamp": datetime.now().isoformat(),
        "age_months": age_months,
        "overall_score": overall_score,
        "risk_level": risk_level,
        "domain_scores": {
            d: {
                "percentage": ds.percentage if hasattr(ds, "percentage") else ds.get("percentage", 0),
                "item_count": ds.item_count if hasattr(ds, "item_count") else ds.get("item_count", 0),
                "flag_items": ds.flag_items if hasattr(ds, "flag_items") else ds.get("flag_items", []),
            }
            for d, ds in domain_scores.items()
        },
        "item_scores": item_scores,
        # Preserve the actual responses for future child-specific history/reporting.
        # Older history files may not contain this field; callers should handle that.
        "answers": answers or {},
    }

    history["records"].append(record)

    with open(filepath, "w") as f:
        json.dump(history, f, indent=2)

    return record_id


def load_history(child_name: str, gender: str) -> Optional[dict]:
    """Load full history for a child. Returns None if no history found."""
    _ensure_dir()
    key = _child_key(child_name, gender)
    filepath = os.path.join(HISTORY_DIR, f"{key}.json")

    if not os.path.exists(filepath):
        return None

    with open(filepath, "r") as f:
        return json.load(f)


def get_previous_result(child_name: str, gender: str) -> Optional[dict]:
    """Get the most recent previous screening record."""
    history = load_history(child_name, gender)
    if not history or len(history["records"]) < 2:
        return None
    return history["records"][-2]   # second-to-last (last is the current one)


def compute_trend(
    current_score: float,
    child_name: str,
    gender: str,
) -> tuple[str, Optional[dict]]:
    """
    Compare current score to previous.
    Returns: (trend_string, previous_record | None)
    trend_string: "improving" | "declining" | "stable" | "none"
    """
    prev = get_previous_result(child_name, gender)
    if prev is None:
        return "none", None

    prev_score = prev["overall_score"]
    delta = current_score - prev_score

    if delta <= -5:
        trend = "improving"
    elif delta >= 5:
        trend = "declining"
    else:
        trend = "stable"

    return trend, prev


def build_comparison(current_score: float, previous: dict) -> dict:
    """Build a human-readable comparison dict for the report."""
    prev_score = previous["overall_score"]
    delta = current_score - prev_score

    prev_date = datetime.fromisoformat(previous["timestamp"]).strftime("%d %b %Y")

    return {
        "previous_score": prev_score,
        "previous_risk": previous["risk_level"],
        "previous_date": prev_date,
        "previous_age_months": previous["age_months"],
        "score_change": round(delta, 1),
        "direction": "increased" if delta > 0 else "decreased" if delta < 0 else "unchanged",
        "domain_changes": {
            domain: round(
                current_score   # placeholder - domain delta would need current domain scores
                - previous["domain_scores"].get(domain, {}).get("percentage", 0),
                1,
            )
            for domain in previous["domain_scores"]
        },
    }