import { Button } from "@/components/ui/button";
import { Brain, Shield, Clock, ChevronRight, Activity, Users, Award } from "lucide-react";

interface LandingStepProps {
  onStart: () => void;
}

const stats = [
  { value: "95.67%", label: "Model Accuracy", icon: Award },
  { value: "1,054", label: "Training Samples", icon: Users },
  { value: "~5 min", label: "Screening Time", icon: Clock },
];

const features = [
  {
    icon: Brain,
    title: "AI-Powered Analysis",
    desc: "Hybrid Random Forest + Logistic Regression ensemble model with SMOTE-balanced training data",
    color: "text-blue-600",
    bg: "bg-blue-50 border-blue-100",
  },
  {
    icon: Activity,
    title: "Adaptive Questionnaire",
    desc: "Questions adapt in real time based on your answers - up to 20 personalised follow-ups",
    color: "text-purple-600",
    bg: "bg-purple-50 border-purple-100",
  },
  {
    icon: Shield,
    title: "Clinical Report",
    desc: "Structured domain analysis across Social, Communication & Behavioural patterns with recommendations",
    color: "text-emerald-600",
    bg: "bg-emerald-50 border-emerald-100",
  },
];

const LandingStep = ({ onStart }: LandingStepProps) => {
  return (
    <div className="fade-in max-w-2xl mx-auto w-full">

      {/* ── Hero ── */}
      <div className="text-center mb-12">
        

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          Q-Chat-10 Clinical Screening Protocol
        </div>

        <h1 className="text-4xl md:text-5xl font-extrabold text-foreground mb-4 leading-tight tracking-tight">
          ASD SCREENING {" "}
        </h1>

        <p className="text-lg text-muted-foreground max-w-lg mx-auto leading-relaxed">
          An intelligent early screening tool for children aged 0-4 years, powered by
          validated machine learning models and the Q-Chat-10 protocol.
        </p>
      </div>

      {/* ── Stats bar ── */}
      <div className="grid grid-cols-3 gap-3 mb-10">
        {stats.map(({ value, label, icon: Icon }) => (
          <div key={label} className="flex flex-col items-center p-4 rounded-2xl bg-card border border-border hover-lift">
            <Icon className="w-5 h-5 text-primary mb-2" />
            <span className="text-xl font-bold text-foreground">{value}</span>
            <span className="text-xs text-muted-foreground text-center mt-0.5">{label}</span>
          </div>
        ))}
      </div>

      {/* ── Feature cards ── */}
      <div className="space-y-3 mb-10">
        {features.map(({ icon: Icon, title, desc, color, bg }) => (
          <div key={title} className={`flex gap-4 p-4 rounded-2xl border ${bg} hover-lift`}>
            <div className={`w-10 h-10 rounded-xl bg-white/80 flex items-center justify-center shrink-0 shadow-sm`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm">{title}</h3>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── CTA ── */}
      <div className="text-center">
        <Button
          size="lg"
          onClick={onStart}
          className="gradient-primary border-0 px-10 py-6 text-base font-semibold rounded-2xl shadow-xl shadow-primary/25 hover:opacity-90 hover:shadow-2xl hover:shadow-primary/30 transition-all duration-300 hover:-translate-y-0.5"
        >
          Begin Screening
          <ChevronRight className="w-5 h-5 ml-1" />
        </Button>

        <p className="text-xs text-muted-foreground mt-5 max-w-sm mx-auto leading-relaxed">
          Based on the validated Q-Chat-10 dataset. This tool supports early identification
          only and does not replace a clinical diagnosis by a qualified professional.
        </p>
      </div>

      {/* ── Disclaimer ribbon ── */}
      <div className="mt-8 p-3 rounded-xl bg-amber-50 border border-amber-200 flex gap-2 items-start">
        <Shield className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700">
          <strong>Not a diagnosis.</strong> Results are for informational purposes only.
          Always consult a paediatric specialist or developmental psychologist for a formal evaluation.
        </p>
      </div>
    </div>
  );
};

export default LandingStep;