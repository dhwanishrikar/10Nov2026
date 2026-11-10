import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { questions as stage1Questions } from "@/lib/screening-data";

interface ExtraQuestion {
  id: string;
  text: string;
  domain: string;
  options: string[];
}

interface QuestionnaireStepProps {
  answers: Record<string, number>;
  onAnswer: (questionId: string, answerIndex: number) => void;
  onNext: () => void;
  onBack: () => void;
  stage?: number;
  stageLabel?: string;
  extraQuestions?: ExtraQuestion[];   // Stage 2 questions from backend
}

const domainColors: Record<string, string> = {
  'Social Interaction':    'bg-blue-100 text-blue-700',
  'Communication':         'bg-green-100 text-green-700',
  'Behavioral Patterns':   'bg-yellow-100 text-yellow-700',
  social:                  'bg-blue-100 text-blue-700',
  communication:           'bg-green-100 text-green-700',
  behavior:                'bg-yellow-100 text-yellow-700',
};

const QuestionnaireStep = ({
  answers,
  onAnswer,
  onNext,
  onBack,
  stage = 1,
  stageLabel = "Q-Chat-10 Screening",
  extraQuestions,
}: QuestionnaireStepProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completionError, setCompletionError] = useState<string | null>(null);

  // Use extraQuestions for Stage 2, otherwise Stage 1 defaults
  const activeQuestions: ExtraQuestion[] = extraQuestions
    ? extraQuestions
    : stage1Questions.map(q => ({
        id: q.id,
        text: q.text,
        domain: q.category,
        options: q.options,
      }));

  const question = activeQuestions[currentIndex];
  const progress = ((currentIndex + 1) / activeQuestions.length) * 100;
  const currentAnswer = answers[question?.id];

  const handleNextQ = () => {
    setCompletionError(null);

    if (currentIndex < activeQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      return;
    }

    // Final question - check all are answered
    const unanswered = activeQuestions
      .filter(q => answers[q.id] === undefined)
      .map(q => q.id);

    if (unanswered.length > 0) {
      setCompletionError(`Please answer all questions before continuing. Missing: ${unanswered.join(', ')}`);
      // Jump to first unanswered
      const firstIdx = activeQuestions.findIndex(q => answers[q.id] === undefined);
      setCurrentIndex(firstIdx);
      return;
    }

    onNext();
  };

  const handlePrevQ = () => {
    setCompletionError(null);
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else {
      onBack();
    }
  };

  if (!question) return null;

  const domainLabel = domainColors[question.domain] ?? 'bg-secondary text-secondary-foreground';

  return (
    <div className="slide-up max-w-lg mx-auto w-full">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-1">
          <div>
            <h2 className="text-xl font-bold text-foreground">{stageLabel}</h2>
            {stage === 2 && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Additional questions triggered by your Stage 1 responses
              </p>
            )}
          </div>
          <span className="text-sm text-muted-foreground font-medium">
            {currentIndex + 1} / {activeQuestions.length}
          </span>
        </div>
        <Progress value={progress} className="h-2 mt-2" />
      </div>

      {/* Question card */}
      <Card className="border-border shadow-sm">
        <CardContent className="p-6">
          {/* Domain badge */}
          <span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full mb-4 ${domainLabel}`}>
            {question.domain}
          </span>

          {/* Question text */}
          <p className="text-lg font-medium text-foreground mb-6 leading-relaxed">
            {question.text}
          </p>

          {/* Answer options */}
          <div className="space-y-3">
            {question.options.map((opt, idx) => (
              <button
                key={opt}
                onClick={() => {
                  onAnswer(question.id, idx);
                  setCompletionError(null);
                }}
                className={`w-full p-4 rounded-xl border-2 text-left font-medium transition-all duration-150 ${
                  currentAnswer === idx
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border hover:border-primary/40 text-foreground'
                }`}
              >
                <span className="flex items-center gap-3">
                  <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    currentAnswer === idx ? 'border-primary bg-primary' : 'border-muted-foreground'
                  }`}>
                    {currentAnswer === idx && (
                      <span className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </span>
                  {opt}
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Completion error */}
      {completionError && (
        <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive">
          ⚠ {completionError}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <Button variant="outline" onClick={handlePrevQ}>Back</Button>
        <Button
          onClick={handleNextQ}
          disabled={currentAnswer === undefined}
        >
          {currentIndex < activeQuestions.length - 1 ? 'Next Question' : 'Submit'}
        </Button>
      </div>

      {/* Answered progress dots */}
      <div className="flex justify-center gap-1.5 mt-5 flex-wrap">
        {activeQuestions.map((q, i) => (
          <button
            key={q.id}
            onClick={() => setCurrentIndex(i)}
            className={`w-2.5 h-2.5 rounded-full transition-all ${
              i === currentIndex
                ? 'bg-primary scale-125'
                : answers[q.id] !== undefined
                ? 'bg-primary/40'
                : 'bg-secondary'
            }`}
            title={q.id}
          />
        ))}
      </div>
    </div>
  );
};

export default QuestionnaireStep;