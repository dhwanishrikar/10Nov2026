"""
report.py - Caretaker-focused screening report generator
==========================================================
Builds a child-specific HTML report from the actual screening data.

The report is intentionally written as a screening/decision-support document,
not as an ML/model report.  The ``audience`` argument provides an extension
point for future reader-specific templates (e.g. clinician), while the
caretaker/parent template is the default.
"""

from datetime import datetime
from html import escape
from typing import Optional

from backend.questions import ALL_QUESTIONS, DOMAIN_SOCIAL, DOMAIN_COMMUNICATION, DOMAIN_BEHAVIORAL
from backend.scorer import ScoringResult


DOMAIN_SHORT = {
    DOMAIN_SOCIAL: "Social interaction",
    DOMAIN_COMMUNICATION: "Communication",
    DOMAIN_BEHAVIORAL: "Behaviour and sensory patterns",
}


TDSC_MILESTONES = [
    ("Social smile", 0.1, 2.7),
    ("Eyes follow pen/pencil", 1.1, 3.9),
    ("Holds head steady", 1.1, 3.8),
    ("Rolls from back to stomach", 2.7, 10.0),
    ("Turns head to sound of bell/rattle", 3.0, 5.8),
    ("Transfers objects hand to hand", 4.1, 7.0),
    ("Raises self to sitting position", 5.8, 11.0),
    ("Standing up by furniture", 6.3, 11.0),
    ("Fine prehension pellet", 6.7, 10.9),
    ("Pat-a-cake", 6.7, 12.7),
    ("Walks with help", 7.7, 13.0),
    ("Throws ball", 9.5, 16.7),
    ("Walks alone", 9.9, 17.7),
    ("Says two words", 11.2, 19.1),
    ("Walks backwards", 12.2, 19.5),
    ("Walks upstairs with help", 12.2, 24.4),
    ("Points to parts of a doll (3 parts)", 15.3, 24.3),
]

def _tdsc_chart(age_months: int) -> str:
    max_age = 24
    age = max(0, min(max_age, age_months))
    age_pct = age / max_age * 100
    rows = []
    for label, start, end in TDSC_MILESTONES:
        left = start / max_age * 100
        width = max(1.5, (end - start) / max_age * 100)
        rows.append(f'<div class="tdsc-row"><div class="tdsc-label">{_e(label)}</div><div class="tdsc-track"><div class="tdsc-range" style="left:{left:.2f}%;width:{width:.2f}%"></div></div></div>')
    note = (f"The published early TDSC chart shown here covers the 0–24 month range. This child's age is {age_months} months, so the age line is capped at 24 months and this visual is reference-only." if age_months > max_age else "The vertical line shows chronological age. The blue ranges show the published 3rd–97th percentile attainment windows. The current ASD questionnaire does not assess every TDSC item, so this visual does not infer milestone achievement.")
    return f'<div class="tdsc-chart"><div class="tdsc-axis"><span>0 mo</span><span>6 mo</span><span>12 mo</span><span>18 mo</span><span>24 mo</span></div><div class="tdsc-plot"><div class="tdsc-age-line" style="left:{age_pct:.2f}%"><span>{_e(age_months)} mo</span></div>{"".join(rows)}</div><div class="tdsc-legend"><span><i class="tdsc-swatch"></i>Published TDSC milestone range</span><span><i class="tdsc-age-swatch"></i>Child\'s chronological age</span></div><p class="muted tdsc-note">{_e(note)}</p></div>'


OBSERVATION_LABELS = {
    "A1": "Responding when their name is called",
    "A2": "Eye contact",
    "A3": "Pointing to request something",
    "A4": "Pointing to share interest",
    "A5": "Pretend play",
    "A6": "Following another person's gaze",
    "A7": "Showing comfort toward someone who is upset",
    "A8": "Early speech development",
    "A9": "Use of simple gestures",
    "A10": "Episodes of unexplained staring",
    "A11": "Smiling back at another person",
    "A12": "Bringing objects to share interest",
    "A13": "Following a person's point",
    "A14": "Interest in parts of objects",
    "A15": "Interest in playing around other children",
    "A16": "Distress from everyday sounds",
    "A17": "Combining two or more words",
    "A18": "Looking to a caregiver for social cues",
    "A19": "Strong attachment to unusual objects",
    "A20": "Imitating another person's actions",
}


def _e(value) -> str:
    return escape(str(value), quote=True)


def _gender_label(gender: str) -> str:
    return {"m": "Male", "f": "Female"}.get((gender or "").lower(), gender or "Not specified")


def _age_label(age_months: int) -> str:
    years, months = divmod(age_months, 12)
    if years:
        year_part = f"{years} year" + ("s" if years != 1 else "")
        if months:
            month_part = f"{months} month" + ("s" if months != 1 else "")
            return f"{age_months} months ({year_part} {month_part})"
        return f"{age_months} months ({year_part})"
    return f"{age_months} months"

def _result_message(risk_level: str) -> tuple[str, str]:
    messages = {
        "Low": (
            "The screening responses did not identify a high level of ASD-related indicators.",
            "This is a screening result, not a diagnosis. Continue routine developmental monitoring and discuss any concerns with the child's healthcare professional."
        ),
        "Moderate": (
            "The screening responses indicate some areas that may need further attention.",
            "Consider discussing the observed developmental areas with the child's pediatrician or another qualified developmental professional."
        ),
        "High": (
            "The screening responses indicate several areas that would benefit from further attention.",
            "A professional developmental evaluation is recommended so that the child's strengths and support needs can be understood more fully."
        ),
        "Very High": (
            "The screening responses indicate multiple areas of concern that should be discussed with a qualified professional.",
            "Please arrange a developmental evaluation. The screening result does not establish a diagnosis."
        ),
    }
    return messages.get(
        risk_level,
        ("The screening responses identified areas for further discussion.", "Please discuss the result with a qualified healthcare professional.")
    )


def _answer_sentence(q, answer_index: int, flagged: bool) -> str:
    answer = q.options[answer_index] if 0 <= answer_index < len(q.options) else "Response recorded"
    label = OBSERVATION_LABELS.get(q.id, q.text)
    if flagged:
        return f"<strong>{_e(label)}:</strong> the response was <em>{_e(answer)}</em>. This response was flagged by the screening rules for this area."
    return f"<strong>{_e(label)}:</strong> the response was <em>{_e(answer)}</em>."


def _domain_interpretation(pct: float) -> str:
    if pct < 30:
        return "Fewer responses in this area were flagged by the screening rules."
    if pct < 55:
        return "Some responses in this area were flagged and may be worth monitoring."
    if pct < 75:
        return "Several responses in this area were flagged and merit further discussion."
    return "Many responses in this area were flagged and merit prompt professional discussion."


def _build_observations(answers: dict[str, int], result: ScoringResult) -> tuple[list[str], list[str]]:
    flagged = []
    notable = []
    for qid, answer_index in answers.items():
        q = ALL_QUESTIONS.get(qid)
        if not q:
            continue
        score = result.item_scores.get(qid, 0)
        sentence = _answer_sentence(q, answer_index, score == 1)
        if score == 1:
            flagged.append(sentence)
        elif len(notable) < 4:
            notable.append(sentence)
    return flagged[:8], notable[:4]


def _build_profile(result: ScoringResult) -> str:
    rows = []
    for domain in (DOMAIN_SOCIAL, DOMAIN_COMMUNICATION, DOMAIN_BEHAVIORAL):
        ds = result.domain_scores.get(domain)
        if not ds:
            continue
        pct = max(0, min(100, float(ds.percentage)))
        rows.append(f"""
        <div class="domain-card">
          <div class="domain-head">
            <span>{_e(DOMAIN_SHORT[domain])}</span>
            <strong>{pct:.1f}%</strong>
          </div>
          <div class="track"><div class="fill" style="width:{pct:.1f}%"></div></div>
          <p>{_e(_domain_interpretation(pct))}</p>
        </div>""")
    return "".join(rows)


def _build_answer_table(answers: dict[str, int], result: ScoringResult) -> str:
    rows = []
    for qid, answer_index in answers.items():
        q = ALL_QUESTIONS.get(qid)
        if not q:
            continue
        answer = q.options[answer_index] if 0 <= answer_index < len(q.options) else "Response recorded"
        flag = result.item_scores.get(qid, 0) == 1
        rows.append(
            f"<tr><td>{_e(qid)}</td><td>{_e(DOMAIN_SHORT.get(q.domain, q.domain))}</td>"
            f"<td>{_e(OBSERVATION_LABELS.get(qid, q.text))}</td><td>{_e(answer)}</td>"
            f"<td class=\"{'flag' if flag else 'ok'}\">{'Flagged' if flag else 'Not flagged'}</td></tr>"
        )
    return "".join(rows) or '<tr><td colspan="5">No questionnaire responses were available.</td></tr>'


def _build_recommendations(recommendations: dict, result: ScoringResult) -> str:
    primary = recommendations.get("primary", [])
    domain_specific = recommendations.get("domain_specific", [])
    items = []
    for rec in primary[:6]:
        items.append(f"<li>{_e(rec)}</li>")
    for rec in domain_specific[:6]:
        clean = rec.split("] ", 1)[1] if rec.startswith("[") and "] " in rec else rec
        items.append(f"<li>{_e(clean)}</li>")
    return "".join(items) or "<li>Continue routine developmental monitoring and discuss any concerns with the child's healthcare professional.</li>"


def generate_report(
    child_name: str,
    age_months: int,
    gender: str,
    ethnicity: str,
    jaundice: bool,
    family_asd: bool,
    completed_by: str,
    result: ScoringResult,
    recommendations: dict,
    comparison: Optional[dict] = None,
    answers: Optional[dict[str, int]] = None,
    audience: str = "caretaker",
) -> str:
    """
    Generate a reader-specific report.

    ``audience="caretaker"`` is the current production template.  Keeping the
    audience parameter here makes the report architecture extensible without
    changing the screening/scoring pipeline.
    """
    answers = answers or {}
    generated = datetime.now().strftime("%d %B %Y")
    age = _age_label(age_months)
    gender_label = _gender_label(gender)
    result_title, result_note = _result_message(result.risk_level)
    flagged, notable = _build_observations(answers, result)

    comparison_html = ""
    if comparison:
        direction = comparison.get("direction", "unchanged")
        comparison_html = f"""
        <section>
          <h2>Previous screening</h2>
          <div class="comparison">
            <div><span>Previous score</span><strong>{comparison.get('previous_score', 0):.1f}</strong></div>
            <div><span>Current score</span><strong>{result.overall_score:.1f}</strong></div>
            <div><span>Change</span><strong>{_e(direction)}</strong></div>
          </div>
          <p class="muted">This comparison is based on the screening history already stored for this child. Changes in screening scores do not by themselves indicate a change in diagnosis.</p>
        </section>"""

    flagged_html = "".join(f"<li>{item}</li>" for item in flagged)
    notable_html = "".join(f"<li>{item}</li>" for item in notable)
    if not flagged_html:
        flagged_html = "<li>No individual responses were flagged by the screening rules.</li>"
    if not notable_html:
        notable_html = "<li>No additional unflagged observations were included.</li>"

    tdsc_chart_html = _tdsc_chart(age_months)

    domain_profile = _build_profile(result)
    recommendations_html = _build_recommendations(recommendations, result)

    risk_class = result.risk_level.lower().replace(" ", "-")
    family_note = "Reported" if family_asd else "Not reported"
    jaundice_note = "Reported" if jaundice else "Not reported"

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Child Screening Report - {_e(child_name)}</title>
<style>
*{{box-sizing:border-box}}
body{{font-family:Arial,Helvetica,sans-serif;color:#1f2937;background:#fff;margin:0;padding:32px;line-height:1.55;font-size:12px}}
.container{{max-width:820px;margin:auto}}
.header{{border-bottom:3px solid #2563eb;padding-bottom:18px;margin-bottom:24px}}
.kicker{{font-size:10px;text-transform:uppercase;letter-spacing:.12em;color:#64748b;font-weight:700}}
h1{{font-size:25px;margin:5px 0;color:#172554}}
h2{{font-size:16px;color:#1e3a8a;border-bottom:1px solid #dbeafe;padding-bottom:6px;margin:25px 0 12px}}
h3{{font-size:13px;margin:16px 0 8px;color:#334155}}
.info-grid{{display:grid;grid-template-columns:1fr 1fr;gap:8px}}
.info{{border:1px solid #e5e7eb;border-radius:8px;padding:9px 11px;background:#f8fafc}}
.label{{font-size:9px;text-transform:uppercase;color:#64748b;letter-spacing:.05em}}
.value{{font-size:12px;font-weight:600;margin-top:2px}}
.summary{{border:1px solid #bfdbfe;background:#eff6ff;border-radius:12px;padding:16px}}
.summary strong{{font-size:15px;color:#1e3a8a}}
.notice{{margin-top:10px;padding:9px 11px;border-radius:8px;background:#fff7ed;border:1px solid #fed7aa;color:#9a3412}}
.profile{{display:grid;grid-template-columns:1fr;gap:10px}}
.domain-card{{border:1px solid #e5e7eb;border-radius:10px;padding:11px;background:#fff}}
.domain-head{{display:flex;justify-content:space-between;font-size:12px;margin-bottom:7px}}
.track{{height:9px;background:#e5e7eb;border-radius:20px;overflow:hidden}}
.fill{{height:100%;background:#3b82f6;border-radius:20px}}
.domain-card p{{font-size:10.5px;color:#64748b;margin:6px 0 0}}
ul{{padding-left:19px}}
li{{margin:7px 0}}
.observation-list li{{margin:8px 0}}
.flag{{color:#b91c1c;font-weight:700}}
.ok{{color:#166534}}
table{{width:100%;border-collapse:collapse;font-size:10px}}
th,td{{border:1px solid #e5e7eb;padding:6px 7px;text-align:left;vertical-align:top}}
th{{background:#f1f5f9;color:#475569}}
.comparison{{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}}
.comparison div{{padding:10px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px}}
.comparison span{{display:block;font-size:9px;color:#64748b;text-transform:uppercase}}
.comparison strong{{font-size:15px}}
.muted{{color:#64748b;font-size:10.5px}}
.disclaimer{{margin-top:28px;padding:13px;border:1px solid #cbd5e1;background:#f8fafc;border-radius:9px;color:#475569;font-size:10px}}
.footer{{margin-top:20px;text-align:center;color:#94a3b8;font-size:9px}}
@media print{{body{{padding:18px}}section{{break-inside:avoid}}}}
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <div class="kicker">ASD early screening • caretaker report</div>
    <h1>Developmental &amp; Behavioural Screening Report</h1>
    <div class="muted">Prepared for { _e(child_name) } · Screening date: {generated}</div>
  </div>

  <section>
    <h2>1. Child summary</h2>
    <div class="info-grid">
      <div class="info"><div class="label">Child</div><div class="value">{_e(child_name)}</div></div>
      <div class="info"><div class="label">Age</div><div class="value">{_e(age)}</div></div>
      <div class="info"><div class="label">Sex</div><div class="value">{_e(gender_label)}</div></div>
      <div class="info"><div class="label">Screening completed by</div><div class="value">{_e(completed_by or "Not specified")}</div></div>
      {f'<div class="info"><div class="label">Ethnicity</div><div class="value">{_e(ethnicity)}</div></div>' if ethnicity else ''}
      <div class="info"><div class="label">Family history of ASD</div><div class="value">{family_note}</div></div>
      <div class="info"><div class="label">History of neonatal jaundice</div><div class="value">{jaundice_note}</div></div>
    </div>
  </section>

  <section>
    <h2>2. Screening summary</h2>
    <div class="summary">
      <strong>{_e(result_title)}</strong>
      <p>{_e(result_note)}</p>
      <div class="notice"><strong>Important:</strong> This is a screening result, not a diagnosis of autism spectrum disorder. A screening result should be considered together with the child's development, history, and a professional evaluation when needed.</div>
    </div>
  </section>

  <section>
    <h2>3. Developmental and behavioural profile</h2>
    <p class="muted">The percentages below show the proportion of scored items in each area that were flagged by this screening system. They are not measures of autism severity or a diagnosis.</p>
    <div class="profile">{domain_profile}</div>
  </section>

  <section>
    <h2>4. Developmental screening visual — TDSC reference</h2>
    <p class="muted">The Trivandrum Developmental Screening Chart (TDSC) is a developmental-delay screening tool. This visual uses the published early TDSC milestone ranges and places the child's chronological age on the same age scale. It is a reference chart, not a diagnosis and not a developmental-age calculation.</p>
    {tdsc_chart_html}
  </section>

  <section>
    <h2>5. Specific observations from this screening</h2>
    <h3>Responses that were flagged</h3>
    <ul class="observation-list">{flagged_html}</ul>
    <h3>Other recorded responses</h3>
    <ul class="observation-list">{notable_html}</ul>
  </section>

  <section>
    <h2>5. What the result means</h2>
    <p>{_e(result_title)} { _e(result_note) }</p>
    <p class="muted">The result reflects the answers provided during this screening session. It should not be used on its own to confirm or rule out autism or another developmental condition.</p>
  </section>

  <section>
    <h2>7. What the caretaker can do</h2>
    <ul>{recommendations_html}</ul>
  </section>

  <section>
    <h2>8. When to discuss the result with a professional</h2>
    <p>If the screening identifies areas of concern, or if you have concerns about your child's communication, social interaction, play, behaviour, or development, discuss them with a pediatrician, developmental pediatrician, child psychologist, speech-language professional, or another qualified developmental professional. Bring this report and examples from everyday life to the appointment.</p>
    <p class="muted">If a child has lost skills they previously had, or you are concerned about a sudden or significant change in development, contact the child's healthcare professional promptly rather than waiting for a repeat screening.</p>
  </section>

  {comparison_html}

  <section>
    <h2>9. Recorded screening responses</h2>
    <p class="muted">This table preserves the responses actually provided in this screening session. Follow-up questions are included when they were answered.</p>
    <table>
      <thead><tr><th>Item</th><th>Area</th><th>Observation</th><th>Response</th><th>Screening flag</th></tr></thead>
      <tbody>{_build_answer_table(answers, result)}</tbody>
    </table>
  </section>

  <div class="disclaimer">
    <strong>Screening disclaimer:</strong> This document supports early screening and discussion with a healthcare/developmental professional. It is not a clinical diagnosis and does not determine whether a child has autism spectrum disorder. The report should be interpreted in the context of the child's full developmental history and, when indicated, a comprehensive professional assessment.
  </div>
  <div class="footer">TinyTots ASD Early Screening System · {_e(audience.capitalize())} report · Generated {generated}</div>
</div>
</body>
</html>"""
