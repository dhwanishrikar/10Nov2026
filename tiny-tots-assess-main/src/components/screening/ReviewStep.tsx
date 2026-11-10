import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Edit2, ArrowLeft, Send, User, Brain } from "lucide-react";
import type { ChildInfo } from "@/lib/screening-data";
import { adaptiveQuestions, buildQuestionSequence, getAllQuestionsFlat } from "@/lib/adaptive-questions";

interface ReviewStepProps {
  childInfo: ChildInfo;
  answers: Record<string, number>;
  onSubmit: () => void;
  onBack: () => void;
}

const domainColors: Record<string, string> = {
  'Social Interaction':  'bg-blue-100 text-blue-700',
  'Communication':       'bg-emerald-100 text-emerald-700',
  'Behavioral Patterns': 'bg-amber-100 text-amber-700',
};

const ReviewStep = ({ childInfo, answers, onSubmit, onBack }: ReviewStepProps) => {
  const sequence = buildQuestionSequence(answers);
  const allQ = getAllQuestionsFlat();
  const totalAnswered = sequence.filter(q => answers[q.id] !== undefined).length;
  const genderLabel: Record<string, string> = { m: 'Male', f: 'Female' };

  // Group answered questions by domain
  const byDomain: Record<string, typeof sequence> = {};
  sequence.forEach(q => {
    if (answers[q.id] !== undefined) {
      if (!byDomain[q.domain]) byDomain[q.domain] = [];
      byDomain[q.domain].push(q);
    }
  });

  return (
    <div className="slide-up max-w-lg mx-auto w-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground">Review & Submit</h2>
          <p className="text-sm text-muted-foreground">{totalAnswered} answers recorded - please review before submitting</p>
        </div>
      </div>

      {/* Summary pills */}
      <div className="flex gap-2 flex-wrap mb-5">
        {Object.entries(byDomain).map(([domain, qs]) => (
          <span key={domain} className={`text-xs font-semibold px-3 py-1 rounded-full ${domainColors[domain]}`}>
            {domain.split(' ')[0]}: {qs.length} Q{qs.length > 1 ? 's' : ''}
          </span>
        ))}
        {sequence.length > 10 && (
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-primary/10 text-primary">
            +{sequence.length - 10} adaptive follow-ups
          </span>
        )}
      </div>

      <div className="space-y-4">
        {/* Child Info card */}
        <Card className="border-border">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="w-4 h-4 text-primary" /> Child Details
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
              <div className="flex justify-between col-span-2">
                <span className="text-muted-foreground">Name</span>
                <span className="font-semibold text-foreground">{childInfo.name}</span>
              </div>
              <div className="flex justify-between col-span-2">
                <span className="text-muted-foreground">Age</span>
                <span className="font-medium">{childInfo.ageMonths} months ({Math.floor(childInfo.ageMonths / 12)}y {childInfo.ageMonths % 12}m)</span>
              </div>
              {childInfo.gender && (
                <div className="flex justify-between col-span-2">
                  <span className="text-muted-foreground">Sex</span>
                  <span className="font-medium">{genderLabel[childInfo.gender] || childInfo.gender}</span>
                </div>
              )}
              {childInfo.ethnicity && (
                <div className="flex justify-between col-span-2">
                  <span className="text-muted-foreground">Ethnicity</span>
                  <span className="font-medium">{childInfo.ethnicity}</span>
                </div>
              )}
              <div className="flex justify-between col-span-2">
                <span className="text-muted-foreground">Jaundice at birth</span>
                <span className={`font-medium ${childInfo.jaundice ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {childInfo.jaundice ? '⚠ Yes' : '✓ No'}
                </span>
              </div>
              <div className="flex justify-between col-span-2">
                <span className="text-muted-foreground">Family ASD history</span>
                <span className={`font-medium ${childInfo.familyASD ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {childInfo.familyASD ? '⚠ Yes' : '✓ No'}
                </span>
              </div>
              <div className="flex justify-between col-span-2">
                <span className="text-muted-foreground">Completed by</span>
                <span className="font-medium capitalize">{childInfo.completedBy}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Answers by domain */}
        {Object.entries(byDomain).map(([domain, qs]) => (
          <Card key={domain} className="border-border">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Brain className="w-4 h-4 text-primary" />
                {domain}
                <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${domainColors[domain]}`}>
                  {qs.length} answered
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3 max-h-64 overflow-y-auto">
              {qs.map(q => {
                const isFollowUp = !adaptiveQuestions.some(baseQ => baseQ.id === q.id);
                return (
                  <div key={q.id} className={`text-xs border-b border-border pb-2.5 last:border-0 last:pb-0 ${isFollowUp ? 'pl-3 border-l-2 border-l-primary/30' : ''}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <span className="font-bold text-muted-foreground">{q.id}</span>
                        {isFollowUp && <span className="ml-1 text-primary text-[10px]">↳ follow-up</span>}
                        <p className="text-foreground mt-0.5 leading-snug">{q.text}</p>
                      </div>
                    </div>
                    {answers[q.id] !== undefined && (
                      <p className="mt-1 font-semibold text-primary">
                        ✓ {q.options[answers[q.id]]}
                      </p>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Submit notice */}
      <div className="mt-5 p-3 rounded-xl bg-primary/5 border border-primary/20">
        <p className="text-xs text-primary font-medium text-center">
          Your responses will be analysed to produce a personalised screening summary. This takes about 2–3 seconds.
        </p>
      </div>

      {/* Navigation */}
      <div className="flex gap-3 mt-5">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <Edit2 className="w-4 h-4" /> Edit
        </Button>
        <Button
          onClick={onSubmit}
          className="flex-1 gap-2 gradient-primary border-0 shadow-lg shadow-primary/20 font-semibold"
        >
          <Send className="w-4 h-4" />
          Analyse Report
        </Button>
      </div>

      <p className="text-xs text-muted-foreground text-center mt-4">
        All data is processed locally. Nothing is stored on external servers.
      </p>
    </div>
  );
};

export default ReviewStep;