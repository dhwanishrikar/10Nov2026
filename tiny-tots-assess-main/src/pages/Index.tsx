import { useState, useCallback, useEffect } from "react";
import LandingStep from "@/components/screening/LandingStep";
import ChildInfoStep from "@/components/screening/ChildInfoStep";
import AdaptiveQuestionnaireStep from "@/components/screening/AdaptiveQuestionnaireStep";
import ReviewStep from "@/components/screening/ReviewStep";
import ResultStep from "@/components/screening/ResultStep";
import { type ChildInfo, calculateResult, type ScreeningResult } from "@/lib/screening-data";
import { Moon, Sun } from "lucide-react";

const API_BASE = "http://127.0.0.1:8000";

export type Step = 'landing' | 'info' | 'questionnaire' | 'review' | 'result';
const stepOrder: Step[] = ['landing', 'info', 'questionnaire', 'review', 'result'];

export interface FeatureContribution {
  feature: string;
  domain: string;
  label: string;
  contribution_pct: number;
  direction: 'risk' | 'protective';
}

export interface BackendResult {
  screening_date: string;
  overall_score: number;
  risk_level: string;
  risk_label: string;
  is_borderline: boolean;
  borderline_note: string;
  stage_completed: number;
  stage2_required: boolean;
  stage2_questions: Array<{ id: string; text: string; domain: string; options: string[] }> | null;
  conditional_questions: Array<{ id: string; text: string; domain: string; options: string[]; triggered_by: string }>;
  domain_scores: Array<{
    domain: string;
    percentage: number;
    item_count: number;
    flag_items: string[];
    interpretation: string;
  }>;
  model_transparency: {
    rf_probability: number | null;
    rf_prediction: string | null;
    lr_probability: number | null;
    lr_prediction: string | null;
    ensemble_probability: number | null;
    final_decision_basis: string;
    models_available: boolean;
  };
  explainability: {
    available: boolean;
    base_value_pct: number | null;
    top_positive: FeatureContribution[];
    top_negative: FeatureContribution[];
    all_features: FeatureContribution[];
    plain_explanation: string | null;
    model_basis: string | null;
  };
  confidence: {
    confidence_pct: number | null;
    confidence_level: 'High' | 'Moderate' | 'Low' | 'unavailable';
    low_confidence_note: string | null;
  };
  recommendations: {
    primary: string[];
    domain_specific: string[];
    age_note: string;
    borderline_note: string;
    trend_note: string;
    monitoring_interval: string;
  };
  report_text: string;
  comparison: {
    previous_score: number;
    previous_risk: string;
    previous_date: string;
    score_change: number;
    direction: string;
  } | null;
  trend: string;
  age_adjustment_applied: boolean;
  age_adjustment_note: string;
}

const STEP_LABELS: Partial<Record<Step, string>> = {
  info: 'Child Details',
  questionnaire: 'Screening',
  review: 'Review',
};

export default function Index() {
  const [step, setStep]               = useState<Step>('landing');
  const [childInfo, setChildInfo]     = useState<ChildInfo>({
    name: '', ageMonths: 24, gender: '', ethnicity: '', jaundice: false, familyASD: false, completedBy: ''
  });
  const [answers, setAnswers]                     = useState<Record<string, number>>({});
  const [backendResult, setBackendResult]         = useState<BackendResult | null>(null);
  const [fallbackResult, setFallbackResult]       = useState<ScreeningResult | null>(null);
  const [isLoading, setIsLoading]                 = useState(false);
  const [darkMode, setDarkMode]                   = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const handleAnswer = useCallback((qId: string, answerIndex: number) => {
    setAnswers(prev => ({ ...prev, [qId]: answerIndex }));
  }, []);

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_info: {
            name: childInfo.name,
            age_months: childInfo.ageMonths,
            sex: childInfo.gender,
            ethnicity: childInfo.ethnicity,
            jaundice: childInfo.jaundice,
            family_asd: childInfo.familyASD,
            completed_by: childInfo.completedBy,
          },
          answers,
          stage: 1,
        }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const data: BackendResult = await res.json();
      setBackendResult(data);
    } catch {
      // Seamless offline fallback - user sees no error
      const res = calculateResult(answers, childInfo);
      setFallbackResult(res);
    } finally {
      setIsLoading(false);
      setStep('result');
    }
  };

  const handleRestart = () => {
    setStep('landing');
    setChildInfo({ name: '', ageMonths: 24, gender: '', ethnicity: '', jaundice: false, familyASD: false, completedBy: '' });
    setAnswers({});
    setBackendResult(null);
    setFallbackResult(null);
  };

  const handleDownload = (pdfBlob: Blob) => {
    const url = URL.createObjectURL(pdfBlob);
    const a   = document.createElement('a');
    a.href    = url;
    a.download = `ASD_Screening_${childInfo.name}_${new Date().toISOString().slice(0, 10)}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const progressSteps: Step[] = ['info', 'questionnaire', 'review'];
  const currentProgressIdx    = progressSteps.indexOf(step);
  const showProgress          = currentProgressIdx !== -1;

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">

      {/* ── Minimal header ── */}
      <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="max-w-2xl mx-auto px-4 h-12 flex items-center justify-between">

          {/* Left: title only on landing, progress on other steps */}
          {!showProgress ? (
            <span className="text-sm font-semibold text-foreground">ASD Early Screening</span>
          ) : (
            <div className="flex items-center gap-3 flex-1 mr-6">
              {progressSteps.map((s, i) => (
                <div key={s} className="flex items-center gap-2 flex-1">
                  <div className="flex-1 flex flex-col items-center gap-0.5">
                    <div className={`w-full h-1 rounded-full transition-all duration-500 ${
                      i < currentProgressIdx ? 'bg-primary' :
                      i === currentProgressIdx ? 'bg-primary/50' : 'bg-border'
                    }`} />
                    <span className={`text-[9px] font-medium ${
                      i === currentProgressIdx ? 'text-primary' : 'text-muted-foreground'
                    }`}>{STEP_LABELS[s]}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Dark mode toggle only */}
          <button
            onClick={() => setDarkMode(d => !d)}
            className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
        </div>
      </header>

      {/* ── Loading overlay ── */}
      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm">
          <div className="text-center">
            <div className="relative w-16 h-16 mx-auto mb-4">
              <div className="w-16 h-16 rounded-full border-4 border-border" />
              <div className="absolute inset-0 rounded-full border-4 border-t-primary animate-spin" />
            </div>
            <p className="text-sm font-semibold text-foreground">Analysing responses…</p>
            <p className="text-xs text-muted-foreground mt-1">Running ML model</p>
          </div>
        </div>
      )}

      {/* ── Pages ── */}
      <main className="max-w-2xl mx-auto px-4 py-8 md:py-10">
        {step === 'landing' && (
          <LandingStep onStart={() => setStep('info')} />
        )}
        {step === 'info' && (
          <ChildInfoStep
            info={childInfo}
            onUpdate={setChildInfo}
            onNext={() => setStep('questionnaire')}
            onBack={() => setStep('landing')}
          />
        )}
        {step === 'questionnaire' && (
          <AdaptiveQuestionnaireStep
            answers={answers}
            onAnswer={handleAnswer}
            onNext={() => setStep('review')}
            onBack={() => setStep('info')}
          />
        )}
        {step === 'review' && (
          <ReviewStep
            childInfo={childInfo}
            answers={answers}
            onSubmit={handleSubmit}
            onBack={() => setStep('questionnaire')}
          />
        )}
        {step === 'result' && (backendResult || fallbackResult) && (
          <ResultStep
            backendResult={backendResult}
            fallbackResult={fallbackResult}
            childInfo={childInfo}
            answers={answers}
            onRestart={handleRestart}
            onDownload={handleDownload}
          />
        )}
      </main>
    </div>
  );
}