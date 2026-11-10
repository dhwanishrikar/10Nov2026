// AdaptiveQuestionnaireStep.tsx
// ==============================
// Renders the adaptive questionnaire.
// After each answer, the next question may change - follow-ups are inserted
// automatically if a concerning answer is given.

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Info } from "lucide-react";
import {
  adaptiveQuestions,
  buildQuestionSequence,
  type AdaptiveQuestion,
} from "@/lib/adaptive-questions";

interface AdaptiveQuestionnaireStepProps {
  answers: Record<string, number>;
  onAnswer: (questionId: string, answerIndex: number) => void;
  onNext: () => void;   // called when all questions are done
  onBack: () => void;
}

const domainStyles: Record<string, { pill: string; bar: string }> = {
  'Social Interaction':  { pill: 'bg-blue-100 text-blue-700',   bar: 'bg-blue-500' },
  'Communication':       { pill: 'bg-emerald-100 text-emerald-700', bar: 'bg-emerald-500' },
  'Behavioral Patterns': { pill: 'bg-amber-100 text-amber-700', bar: 'bg-amber-500' },
};

export default function AdaptiveQuestionnaireStep({
  answers,
  onAnswer,
  onNext,
  onBack,
}: AdaptiveQuestionnaireStepProps) {
  // currentIndex = index in the DYNAMIC sequence (changes as answers are given)
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showTooltip, setShowTooltip] = useState(false);
  const [justAnswered, setJustAnswered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Rebuild sequence every time answers change
  const sequence: AdaptiveQuestion[] = buildQuestionSequence(answers);
  const question = sequence[currentIndex];
  const currentAnswer = question ? answers[question.id] : undefined;

  // Estimate total - base 10 + at most ~1.5 follow-ups per concerning answer
  const estimatedTotal = Math.max(sequence.length, 10);
  const progress = ((currentIndex + 1) / estimatedTotal) * 100;

  // Count how many follow-ups were triggered so far
  const followUpCount = sequence.length - adaptiveQuestions.length;

  // Auto-advance after answering (300ms delay for feedback)
  useEffect(() => {
    if (!justAnswered || currentAnswer === undefined) return;
    const timer = setTimeout(() => {
      setJustAnswered(false);
      if (currentIndex < sequence.length - 1) {
        setCurrentIndex(i => i + 1);
      }
      // Scroll to top of card
      cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 320);
    return () => clearTimeout(timer);
  }, [justAnswered, currentAnswer, currentIndex, sequence.length]);

  if (!question) return null;

  const style = domainStyles[question.domain] ?? domainStyles['Social Interaction'];
  const isFollowUp = !adaptiveQuestions.find(q => q.id === question.id);
  const isLastQuestion = currentIndex === sequence.length - 1;

  const handleSelect = (idx: number) => {
    onAnswer(question.id, idx);
    setJustAnswered(true);
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(i => i - 1);
    } else {
      onBack();
    }
  };

  const handleContinue = () => {
    if (currentAnswer === undefined) return;
    if (isLastQuestion) {
      onNext();
    } else {
      setCurrentIndex(i => i + 1);
    }
  };

  return (
    <div className="slide-up max-w-lg mx-auto w-full" ref={cardRef}>

      {/* ── Header ── */}
      <div className="mb-5">
        <div className="flex items-start justify-between mb-1">
          <div>
            <h2 className="text-xl font-bold text-foreground">Screening Questionnaire</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Question {currentIndex + 1} of ~{estimatedTotal}
              {followUpCount > 0 && (
                <span className="ml-2 text-primary font-medium">
                  +{followUpCount} follow-up{followUpCount > 1 ? 's' : ''} added
                </span>
              )}
            </p>
          </div>
          {/* Answered dots indicator */}
          <div className="flex gap-1 flex-wrap justify-end max-w-[120px]">
            {sequence.map((q, i) => (
              <button
                key={q.id}
                onClick={() => setCurrentIndex(i)}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === currentIndex ? 'bg-primary scale-125' :
                  answers[q.id] !== undefined ? 'bg-primary/40' : 'bg-secondary'
                }`}
                title={q.id}
              />
            ))}
          </div>
        </div>
        <Progress value={progress} className="h-2 mt-2" />
      </div>

      {/* ── Follow-up badge ── */}
      {isFollowUp && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20">
          <span className="text-xs font-medium text-primary">
            ↳ Follow-up based on your previous answer
          </span>
        </div>
      )}

      {/* ── Question card ── */}
      <Card className={`border-border shadow-sm transition-all ${justAnswered ? 'opacity-70 scale-[0.99]' : ''}`}>
        <CardContent className="p-6">

          {/* Domain pill */}
          <div className="flex items-center justify-between mb-4">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${style.pill}`}>
              {question.domain}
            </span>
            {/* Tooltip toggle */}
            {question.tooltip && (
              <button
                onClick={() => setShowTooltip(v => !v)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Info className="w-3.5 h-3.5" />
                <span>Hint</span>
              </button>
            )}
          </div>

          {/* Tooltip */}
          {showTooltip && question.tooltip && (
            <div className="mb-4 p-3 rounded-lg bg-secondary/60 border border-border text-xs text-muted-foreground leading-relaxed">
              💡 {question.tooltip}
            </div>
          )}

          {/* Question text */}
          <p className="text-lg font-medium text-foreground mb-5 leading-relaxed">
            {question.text}
          </p>

          {/* Options */}
          <div className="space-y-2.5">
            {question.options.map((opt, idx) => {
              const isSelected = currentAnswer === idx;
              return (
                <button
                  key={opt}
                  onClick={() => handleSelect(idx)}
                  className={`w-full p-3.5 rounded-xl border-2 text-left transition-all duration-150 ${
                    isSelected
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border hover:border-primary/40 text-foreground hover:bg-secondary/30'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    {/* Radio circle */}
                    <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                      isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/40'
                    }`}>
                      {isSelected && <span className="w-2 h-2 rounded-full bg-white" />}
                    </span>
                    <span className="font-medium text-sm">{opt}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Navigation ── */}
      <div className="flex justify-between mt-5 gap-3">
        <Button variant="outline" onClick={handleBack}>
          Back
        </Button>

        <Button
          onClick={handleContinue}
          disabled={currentAnswer === undefined}
          className="flex-1"
        >
          {isLastQuestion ? 'Submit for Analysis' : 'Next'}
        </Button>
      </div>

      {/* ── Domain progress summary ── */}
      <div className="mt-6 grid grid-cols-3 gap-2">
        {(['Social Interaction', 'Communication', 'Behavioral Patterns'] as const).map(domain => {
          const domainQs = sequence.filter(q => q.domain === domain);
          const answered = domainQs.filter(q => answers[q.id] !== undefined).length;
          const pct = domainQs.length > 0 ? (answered / domainQs.length) * 100 : 0;
          const s = domainStyles[domain];
          return (
            <div key={domain} className="text-center">
              <div className="text-[10px] text-muted-foreground mb-1 truncate">{domain.split(' ')[0]}</div>
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${s.bar}`} style={{ width: `${pct}%` }} />
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{answered}/{domainQs.length}</div>
            </div>
          );
        })}
      </div>

    </div>
  );
}