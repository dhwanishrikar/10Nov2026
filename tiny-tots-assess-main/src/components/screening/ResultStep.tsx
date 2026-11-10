import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ChildInfo, ScreeningResult } from "@/lib/screening-data";
import type { BackendResult } from "@/pages/Index";
import { generatePDFReport } from "@/lib/generate-report";
import {
  ShieldCheck, AlertTriangle, AlertCircle, Info,
  Brain, MessageSquare, Activity, Download, RotateCcw,
  TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp,
  CheckCircle2, Calendar, Sparkles, Target,
  Lightbulb, Gauge, CircleCheck, CircleX,
} from "lucide-react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  RadialBarChart, RadialBar, Cell,
} from "recharts";

interface ResultStepProps {
  backendResult: BackendResult | null;
  fallbackResult: ScreeningResult | null;
  childInfo: ChildInfo;
  answers: Record<string, number>;
  onRestart: () => void;
  onDownload: (blob: Blob) => void;
}

// ── Screening result display mapping ─────────────────────────────────────────
const DSM5_MAP: Record<string, {
  level: string;
  shortLabel: string;
  desc: string;
  color: string;
  bg: string;
  border: string;
  badge: string;
  barColor: string;
  icon: React.ElementType;
  gradient: string;
}> = {
  Low: {
    level: "Lower Screening Concern",
    shortLabel: "No significant indicators identified",
    desc: "The responses did not identify a high level of ASD-related indicators in this screening.",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    badge: "bg-emerald-100 text-emerald-700",
    barColor: "#10b981",
    icon: ShieldCheck,
    gradient: "from-emerald-500 to-teal-500",
  },
  Moderate: {
    level: "Some Screening Indicators",
    shortLabel: "Some areas may need attention",
    desc: "Some responses were flagged and may be worth discussing with a developmental professional.",
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
    badge: "bg-blue-100 text-blue-700",
    barColor: "#3b82f6",
    icon: Info,
    gradient: "from-blue-500 to-indigo-500",
  },
  High: {
    level: "Several Screening Indicators",
    shortLabel: "Several areas may need attention",
    desc: "Several responses were flagged and may benefit from further developmental assessment.",
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
    badge: "bg-amber-100 text-amber-700",
    barColor: "#f59e0b",
    icon: AlertTriangle,
    gradient: "from-amber-500 to-orange-500",
  },
  "Very High": {
    level: "Multiple Screening Indicators",
    shortLabel: "Further professional assessment is recommended",
    desc: "Multiple responses were flagged. A professional developmental evaluation is recommended.",
    color: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
    badge: "bg-red-100 text-red-700",
    barColor: "#ef4444",
    icon: AlertCircle,
    gradient: "from-red-500 to-rose-600",
  },
};

// Fallback mapping from legacy riskLevel strings
const FALLBACK_MAP: Record<string, string> = {
  none: "Low",
  level1: "Moderate",
  level2: "High",
  level3: "Very High",
};

const domainMeta: Record<string, { icon: React.ElementType; color: string; fill: string }> = {
  "Social Interaction":  { icon: Brain,         color: "text-blue-600",   fill: "#3b82f6" },
  "Communication":       { icon: MessageSquare, color: "text-emerald-600", fill: "#10b981" },
  "Behavioral Patterns": { icon: Activity,      color: "text-amber-600",  fill: "#f59e0b" },
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function ResultStep({ backendResult, fallbackResult, childInfo, answers, onRestart, onDownload }: ResultStepProps) {
  const [expandModel,  setExpandModel]  = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  // Resolve risk level
  const rawLevel  = backendResult?.risk_level ?? (fallbackResult ? FALLBACK_MAP[fallbackResult.riskLevel] ?? 'Low' : 'Low');
  const dsm5      = DSM5_MAP[rawLevel] ?? DSM5_MAP.Low;
  const Icon      = dsm5.icon;
  const score     = backendResult?.overall_score ?? null;

  // Domain scores
  const domainScores = backendResult?.domain_scores ?? [];

  // Radar chart data
  const radarData = domainScores.map(ds => ({
    domain: ds.domain.split(' ')[0], // shorten for chart
    score: ds.percentage,
    fullMark: 100,
  }));

  // Bar chart data for items
  const barData = domainScores.map(ds => ({
    name: ds.domain.replace(' Patterns', '').replace(' Interaction', ''),
    score: Math.round(ds.percentage),
    fill: domainMeta[ds.domain]?.fill ?? '#6366f1',
  }));

  // Explainability (SHAP) chart data — combine top positive + negative,
  // sort by magnitude so the most influential factors sit at the top.
  const explainability = backendResult?.explainability;
  const shapChartData = explainability?.available
    ? [...explainability.top_positive, ...explainability.top_negative]
        .sort((a, b) => Math.abs(b.contribution_pct) - Math.abs(a.contribution_pct))
        .map(f => ({
          name: f.label.length > 34 ? f.label.slice(0, 33) + '…' : f.label,
          fullName: f.label,
          value: f.contribution_pct,
          fill: f.direction === 'risk' ? '#ef4444' : '#10b981',
        }))
    : [];

  const trend      = backendResult?.trend ?? 'none';
  const TrendIcon  = trend === 'improving' ? TrendingDown : trend === 'declining' ? TrendingUp : Minus;
  const trendColor = trend === 'improving' ? 'text-emerald-600' : trend === 'declining' ? 'text-red-500' : 'text-muted-foreground';

  const handleDownloadPDF = async () => {
    setGeneratingPDF(true);
    try {
      const blob = await generatePDFReport(
        childInfo,
        answers,
        backendResult,
        fallbackResult,
        "caretaker",
      );
      onDownload(blob);
    } finally {
      setGeneratingPDF(false);
    }
  };

  return (
    <div className="slide-up max-w-lg mx-auto w-full pb-12">

      {/* ── Screening result ── */}
      <Card className={`border-2 ${dsm5.border} mb-5 overflow-hidden`}>
        {/* Gradient top band */}
        <div className={`bg-gradient-to-r ${dsm5.gradient} p-5 text-white`}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest opacity-75 mb-1">
                Screening Complete · {childInfo.name}
              </p>
              <h2 className="text-xl font-extrabold leading-tight">{dsm5.level}</h2>
              <p className="text-xs opacity-80 mt-1">{dsm5.shortLabel !== dsm5.level ? dsm5.shortLabel : ''}</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
              <Icon className="w-6 h-6 text-white" />
            </div>
          </div>

          {/* Confidence pill */}
          {backendResult?.confidence?.confidence_pct != null && (
            <div className="mt-3 inline-flex items-center gap-1.5 bg-white/15 border border-white/25 rounded-full px-3 py-1">
              <Gauge className="w-3.5 h-3.5 text-white/90" />
              <span className="text-xs font-semibold text-white">
                Confidence: {backendResult.confidence.confidence_pct.toFixed(1)}%
              </span>
              <span className="text-[10px] text-white/70 uppercase tracking-wide">
                ({backendResult.confidence.confidence_level})
              </span>
            </div>
          )}

          {/* Score bar */}
          {score !== null && (
            <div className="mt-4">
              <div className="flex justify-between text-xs mb-1.5 opacity-80">
                <span>Screening score</span>
                <span className="font-bold text-white">{score.toFixed(1)} / 100</span>
              </div>
              <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white/80 rounded-full transition-all duration-1000"
                  style={{ width: `${score}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] mt-1 opacity-60">
                <span>No Traits</span>
                <span>Level 1</span>
                <span>Level 2</span>
                <span>Level 3</span>
              </div>
            </div>
          )}
        </div>

        {/* Screening result explanation */}
        <div className={`px-5 py-3 ${dsm5.bg}`}>
          <p className="text-xs text-muted-foreground leading-relaxed">{dsm5.desc}</p>
          <div className="flex gap-2 flex-wrap mt-2">
            {backendResult?.is_borderline && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">⚠ Borderline</span>
            )}
            {backendResult?.age_adjustment_applied && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">Age-adjusted</span>
            )}
            {backendResult?.stage_completed === 2 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-semibold">Stage 1+2 Complete</span>
            )}
          </div>
          {backendResult?.is_borderline && (
            <p className="text-xs text-amber-700 mt-2 leading-relaxed">{backendResult.borderline_note}</p>
          )}
          {backendResult?.confidence?.low_confidence_note && (
            <p className="text-xs text-amber-700 mt-2 leading-relaxed flex items-start gap-1.5">
              <Gauge className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              {backendResult.confidence.low_confidence_note}
            </p>
          )}
        </div>
      </Card>

      {/* ── Explainable AI (SHAP) ── */}
      {explainability?.available && (
        <Card className="mb-5 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-primary" />
              Why This Prediction?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Plain-language summary for parents */}
            {explainability.plain_explanation && (
              <div className="p-3 rounded-xl bg-primary/5 border border-primary/15">
                <p className="text-xs text-foreground leading-relaxed">{explainability.plain_explanation}</p>
              </div>
            )}

            {/* Horizontal bar chart of top contributing factors */}
            {shapChartData.length > 0 && (
              <div style={{ height: Math.max(160, shapChartData.length * 34) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={shapChartData}
                    layout="vertical"
                    margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis
                      type="number"
                      tickFormatter={(v: number) => `${v > 0 ? '+' : ''}${v}%`}
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={150}
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Tooltip
                      contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                      formatter={(v: number) => [`${v > 0 ? '+' : ''}${v.toFixed(1)}%`, 'Contribution to risk']}
                      labelFormatter={(_l, payload) => payload?.[0]?.payload?.fullName ?? ''}
                    />
                    <Bar dataKey="value" radius={[4, 4, 4, 4]}>
                      {shapChartData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Checklist-style top factors */}
            <div className="grid sm:grid-cols-2 gap-3 pt-1">
              {explainability.top_positive.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-red-600 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                    <CircleX className="w-3 h-3" /> Increased Risk
                  </p>
                  <div className="space-y-1.5">
                    {explainability.top_positive.map(f => (
                      <div key={f.feature} className="flex items-center justify-between gap-2 text-xs p-2 rounded-lg bg-red-50 border border-red-100">
                        <span className="text-red-800">{f.label}</span>
                        <span className="font-bold text-red-700 shrink-0">+{f.contribution_pct.toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {explainability.top_negative.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                    <CircleCheck className="w-3 h-3" /> Protective Factors
                  </p>
                  <div className="space-y-1.5">
                    {explainability.top_negative.map(f => (
                      <div key={f.feature} className="flex items-center justify-between gap-2 text-xs p-2 rounded-lg bg-emerald-50 border border-emerald-100">
                        <span className="text-emerald-800">{f.label}</span>
                        <span className="font-bold text-emerald-700 shrink-0">{f.contribution_pct.toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <p className="text-[10px] text-muted-foreground pt-1 border-t border-border">
              Powered by SHAP ({explainability.model_basis}). Contributions are percentage points of predicted ASD-risk probability, computed against a background of typical screening responses.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Domain Analysis with charts ── */}
      {domainScores.length > 0 && (
        <Card className="mb-5 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Domain Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Radar chart */}
            {radarData.length === 3 && (
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="domain" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <Radar
                      name="Score"
                      dataKey="score"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.25}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Bar chart */}
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number) => [`${v}%`, 'Risk Score']}
                  />
                  <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                    {barData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Domain detail rows */}
            <div className="space-y-3 pt-1">
              {domainScores.map(ds => {
                const meta = domainMeta[ds.domain];
                const DomainIcon = meta?.icon ?? Brain;
                return (
                  <div key={ds.domain} className="p-3 rounded-xl bg-secondary/40 border border-border">
                    <div className="flex items-center gap-2 mb-1.5">
                      <DomainIcon className={`w-4 h-4 ${meta?.color ?? 'text-primary'}`} />
                      <span className="text-sm font-semibold text-foreground">{ds.domain}</span>
                      <span className="ml-auto text-sm font-bold" style={{ color: meta?.fill }}>{ds.percentage.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden mb-1.5">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${ds.percentage}%`, background: meta?.fill ?? 'hsl(var(--primary))' }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">{ds.interpretation}</p>
                    {ds.flag_items.length > 0 && (
                      <p className="text-xs text-amber-600 mt-1">⚠ Flagged: {ds.flag_items.join(', ')}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Trend comparison ── */}
      {backendResult?.comparison && (
        <Card className="mb-5 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendIcon className={`w-4 h-4 ${trendColor}`} />
              Progress Since Last Screening
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { label: 'Previous', value: backendResult.comparison.previous_score.toFixed(1), sub: backendResult.comparison.previous_date, color: 'text-muted-foreground' },
                { label: 'Change', value: `${backendResult.comparison.score_change > 0 ? '+' : ''}${backendResult.comparison.score_change.toFixed(1)}`, sub: backendResult.comparison.direction, color: trendColor },
                { label: 'Current', value: score?.toFixed(1) ?? '—', sub: rawLevel + ' Risk', color: 'text-foreground' },
              ].map(item => (
                <div key={item.label} className="p-3 rounded-xl bg-secondary">
                  <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                  <p className={`text-xl font-extrabold ${item.color}`}>{item.value}</p>
                  <p className="text-[10px] text-muted-foreground capitalize mt-0.5">{item.sub}</p>
                </div>
              ))}
            </div>
            {backendResult.recommendations?.trend_note && (
              <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border leading-relaxed">
                {backendResult.recommendations.trend_note}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Recommendations ── */}
      {backendResult?.recommendations && (
        <Card className="mb-5 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Clinical Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Primary */}
            <div className="space-y-2">
              {backendResult.recommendations.primary.map((rec, i) => (
                <div key={i} className="flex gap-3 p-3 rounded-xl bg-secondary/40">
                  <span className={`shrink-0 w-6 h-6 rounded-full ${dsm5.badge} flex items-center justify-center text-xs font-bold`}>
                    {i + 1}
                  </span>
                  <p className="text-sm text-foreground leading-relaxed">{rec}</p>
                </div>
              ))}
            </div>

            {/* Domain-specific — clean, no brackets */}
            {backendResult.recommendations.domain_specific.length > 0 && (
              <div className="pt-3 border-t border-border">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Domain-Specific Guidance</p>
                <div className="space-y-2">
                  {backendResult.recommendations.domain_specific.map((rec, i) => {
                    // Extract domain tag and clean content
                    const match = rec.match(/^\[(.+?)\]\s*(.*)/);
                    const domain  = match?.[1] ?? '';
                    const content = match?.[2] ?? rec;
                    const meta    = domainMeta[domain];
                    const DIcon   = meta?.icon ?? Brain;
                    return (
                      <div key={i} className="flex gap-3 p-3 rounded-xl border border-border bg-card">
                        {meta && (
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0`}
                            style={{ background: (meta.fill) + '20' }}>
                            <DIcon className="w-3.5 h-3.5" style={{ color: meta.fill }} />
                          </div>
                        )}
                        <div>
                          {domain && <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-0.5">{domain}</p>}
                          <p className="text-xs text-foreground leading-relaxed">{content}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Age note */}
            {backendResult.recommendations.age_note && (
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
                <p className="text-xs text-blue-700 leading-relaxed">
                  <span className="font-semibold">Age note ({childInfo.ageMonths}m): </span>
                  {backendResult.recommendations.age_note}
                </p>
              </div>
            )}

            {/* Monitoring */}
            {backendResult.recommendations.monitoring_interval && (
              <div className="flex items-center gap-2 text-primary pt-1">
                <Calendar className="w-4 h-4 shrink-0" />
                <p className="text-xs font-semibold">{backendResult.recommendations.monitoring_interval}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Risk factors ── */}
      <Card className="mb-5 border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Clinical Risk Factors</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          {[
            { label: 'Neonatal Jaundice', value: childInfo.jaundice },
            { label: 'Family ASD History', value: childInfo.familyASD },
          ].map(rf => (
            <div key={rf.label} className={`p-3 rounded-xl border ${rf.value ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
              <p className={`text-xs font-bold ${rf.value ? 'text-amber-700' : 'text-emerald-700'}`}>
                {rf.value ? '⚠ Present' : '✓ Not Present'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{rf.label}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ── ML Transparency (collapsible) ── */}
      {backendResult?.model_transparency?.models_available && (
        <Card className="mb-5 border-border">
          <button
            onClick={() => setExpandModel(v => !v)}
            className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-secondary/30 transition-colors rounded-xl"
          >
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">ML Model Transparency</span>
            </div>
            {expandModel ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>
          {expandModel && (
            <CardContent className="pt-0 border-t border-border space-y-3">
              {[
                { label: 'Random Forest', prob: backendResult.model_transparency.rf_probability, pred: backendResult.model_transparency.rf_prediction, weight: '60%', color: '#3b82f6', bg: 'bg-blue-50 border-blue-100' },
                { label: 'Logistic Regression', prob: backendResult.model_transparency.lr_probability, pred: backendResult.model_transparency.lr_prediction, weight: '40%', color: '#8b5cf6', bg: 'bg-purple-50 border-purple-100' },
              ].filter(m => m.prob !== null).map(m => (
                <div key={m.label} className={`p-3 rounded-xl border ${m.bg}`}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-bold" style={{ color: m.color }}>{m.label} ({m.weight})</span>
                    <span className="text-xs font-bold" style={{ color: m.color }}>{((m.prob ?? 0) * 100).toFixed(1)}% ASD prob.</span>
                  </div>
                  <div className="h-2 bg-white/70 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(m.prob ?? 0) * 100}%`, background: m.color }} />
                  </div>
                  <p className="text-xs mt-1" style={{ color: m.color }}>→ {m.pred}</p>
                </div>
              ))}

              {backendResult.model_transparency.ensemble_probability !== null && (
                <div className="p-3 rounded-xl bg-secondary border border-border">
                  <div className="flex justify-between font-bold text-sm mb-1">
                    <span>Ensemble Final</span>
                    <span className="text-primary">{((backendResult.model_transparency.ensemble_probability ?? 0) * 100).toFixed(1)}%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{backendResult.model_transparency.final_decision_basis}</p>
                </div>
              )}

              <div className="grid grid-cols-4 gap-2">
                {[['95.67%','Accuracy'],['96%','Precision'],['96%','Recall'],['96%','F1']].map(([v,l]) => (
                  <div key={l} className="text-center p-2 rounded-lg bg-secondary/60">
                    <p className="text-xs font-bold text-foreground">{v}</p>
                    <p className="text-[10px] text-muted-foreground">{l}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* ── Actions ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={handleDownloadPDF}
          disabled={generatingPDF}
          className="flex-1 gap-2"
        >
          <Download className="w-4 h-4" />
          {generatingPDF ? 'Generating PDF…' : 'Download PDF Report'}
        </Button>
        <Button variant="outline" onClick={onRestart} className="flex-1 gap-2">
          <RotateCcw className="w-4 h-4" />
          New Screening
        </Button>
      </div>

      <p className="text-xs text-muted-foreground text-center mt-5 leading-relaxed">
        Based on the screening questionnaire and decision-support scoring. <strong>Not a clinical diagnosis.</strong><br/>
        Consult a qualified developmental paediatrician for a formal evaluation.
      </p>
    </div>
  );
}