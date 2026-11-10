export interface ChildInfo {
  name: string;
  ageMonths: number;
  gender: string;
  ethnicity: string;
  jaundice: boolean;
  familyASD: boolean;
  completedBy: string;
}

export interface Question {
  id: string;
  text: string;
  category: 'social' | 'communication' | 'behavior';
  // For A1-A9: "Sometimes/Rarely/Never" → score 1 (risk). For A10: "Always/Usually/Sometimes" → score 1 (risk).
  reverseScored: boolean;
  options: string[];
}

// Q-Chat-10 questions from the dataset
export const questions: Question[] = [
  {
    id: 'A1',
    text: 'Does your child look at you when you call his/her name?',
    category: 'social',
    reverseScored: false,
    options: ['Always', 'Usually', 'Sometimes', 'Rarely', 'Never'],
  },
  {
    id: 'A2',
    text: 'How easy is it for you to get eye contact with your child?',
    category: 'social',
    reverseScored: false,
    options: ['Very easy', 'Quite easy', 'Quite difficult', 'Very difficult', 'Impossible'],
  },
  {
    id: 'A3',
    text: 'Does your child point to indicate that s/he wants something (e.g., a toy that is out of reach)?',
    category: 'communication',
    reverseScored: false,
    options: ['Many times a day', 'A few times a day', 'A few times a week', 'Less than once a week', 'Never'],
  },
  {
    id: 'A4',
    text: 'Does your child point to share interest with you (e.g., pointing at an interesting sight)?',
    category: 'communication',
    reverseScored: false,
    options: ['Many times a day', 'A few times a day', 'A few times a week', 'Less than once a week', 'Never'],
  },
  {
    id: 'A5',
    text: 'Does your child pretend (e.g., care for dolls, talk on a toy phone)?',
    category: 'social',
    reverseScored: false,
    options: ['Many times a day', 'A few times a day', 'A few times a week', 'Less than once a week', 'Never'],
  },
  {
    id: 'A6',
    text: "Does your child follow where you're looking?",
    category: 'social',
    reverseScored: false,
    options: ['Many times a day', 'A few times a day', 'A few times a week', 'Less than once a week', 'Never'],
  },
  {
    id: 'A7',
    text: 'If you or someone else in the family is visibly upset, does your child show signs of wanting to comfort them (e.g., stroking hair, hugging them)?',
    category: 'social',
    reverseScored: false,
    options: ['Always', 'Usually', 'Sometimes', 'Rarely', 'Never'],
  },
  {
    id: 'A8',
    text: "Would you describe your child's first words as:",
    category: 'communication',
    reverseScored: false,
    options: ['Very typical', 'Quite typical', 'Slightly unusual', 'Very unusual', 'My child doesn\'t speak'],
  },
  {
    id: 'A9',
    text: 'Does your child use simple gestures (e.g., wave goodbye)?',
    category: 'communication',
    reverseScored: false,
    options: ['Many times a day', 'A few times a day', 'A few times a week', 'Less than once a week', 'Never'],
  },
  {
    id: 'A10',
    text: 'Does your child stare at nothing with no apparent purpose?',
    category: 'behavior',
    reverseScored: true,
    options: ['Many times a day', 'A few times a day', 'A few times a week', 'Less than once a week', 'Never'],
  },
];

export interface ScreeningResult {
  riskLevel: 'none' | 'level1' | 'level2' | 'level3';
  riskLabel: string;
  totalScore: number;
  confidence: number;
  scores: {
    social: { score: number; max: number };
    communication: { score: number; max: number };
    behavior: { score: number; max: number };
  };
  recommendation: string;
  individualScores: Record<string, number>;
}

/**
 * Scoring per the Q-Chat-10 protocol:
 * - A1–A9: answer index >= 2 (Sometimes/Rarely/Never or equivalent) → 1
 * - A10 (reverse): answer index <= 2 (Always/Usually/Sometimes) → 1
 * Total score > 3 → ASD traits indicated
 */
export function calculateResult(
  answers: Record<string, number>, // questionId → selected option index
  childInfo: ChildInfo
): ScreeningResult {
  const individualScores: Record<string, number> = {};

  let socialScore = 0, socialMax = 0;
  let commScore = 0, commMax = 0;
  let behavScore = 0, behavMax = 0;

  for (const q of questions) {
    const answerIdx = answers[q.id];
    if (answerIdx === undefined) continue;

    let score: number;
    if (q.reverseScored) {
      // A10: Always(0)/Usually(1)/Sometimes(2) → 1 (risk)
      score = answerIdx <= 2 ? 1 : 0;
    } else {
      // A1-A9: Sometimes(2)/Rarely(3)/Never(4) → 1 (risk)
      score = answerIdx >= 2 ? 1 : 0;
    }

    individualScores[q.id] = score;

    switch (q.category) {
      case 'social': socialScore += score; socialMax++; break;
      case 'communication': commScore += score; commMax++; break;
      case 'behavior': behavScore += score; behavMax++; break;
    }
  }

  const totalScore = Object.values(individualScores).reduce((a, b) => a + b, 0);

  // Risk factors from dataset
  let riskBonus = 0;
  if (childInfo.familyASD) riskBonus += 0.5;
  if (childInfo.jaundice) riskBonus += 0.25;

  const adjustedScore = totalScore + riskBonus;

  let riskLevel: ScreeningResult['riskLevel'];
  let riskLabel: string;
  let recommendation: string;

  if (adjustedScore <= 3) {
    riskLevel = 'none';
    riskLabel = 'No ASD Traits Detected';
    recommendation = 'Your child\'s Q-Chat-10 score does not indicate ASD traits. Continue regular developmental check-ups with your pediatrician.';
  } else if (adjustedScore <= 5) {
    riskLevel = 'level1';
    riskLabel = 'Level 1 – Mild ASD Indicators';
    recommendation = 'Mild ASD indicators detected. Consider scheduling an evaluation with a developmental specialist for further assessment.';
  } else if (adjustedScore <= 7) {
    riskLevel = 'level2';
    riskLabel = 'Level 2 – Moderate ASD Indicators';
    recommendation = 'Moderate indicators suggest a professional evaluation is recommended. Please consult with a developmental pediatrician or child psychologist.';
  } else {
    riskLevel = 'level3';
    riskLabel = 'Level 3 – Strong ASD Indicators';
    recommendation = 'Significant indicators were identified. We strongly recommend an immediate professional evaluation by a developmental specialist.';
  }

  const confidence = Math.round(70 + Math.min(Object.keys(individualScores).length * 3, 25));

  return {
    riskLevel,
    riskLabel,
    totalScore,
    confidence,
    scores: {
      social: { score: Math.round((socialScore / Math.max(socialMax, 1)) * 100), max: 100 },
      communication: { score: Math.round((commScore / Math.max(commMax, 1)) * 100), max: 100 },
      behavior: { score: Math.round((behavScore / Math.max(behavMax, 1)) * 100), max: 100 },
    },
    recommendation,
    individualScores,
  };
}
