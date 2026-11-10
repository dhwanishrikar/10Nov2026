import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, ArrowLeft, ChevronRight } from "lucide-react";
import type { ChildInfo } from "@/lib/screening-data";

interface ChildInfoStepProps {
  info: ChildInfo;
  onUpdate: (info: ChildInfo) => void;
  onNext: () => void;
  onBack: () => void;
}

const ethnicities = [
  'White European', 'Middle Eastern', 'South Asian', 'East Asian',
  'Black / African', 'Hispanic / Latino', 'Mixed', 'Other', 'Prefer not to say',
];

function ageLabel(months: number) {
  if (months === 0) return "0 months";
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (y === 0) return `${m} month${m !== 1 ? 's' : ''}`;
  if (m === 0) return `${y} year${y > 1 ? 's' : ''}`;
  return `${y}y ${m}m`;
}

const ChildInfoStep = ({ info, onUpdate, onNext, onBack }: ChildInfoStepProps) => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const touch = (field: string) => setTouched(p => ({ ...p, [field]: true }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!info.name.trim())                           e.name        = "Child's name is required";
    if (info.ageMonths < 0 || info.ageMonths > 48)  e.age         = "Age must be between 0 and 48 months";
    if (!info.gender)                                e.gender      = "Please select the child's sex";
    if (!info.completedBy)                           e.completedBy = "Please select who is completing this";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    setTouched({ name: true, age: true, gender: true, completedBy: true });
    if (validate()) onNext();
  };

  const err = (f: string) => touched[f] && errors[f];

  const sliderPct = (info.ageMonths / 48) * 100;

  return (
    <div className="slide-up max-w-md mx-auto w-full">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-foreground">Child Information</h2>
        <p className="text-sm text-muted-foreground mt-1">Tell us about the child being screened</p>
      </div>

      <div className="space-y-6">

        {/* ── Name ── */}
        <div>
          <Label htmlFor="name" className="text-sm font-semibold">
            Child's Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            placeholder="Enter child's first name"
            value={info.name}
            onChange={e => { onUpdate({ ...info, name: e.target.value }); touch('name'); }}
            onBlur={() => touch('name')}
            className={`mt-1.5 ${err('name') ? 'border-destructive' : ''}`}
          />
          {err('name') && (
            <p className="text-destructive text-xs mt-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> {errors.name}
            </p>
          )}
        </div>

        {/* ── Age slider ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm font-semibold">
              Age <span className="text-destructive">*</span>
            </Label>
            <span className="text-lg font-bold text-primary">
              {info.ageMonths} <span className="text-sm font-normal text-muted-foreground">months</span>
              <span className="text-sm font-normal text-muted-foreground ml-2">({ageLabel(info.ageMonths)})</span>
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={48}
            step={1}
            value={info.ageMonths}
            onChange={e => { onUpdate({ ...info, ageMonths: Number(e.target.value) }); touch('age'); }}
            className="w-full h-2 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${sliderPct}%, hsl(var(--secondary)) ${sliderPct}%, hsl(var(--secondary)) 100%)`
            }}
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
            <span>0m (newborn)</span>
            <span>12m (1yr)</span>
            <span>24m (2yr)</span>
            <span>36m (3yr)</span>
            <span>48m (4yr)</span>
          </div>
          {err('age') && (
            <p className="text-destructive text-xs mt-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> {errors.age}
            </p>
          )}
        </div>

        {/* ── Sex ── */}
        <div>
          <Label className="text-sm font-semibold">
            Sex <span className="text-destructive">*</span>
          </Label>
          <div className="flex gap-3 mt-1.5">
            {[{ val: 'm', label: 'Male' }, { val: 'f', label: 'Female' }].map(opt => (
              <button
                key={opt.val}
                onClick={() => { onUpdate({ ...info, gender: opt.val }); touch('gender'); }}
                className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                  info.gender === opt.val
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/40'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {err('gender') && (
            <p className="text-destructive text-xs mt-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> {errors.gender}
            </p>
          )}
        </div>

        {/* ── Ethnicity ── */}
        <div>
          <Label className="text-sm font-semibold">
            Ethnicity <span className="text-xs font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Select value={info.ethnicity} onValueChange={v => onUpdate({ ...info, ethnicity: v })}>
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder="Select ethnicity" />
            </SelectTrigger>
            <SelectContent>
              {ethnicities.map(e => (
                <SelectItem key={e} value={e}>{e}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* ── Risk factors ── */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold">Clinical Risk Factors</Label>
          {[
            { field: 'jaundice' as const, label: 'Born with jaundice?', desc: 'Neonatal jaundice diagnosed in the first month of life', value: info.jaundice },
            { field: 'familyASD' as const, label: 'Family member with ASD?', desc: 'Immediate family - parent or sibling with confirmed ASD diagnosis', value: info.familyASD },
          ].map(rf => (
            <div
              key={rf.field}
              className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
                rf.value ? 'border-amber-300 bg-amber-50' : 'border-border bg-card'
              }`}
            >
              <div>
                <p className="text-sm font-medium text-foreground">{rf.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{rf.desc}</p>
              </div>
              <Switch
                checked={rf.value}
                onCheckedChange={v => onUpdate({ ...info, [rf.field]: v })}
              />
            </div>
          ))}
        </div>

        {/* ── Who is completing - NO "Self" option ── */}
        <div>
          <Label className="text-sm font-semibold">
            Who is completing this screening? <span className="text-destructive">*</span>
          </Label>
          <p className="text-xs text-muted-foreground mt-0.5 mb-2">
            Select the person filling out this questionnaire on behalf of the child
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { val: 'family member',            label: 'Family Member',          desc: 'Parent, guardian, or relative' },
              { val: 'health care professional', label: 'Healthcare Professional', desc: 'Doctor, therapist, nurse' },
              { val: 'others',                   label: 'Other',                  desc: 'Teacher, caregiver, etc.' },
            ].map(opt => (
              <button
                key={opt.val}
                onClick={() => { onUpdate({ ...info, completedBy: opt.val }); touch('completedBy'); }}
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  info.completedBy === opt.val
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/40'
                }`}
              >
                <p className={`text-xs font-semibold ${info.completedBy === opt.val ? 'text-primary' : 'text-foreground'}`}>
                  {opt.label}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{opt.desc}</p>
              </button>
            ))}
          </div>
          {err('completedBy') && (
            <p className="text-destructive text-xs mt-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> {errors.completedBy}
            </p>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-8 gap-3">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <Button onClick={handleNext} className="gap-2 flex-1">
          Continue <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default ChildInfoStep;