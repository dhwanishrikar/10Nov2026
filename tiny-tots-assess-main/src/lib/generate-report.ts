import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import type { ChildInfo, ScreeningResult } from "./screening-data";
import type { BackendResult } from "@/pages/Index";
import { getAllQuestionsFlat, type AdaptiveQuestion } from "./adaptive-questions";

export type ReportAudience = "caretaker" | "clinician";

const DOMAIN_ORDER = ["Social Interaction", "Communication", "Behavioral Patterns"];

const OBSERVATION_LABELS: Record<string, string> = {
  A1: "Responding when their name is called",
  A2: "Eye contact",
  A3: "Pointing to request something",
  A4: "Pointing to share interest",
  A5: "Pretend play",
  A6: "Following another person's gaze",
  A7: "Showing comfort toward someone who is upset",
  A8: "Early speech development",
  A9: "Use of simple gestures",
  A10: "Episodes of unexplained staring",
  A11: "Smiling back at another person",
  A12: "Bringing objects to share interest",
  A13: "Following a person's point",
  A14: "Interest in parts of objects",
  A15: "Interest in playing around other children",
  A16: "Distress from everyday sounds",
  A17: "Combining two or more words",
  A18: "Looking to a caregiver for social cues",
  A19: "Strong attachment to unusual objects",
  A20: "Imitating another person's actions",
};


const TDSC_MILESTONES = [
  ["Social smile", 0.1, 2.7],
  ["Eyes follow pen/pencil", 1.1, 3.9],
  ["Holds head steady", 1.1, 3.8],
  ["Rolls from back to stomach", 2.7, 10.0],
  ["Turns head to sound of bell/rattle", 3.0, 5.8],
  ["Transfers objects hand to hand", 4.1, 7.0],
  ["Raises self to sitting position", 5.8, 11.0],
  ["Standing up by furniture", 6.3, 11.0],
  ["Fine prehension pellet", 6.7, 10.9],
  ["Pat-a-cake", 6.7, 12.7],
  ["Walks with help", 7.7, 13.0],
  ["Throws ball", 9.5, 16.7],
  ["Walks alone", 9.9, 17.7],
  ["Says two words", 11.2, 19.1],
  ["Walks backwards", 12.2, 19.5],
  ["Walks upstairs with help", 12.2, 24.4],
  ["Points to parts of a doll (3 parts)", 15.3, 24.3],
] as const;

function buildTdscChartHtml(ageMonths: number) {
  const maxAge = 24;
  const clampedAge = Math.max(0, Math.min(maxAge, ageMonths));
  const agePct = (clampedAge / maxAge) * 100;
  const rows = TDSC_MILESTONES.map(([label, start, end]) => {
    const left = (start / maxAge) * 100;
    const width = Math.max(1.5, ((end - start) / maxAge) * 100);
    return `<div class="tdsc-row"><div class="tdsc-label">${esc(label)}</div><div class="tdsc-track"><div class="tdsc-range" style="left:${left.toFixed(2)}%;width:${width.toFixed(2)}%"></div></div></div>`;
  }).join("");
  const note = ageMonths > maxAge
    ? `The published early TDSC chart shown here covers the 0–24 month range. This child's age is ${ageMonths} months, so the age line is capped at 24 months and this visual is reference-only.`
    : "The vertical line shows chronological age. The blue ranges show the published 3rd–97th percentile attainment windows. The current ASD questionnaire does not assess every TDSC item, so this visual does not infer milestone achievement.";
  return `<div class="tdsc-chart"><div class="tdsc-axis"><span>0 mo</span><span>6 mo</span><span>12 mo</span><span>18 mo</span><span>24 mo</span></div><div class="tdsc-plot"><div class="tdsc-age-line" style="left:${agePct.toFixed(2)}%"><span>${esc(ageMonths)} mo</span></div>${rows}</div><div class="tdsc-legend"><span><i class="tdsc-swatch"></i>Published TDSC milestone range</span><span><i class="tdsc-age-swatch"></i>Child's chronological age</span></div><p class="muted tdsc-note">${esc(note)}</p></div>`;
}

const esc = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

function ageLabel(months: number) {
  const years = Math.floor(months / 12);
  const remaining = months % 12;
  if (!years) return `${months} months`;
  return `${months} months (${years} year${years === 1 ? "" : "s"}${remaining ? ` ${remaining} month${remaining === 1 ? "" : "s"}` : ""})`;
}

function dateLabel(iso?: string) {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) return new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
}

function genderLabel(gender: string) {
  return gender === "m" ? "Male" : gender === "f" ? "Female" : gender || "Not specified";
}

function getRiskLevel(backendResult: BackendResult | null, fallbackResult: ScreeningResult | null) {
  if (backendResult) return backendResult.risk_level;
  const map: Record<string, string> = { none: "Low", level1: "Moderate", level2: "High", level3: "Very High" };
  return fallbackResult ? map[fallbackResult.riskLevel] ?? "Low" : "Low";
}

function resultMessage(riskLevel: string) {
  const messages: Record<string, { title: string; body: string }> = {
    Low: {
      title: "The screening responses did not identify a high level of ASD-related indicators.",
      body: "Continue routine developmental monitoring and discuss any concerns with the child's healthcare professional.",
    },
    Moderate: {
      title: "The screening responses indicate some areas that may need further attention.",
      body: "Consider discussing the observed developmental areas with the child's pediatrician or another qualified developmental professional.",
    },
    High: {
      title: "The screening responses indicate several areas that would benefit from further attention.",
      body: "A professional developmental evaluation is recommended so that the child's strengths and support needs can be understood more fully.",
    },
    "Very High": {
      title: "The screening responses indicate multiple areas of concern that should be discussed with a qualified professional.",
      body: "Please arrange a developmental evaluation. The screening result does not establish a diagnosis.",
    },
  };
  return messages[riskLevel] ?? {
    title: "The screening responses identified areas for further discussion.",
    body: "Please discuss the result with a qualified healthcare professional.",
  };
}

function questionFlag(q: AdaptiveQuestion, answerIndex: number) {
  return q.reverseScored
    ? answerIndex <= 2
    : answerIndex >= 2;
}

function getDomainScores(
  backendResult: BackendResult | null,
  fallbackResult: ScreeningResult | null,
) {
  if (backendResult?.domain_scores?.length) {
    return backendResult.domain_scores.map(d => ({
      domain: d.domain,
      percentage: d.percentage,
      interpretation: d.interpretation,
      flags: d.flag_items ?? [],
    }));
  }

  const fallbackMap = [
    ["Social Interaction", fallbackResult?.scores.social.score ?? 0],
    ["Communication", fallbackResult?.scores.communication.score ?? 0],
    ["Behavioral Patterns", fallbackResult?.scores.behavior.score ?? 0],
  ] as const;

  return fallbackMap.map(([domain, percentage]) => ({
    domain,
    percentage,
    interpretation: percentage < 30
      ? "Fewer responses in this area were flagged."
      : percentage < 55
        ? "Some responses in this area were flagged and may be worth monitoring."
        : "Several responses in this area were flagged and merit further discussion.",
    flags: [],
  }));
}

function observationData(answers: Record<string, number>, backendResult: BackendResult | null) {
  const allQuestions = getAllQuestionsFlat();
  const rows = Object.entries(answers)
    .map(([id, answerIndex]) => {
      const q = allQuestions[id];
      if (!q) return null;
      const answer = q.options[answerIndex] ?? "Response recorded";
      const backendFlag = backendResult?.domain_scores?.some(d => d.flag_items?.includes(id)) ?? false;
      const flag = backendResult ? backendFlag : questionFlag(q, answerIndex);
      return {
        id,
        q,
        answer,
        flag,
        label: OBSERVATION_LABELS[id] ?? q.text,
      };
    })
    .filter(Boolean) as Array<{ id: string; q: AdaptiveQuestion; answer: string; flag: boolean; label: string }>;

  return {
    flagged: rows.filter(r => r.flag).slice(0, 8),
    other: rows.filter(r => !r.flag).slice(0, 4),
    all: rows,
  };
}

function recommendationsForReport(
  backendResult: BackendResult | null,
  riskLevel: string,
  domains: ReturnType<typeof getDomainScores>,
) {
  if (backendResult?.recommendations) {
    const primary = backendResult.recommendations.primary ?? [];
    const domain = (backendResult.recommendations.domain_specific ?? [])
      .map(r => r.replace(/^\[.*?\]\s*/, ""));
    return [...primary, ...domain].slice(0, 10);
  }

  const common = riskLevel === "Low"
    ? [
        "Continue routine developmental check-ups and share any new concerns with your child's pediatrician.",
        "Use everyday play, books, songs, and face-to-face interaction to encourage communication and shared attention.",
        "Keep a simple note of developmental changes that concern you so you can discuss them at the next visit.",
      ]
    : [
        "Discuss the screening result and flagged developmental areas with your child's pediatrician or a qualified developmental professional.",
        "Consider a developmental assessment, especially if the flagged behaviours are also seen consistently in everyday life.",
        "Use face-to-face play, shared reading, pointing games, imitation, and turn-taking activities to support social communication.",
      ];

  const domainExtras = domains
    .filter(d => d.percentage >= 50)
    .map(d => {
      if (d.domain === "Communication") return "If communication is a concern, discuss speech and language support with a qualified professional.";
      if (d.domain === "Behavioral Patterns") return "If sensory or behaviour concerns interfere with daily life, discuss them with the child's healthcare professional.";
      return "Use child-led, turn-taking play to encourage social interaction and shared attention.";
    });

  return [...common, ...domainExtras].slice(0, 8);
}

export function buildCaretakerReportHtml(
  childInfo: ChildInfo,
  answers: Record<string, number>,
  backendResult: BackendResult | null,
  fallbackResult: ScreeningResult | null,
  audience: ReportAudience = "caretaker",
) {
  const riskLevel = getRiskLevel(backendResult, fallbackResult);
  const { title, body } = resultMessage(riskLevel);
  const score = backendResult?.overall_score ?? (fallbackResult ? fallbackResult.totalScore * 10 : null);
  const domains = getDomainScores(backendResult, fallbackResult);
  const observations = observationData(answers, backendResult);
  const recommendations = recommendationsForReport(backendResult, riskLevel, domains);
  const screeningDate = dateLabel(backendResult?.screening_date);

  const flaggedHtml = observations.flagged.length
    ? observations.flagged.map(o =>
      `<li><strong>${esc(o.label)}:</strong> the response was <em>${esc(o.answer)}</em>. This response was flagged by the screening rules for this area.</li>`
    ).join("")
    : "<li>No individual responses were flagged by the screening rules.</li>";

  const otherHtml = observations.other.length
    ? observations.other.map(o =>
      `<li><strong>${esc(o.label)}:</strong> the response was <em>${esc(o.answer)}</em>.</li>`
    ).join("")
    : "<li>No additional unflagged observations were included.</li>";

  const profileHtml = domains.map(d => {
    const pct = Math.max(0, Math.min(100, d.percentage));
    return `
      <div class="domain-card">
        <div class="domain-head"><span>${esc(d.domain)}</span><strong>${pct.toFixed(1)}%</strong></div>
        <div class="track"><div class="fill" style="width:${pct}%"></div></div>
        <p>${esc(
          pct < 30
            ? "Fewer responses in this area were flagged by the screening rules."
            : pct < 55
              ? "Some responses in this area were flagged and may be worth monitoring."
              : "Several responses in this area were flagged and merit further discussion."
        )}</p>
      </div>`;
  }).join("");

  const recommendationHtml = recommendations.map(r => `<li>${esc(r)}</li>`).join("");

  const tdscChartHtml = buildTdscChartHtml(childInfo.ageMonths);

  const comparisonHtml = backendResult?.comparison ? `
    <section>
      <h2>Previous screening</h2>
      <div class="comparison">
        <div><span>Previous score</span><strong>${backendResult.comparison.previous_score.toFixed(1)}</strong></div>
        <div><span>Current score</span><strong>${score?.toFixed(1) ?? "—"}</strong></div>
        <div><span>Change</span><strong>${esc(backendResult.comparison.direction)}</strong></div>
      </div>
      <p class="muted">This comparison uses screening history already stored for this child. A change in a screening score does not by itself indicate a change in diagnosis.</p>
    </section>` : "";

  const responseRows = observations.all.map(o => `
    <tr>
      <td>${esc(o.id)}</td>
      <td>${esc(o.q.domain)}</td>
      <td>${esc(o.label)}</td>
      <td>${esc(o.answer)}</td>
      <td class="${o.flag ? "flag" : "ok"}">${o.flag ? "Flagged" : "Not flagged"}</td>
    </tr>`).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Developmental Screening Report — ${esc(childInfo.name)}</title>
<style>
*{box-sizing:border-box}
body{font-family:Arial,Helvetica,sans-serif;color:#1f2937;background:#fff;margin:0;padding:32px;line-height:1.55;font-size:12px}
.container{max-width:820px;margin:auto}
.header{border-bottom:3px solid #2563eb;padding-bottom:18px;margin-bottom:24px}
.kicker{font-size:10px;text-transform:uppercase;letter-spacing:.12em;color:#64748b;font-weight:700}
h1{font-size:25px;margin:5px 0;color:#172554}
h2{font-size:16px;color:#1e3a8a;border-bottom:1px solid #dbeafe;padding-bottom:6px;margin:25px 0 12px}
h3{font-size:13px;margin:16px 0 8px;color:#334155}
.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.info{border:1px solid #e5e7eb;border-radius:8px;padding:9px 11px;background:#f8fafc}
.label{font-size:9px;text-transform:uppercase;color:#64748b;letter-spacing:.05em}
.value{font-size:12px;font-weight:600;margin-top:2px}
.summary{border:1px solid #bfdbfe;background:#eff6ff;border-radius:12px;padding:16px}
.summary strong{font-size:15px;color:#1e3a8a}
.notice{margin-top:10px;padding:9px 11px;border-radius:8px;background:#fff7ed;border:1px solid #fed7aa;color:#9a3412}
.profile{display:grid;gap:10px}
.domain-card{border:1px solid #e5e7eb;border-radius:10px;padding:11px;background:#fff}
.domain-head{display:flex;justify-content:space-between;font-size:12px;margin-bottom:7px}
.track{height:9px;background:#e5e7eb;border-radius:20px;overflow:hidden}
.fill{height:100%;background:#3b82f6;border-radius:20px}
.domain-card p{font-size:10.5px;color:#64748b;margin:6px 0 0}
ul{padding-left:19px}
li{margin:7px 0}
.observation-list li{margin:8px 0}
.flag{color:#b91c1c;font-weight:700}
.ok{color:#166534}
table{width:100%;border-collapse:collapse;font-size:10px}
th,td{border:1px solid #e5e7eb;padding:6px 7px;text-align:left;vertical-align:top}
th{background:#f1f5f9;color:#475569}
.tdsc-chart{border:1px solid #e5e7eb;border-radius:10px;padding:12px;background:#fbfdff;overflow:hidden}.tdsc-axis{display:grid;grid-template-columns:repeat(5,1fr);margin-left:220px;color:#64748b;font-size:9px}.tdsc-axis span{text-align:center}.tdsc-plot{position:relative}.tdsc-row{display:grid;grid-template-columns:210px 1fr;gap:10px;align-items:center;min-height:24px}.tdsc-label{font-size:9.5px;color:#334155;text-align:right}.tdsc-track{height:10px;background:#f1f5f9;border-radius:10px;position:relative}.tdsc-range{position:absolute;top:1px;height:8px;border-radius:8px;background:#93c5fd}.tdsc-age-line{position:absolute;top:0;bottom:0;width:2px;background:#dc2626;z-index:2}.tdsc-age-line span{position:absolute;top:-17px;left:4px;white-space:nowrap;font-size:9px;font-weight:700;color:#b91c1c}.tdsc-legend{display:flex;gap:18px;margin:10px 0 2px 220px;font-size:9px;color:#64748b}.tdsc-legend span{display:flex;align-items:center;gap:5px}.tdsc-swatch{display:inline-block;width:14px;height:7px;border-radius:5px;background:#93c5fd}.tdsc-age-swatch{display:inline-block;width:2px;height:12px;background:#dc2626}.tdsc-note{margin:8px 0 0}..comparison{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.comparison div{padding:10px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px}
.comparison span{display:block;font-size:9px;color:#64748b;text-transform:uppercase}
.comparison strong{font-size:15px}
.muted{color:#64748b;font-size:10.5px}
.score-pill{display:inline-block;padding:4px 9px;border-radius:999px;background:#eef2ff;color:#3730a3;font-weight:700}.overall-track{height:12px;background:#e5e7eb;border-radius:20px;overflow:hidden;margin:8px 0 3px}.overall-fill{height:100%;background:#2563eb;border-radius:20px}.scale-labels{display:flex;justify-content:space-between;font-size:9px;color:#94a3b8}
.disclaimer{margin-top:28px;padding:13px;border:1px solid #cbd5e1;background:#f8fafc;border-radius:9px;color:#475569;font-size:10px}
.footer{margin-top:20px;text-align:center;color:#94a3b8;font-size:9px}
@media print{body{padding:18px}section{break-inside:avoid}}
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <div class="kicker">ASD early screening • ${esc(audience === "caretaker" ? "parent / caretaker report" : "professional report")}</div>
    <h1>Developmental &amp; Behavioural Screening Report</h1>
    <div class="muted">Prepared for ${esc(childInfo.name)} · Screening date: ${esc(screeningDate)}</div>
  </div>

  <section>
    <h2>1. Child summary</h2>
    <div class="info-grid">
      <div class="info"><div class="label">Child</div><div class="value">${esc(childInfo.name)}</div></div>
      <div class="info"><div class="label">Age</div><div class="value">${esc(ageLabel(childInfo.ageMonths))}</div></div>
      <div class="info"><div class="label">Sex</div><div class="value">${esc(genderLabel(childInfo.gender))}</div></div>
      <div class="info"><div class="label">Screening completed by</div><div class="value">${esc(childInfo.completedBy || "Not specified")}</div></div>
      ${childInfo.ethnicity ? `<div class="info"><div class="label">Ethnicity</div><div class="value">${esc(childInfo.ethnicity)}</div></div>` : ""}
      <div class="info"><div class="label">Family history of ASD</div><div class="value">${childInfo.familyASD ? "Reported" : "Not reported"}</div></div>
      <div class="info"><div class="label">History of neonatal jaundice</div><div class="value">${childInfo.jaundice ? "Reported" : "Not reported"}</div></div>
    </div>
  </section>

  <section>
    <h2>2. Screening summary</h2>
    <div class="summary">
      <strong>${esc(title)}</strong>
      ${score !== null ? `<p><span class="score-pill">Screening score: ${score.toFixed(1)} / 100</span></p><div class="overall-track"><div class="overall-fill" style="width:${Math.max(0, Math.min(100, score))}%"></div></div><div class="scale-labels"><span>Lower</span><span>More indicators</span></div>` : ""}
      <p>${esc(body)}</p>
      <div class="notice"><strong>Important:</strong> This is a screening result, not a diagnosis of autism spectrum disorder. The result should be considered together with the child's development, history, and a professional evaluation when needed.</div>
    </div>
  </section>

  <section>
    <h2>3. Developmental and behavioural profile</h2>
    <p class="muted">These percentages show the proportion of scored items in each area that were flagged by the screening system. They are not measures of autism severity and should not be interpreted as a diagnosis.</p>
    <div class="profile">${profileHtml}</div>
  </section>

  <section>
    <h2>4. Developmental screening visual — TDSC reference</h2>
    <p class="muted">The Trivandrum Developmental Screening Chart (TDSC) is a developmental-delay screening tool. This visual uses the published early TDSC milestone ranges and places the child's chronological age on the same age scale. It is a reference chart, not a diagnosis and not a developmental-age calculation.</p>
    ${tdscChartHtml}
  </section>

  <section>
    <h2>5. Specific observations from this screening</h2>
    <h3>Responses that were flagged</h3>
    <ul class="observation-list">${flaggedHtml}</ul>
    <h3>Other recorded responses</h3>
    <ul class="observation-list">${otherHtml}</ul>
  </section>

  <section>
    <h2>6. What this means</h2>
    <p>${esc(title)}</p>
    <p>${esc(body)}</p>
    <p class="muted">The result reflects the answers provided during this screening session. It should not be used on its own to confirm or rule out autism or another developmental condition.</p>
  </section>

  <section>
    <h2>7. What the caretaker can do</h2>
    <ul>${recommendationHtml}</ul>
  </section>

  <section>
    <h2>8. When to discuss the result with a professional</h2>
    <p>If the screening identifies areas of concern, or if you have concerns about your child's communication, social interaction, play, behaviour, or development, discuss them with a pediatrician, developmental pediatrician, child psychologist, speech-language professional, or another qualified developmental professional. Bring this report and examples from everyday life to the appointment.</p>
    <p class="muted">If a child has lost skills they previously had, or you are concerned about a sudden or significant developmental change, contact the child's healthcare professional promptly rather than waiting for a repeat screening.</p>
  </section>

  ${comparisonHtml}

  <section>
    <h2>9. Recorded screening responses</h2>
    <p class="muted">This table preserves the responses actually provided in this screening session. Follow-up questions are included when they were answered.</p>
    <table>
      <thead><tr><th>Item</th><th>Area</th><th>Observation</th><th>Response</th><th>Screening flag</th></tr></thead>
      <tbody>${responseRows || '<tr><td colspan="5">No questionnaire responses were available.</td></tr>'}</tbody>
    </table>
  </section>

  <div class="disclaimer">
    <strong>Screening disclaimer:</strong> This document supports early screening and discussion with a healthcare/developmental professional. It is not a clinical diagnosis and does not determine whether a child has autism spectrum disorder. The report should be interpreted in the context of the child's full developmental history and, when indicated, a comprehensive professional assessment.
  </div>
  <div class="footer">TinyTots ASD Early Screening System · ${esc(audience === "caretaker" ? "Caretaker report" : "Professional report")} · Generated ${esc(screeningDate)}</div>
</div>
</body>
</html>`;
}

export async function generatePDFReport(
  childInfo: ChildInfo,
  answers: Record<string, number>,
  backendResult: BackendResult | null,
  fallbackResult: ScreeningResult | null,
  audience: ReportAudience = "caretaker",
): Promise<Blob> {
  const html = buildCaretakerReportHtml(childInfo, answers, backendResult, fallbackResult, audience);
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-100000px";
  container.style.top = "0";
  container.style.width = "794px";
  container.style.background = "#ffffff";
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    await new Promise(resolve => setTimeout(resolve, 40));
    const canvas = await html2canvas(container, {
      scale: 2,
      backgroundColor: "#ffffff",
      windowWidth: container.scrollWidth,
      windowHeight: container.scrollHeight,
    });

    const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const pageCanvas = document.createElement("canvas");
    const ctx = pageCanvas.getContext("2d");
    const pxPerPage = Math.floor((pageHeight * canvas.width) / pageWidth);

    let offset = 0;
    let page = 0;
    while (offset < canvas.height) {
      const sliceHeight = Math.min(pxPerPage, canvas.height - offset);
      pageCanvas.width = canvas.width;
      pageCanvas.height = sliceHeight;
      ctx?.clearRect(0, 0, pageCanvas.width, pageCanvas.height);
      ctx?.drawImage(canvas, 0, offset, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
      if (page > 0) pdf.addPage();
      pdf.addImage(pageCanvas.toDataURL("image/png"), "PNG", 0, 0, pageWidth, (sliceHeight * pageWidth) / canvas.width);
      offset += sliceHeight;
      page += 1;
    }
    return pdf.output("blob");
  } finally {
    document.body.removeChild(container);
  }
}

export function generateCSVReport(
  childInfo: ChildInfo,
  answers: Record<string, number>,
  backendResult: BackendResult | null,
  fallbackResult: ScreeningResult | null,
) {
  const questions = getAllQuestionsFlat();
  const riskLevel = getRiskLevel(backendResult, fallbackResult);
  const rows: string[][] = [
    ["Developmental & Behavioural Screening Report"],
    ["Child", childInfo.name],
    ["Age", ageLabel(childInfo.ageMonths)],
    ["Sex", genderLabel(childInfo.gender)],
    ["Screening date", dateLabel(backendResult?.screening_date)],
    ["Screening result", resultMessage(riskLevel).title],
    [],
    ["Item", "Area", "Observation", "Response", "Screening flag"],
  ];

  Object.entries(answers).forEach(([id, index]) => {
    const q = questions[id];
    if (!q) return;
    rows.push([
      id,
      q.domain,
      OBSERVATION_LABELS[id] ?? q.text,
      q.options[index] ?? "Response recorded",
      questionFlag(q, index) ? "Flagged" : "Not flagged",
    ]);
  });

  rows.push(
    [],
    ["Disclaimer", "This report is for screening purposes only and does not constitute a medical diagnosis."],
  );

  const csv = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ASD_Screening_${childInfo.name.replace(/\s+/g, "-") || "report"}-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
