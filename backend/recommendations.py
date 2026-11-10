"""
recommendations.py - Actionable recommendation engine
=======================================================
Generates structured, clinically-inspired recommendations based on:
  • Overall risk level
  • Domain-specific scores
  • Age of the child
  • Whether borderline case
  • Previous screening comparison
"""

from backend.questions import DOMAIN_SOCIAL, DOMAIN_COMMUNICATION, DOMAIN_BEHAVIORAL


# ── Base recommendations by risk level ────────────────────────────────────────
BASE_RECOMMENDATIONS: dict[str, list[str]] = {
    "Low": [
        "Continue routine developmental check-ups and share any new concerns with your child's pediatrician.",
        "Use everyday play, books, songs, and face-to-face interaction to encourage communication and shared attention.",
        "Notice and celebrate the ways your child communicates, plays, imitates, and connects with other people.",
        "Keep a simple note of any developmental changes that concern you so you can discuss them at the next visit.",
    ],
    "Moderate": [
        "Discuss the screening result and the flagged developmental areas with your child's pediatrician or a qualified developmental professional.",
        "Consider a developmental assessment, especially if the flagged behaviours are also seen consistently in everyday life.",
        "Use face-to-face play, shared reading, pointing games, imitation, and turn-taking activities to support social communication.",
        "Keep a short record of communication, play, social interaction, and sensory behaviours to bring to an appointment.",
    ],
    "High": [
        "Arrange a developmental evaluation with your child's pediatrician or a qualified developmental professional.",
        "Share the specific observations in this report and examples from home, childcare, or preschool with the professional.",
        "If communication is a concern, ask whether a speech and language assessment would be helpful.",
        "If sensory or everyday behaviour concerns are prominent, ask whether an occupational therapy assessment would be appropriate.",
        "Continue supportive, play-based interaction while waiting for professional guidance.",
    ],
    "Very High": [
        "Arrange a prompt developmental evaluation with a qualified pediatric or developmental professional.",
        "Bring this report and concrete examples of the child's communication, social interaction, play, and behaviour to the appointment.",
        "Ask the professional whether speech-language, occupational, developmental, or other early-support services would be appropriate.",
        "Continue supportive, play-based interaction and respond to your child's communication attempts while awaiting further assessment.",
    ],
}

# ── Domain-specific supplementary recommendations ────────────────────────────
DOMAIN_RECOMMENDATIONS: dict[str, list[str]] = {
    DOMAIN_SOCIAL: [
        "Follow your child's interests during play and take turns copying each other's actions.",
        "Use simple pointing, showing, waving, and turn-taking games to practise shared attention.",
        "Give your child time to look, respond, or initiate rather than asking many questions in a row.",
    ],
    DOMAIN_COMMUNICATION: [
        "Use short, clear phrases and pause so your child has time to respond or communicate in their own way.",
        "Narrate everyday routines and name objects or actions your child is interested in.",
        "If speech or gestures are limited, discuss communication support with a pediatrician or speech-language professional.",
    ],
    DOMAIN_BEHAVIORAL: [
        "Notice what happens before and after repetitive or distressing behaviours and record useful patterns.",
        "Prepare your child for changes in routines using simple warnings, visual cues, or predictable steps.",
        "If sensory sensitivities interfere with daily activities, discuss them with the child's healthcare professional.",
    ],
}

# ── Age-specific notes ────────────────────────────────────────────────────────
def get_age_note(age_months: int) -> str:
    if age_months < 18:
        return "At this age, several social and communication skills are still emerging. Development should be considered over time and in the context of the child's full history."
    if age_months < 24:
        return "Between 18 and 24 months, social communication and language skills are developing quickly. If concerns persist, discuss them with the child's healthcare professional."
    if age_months < 36:
        return "At 2–3 years, communication, play, and social interaction can change rapidly. Persistent concerns are worth discussing with a developmental professional."
    return "By 3 years and beyond, persistent communication, social, play, or behaviour concerns are worth discussing with a qualified developmental professional."

def generate_recommendations(
    risk_level: str,
    domain_scores: dict,          # domain name → DomainScore
    age_months: int,
    is_borderline: bool = False,
    trend: str = "none",          # "improving", "declining", "stable", "none"
) -> dict:
    """
    Returns a structured recommendations dictionary.
    """
    output = {
        "primary": BASE_RECOMMENDATIONS.get(risk_level, []),
        "domain_specific": [],
        "age_note": get_age_note(age_months),
        "borderline_note": "",
        "trend_note": "",
        "monitoring_interval": "",
    }

    # Domain-specific supplements (only for domains scoring > 50%)
    HIGH_DOMAIN_THRESHOLD = 50.0
    for domain, ds in domain_scores.items():
        if hasattr(ds, "percentage"):
            pct = ds.percentage
        else:
            pct = ds.get("percentage", 0)

        if pct >= HIGH_DOMAIN_THRESHOLD:
            recs = DOMAIN_RECOMMENDATIONS.get(domain, [])
            for r in recs:
                output["domain_specific"].append(f"[{domain}] {r}")

    # Borderline note
    if is_borderline:
        output["borderline_note"] = (
            "This result is near a classification boundary. "
            "A single follow-up screening in 4–6 weeks is strongly recommended before drawing conclusions."
        )

    # Trend note (for re-screenings)
    trend_notes = {
        "improving": "✅ Scores show improvement since last screening. Continue current interventions and re-screen in 8 weeks.",
        "declining":  "⚠ Scores have declined since last screening. Escalate to a professional evaluation urgently.",
        "stable":     "Scores remain stable. Continue monitoring and re-screen in 4–6 weeks.",
        "none":       "",
    }
    output["trend_note"] = trend_notes.get(trend, "")

    # Monitoring interval recommendation
    intervals = {
        "Low":       "Re-screen in 3–6 months or sooner if new concerns arise.",
        "Moderate":  "Re-screen in 4–6 weeks alongside a developmental evaluation.",
        "High":      "Re-screen after your first specialist appointment (typically 2–4 weeks).",
        "Very High": "Formal diagnostic assessment takes priority over re-screening.",
    }
    output["monitoring_interval"] = intervals.get(risk_level, "")

    return output
    