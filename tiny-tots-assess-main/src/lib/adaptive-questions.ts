// adaptive-questions.ts
// =====================
// 20 core questions (Stage 1) - Q-Chat-10 original (A1–A10) + extended clinical items (A11–A20)
// Extended items drawn from M-CHAT-R, BISCUIT, and CARS-2 item pools.
// Each question may trigger contextually relevant follow-ups based on concerning answers.

export type Domain = 'Social Interaction' | 'Communication' | 'Behavioral Patterns';

export interface AdaptiveQuestion {
  id: string;
  text: string;
  domain: Domain;
  options: string[];
  reverseScored?: boolean;
  weight?: number;
  tooltip?: string;
  followUps?: FollowUp[];
}

export interface FollowUp {
  triggerIndexes: number[];
  question: AdaptiveQuestion;
}

// ══════════════════════════════════════════════════════════════════════════════
// 20 CORE QUESTIONS
// ══════════════════════════════════════════════════════════════════════════════

export const adaptiveQuestions: AdaptiveQuestion[] = [

  // ── A1: Name response ──────────────────────────────────────────────────────
  {
    id: 'A1', domain: 'Social Interaction',
    text: 'Does your child look at you when you call his/her name?',
    options: ['Always', 'Usually', 'Sometimes', 'Rarely', 'Never'],
    tooltip: 'Call their name when they are not already looking at you.',
    followUps: [
      {
        triggerIndexes: [2, 3, 4],
        question: {
          id: 'A1a', domain: 'Social Interaction',
          text: 'When your child does not respond to their name, do they seem to be in their own world - not just distracted by something?',
          options: ['Yes, often seems unaware', 'Sometimes', 'No, usually just distracted'],
          tooltip: 'Distinguishes social unawareness from ordinary inattention.',
        },
      },
      {
        triggerIndexes: [3, 4],
        question: {
          id: 'A1b', domain: 'Social Interaction',
          text: 'Have you had your child\'s hearing professionally checked?',
          options: ['Yes - hearing is normal', 'Yes - some hearing loss found', 'No - not yet tested'],
          tooltip: 'Hearing loss can mimic social unawareness - important to rule out first.',
        },
      },
    ],
  },

  // ── A2: Eye contact ────────────────────────────────────────────────────────
  {
    id: 'A2', domain: 'Social Interaction',
    text: 'How easy is it for you to get eye contact with your child?',
    options: ['Very easy', 'Quite easy', 'Quite difficult', 'Very difficult', 'Impossible'],
    tooltip: 'Think about everyday moments - mealtimes, play, dressing.',
    followUps: [
      {
        triggerIndexes: [3, 4],
        question: {
          id: 'A2a', domain: 'Social Interaction',
          text: 'When your child does make eye contact, is it very brief (less than 1–2 seconds)?',
          options: ['Yes, always very brief', 'Sometimes brief', 'No, they can hold eye contact'],
        },
      },
      {
        triggerIndexes: [4],
        question: {
          id: 'A2b', domain: 'Social Interaction',
          text: 'Has your child always avoided eye contact, or did this change at some point?',
          options: [
            'Always avoided since birth',
            'Decreased after 12 months',
            'Decreased after 18 months',
            'Not sure when it changed',
          ],
          tooltip: 'Regression in eye contact after 12–18 months is clinically significant.',
        },
      },
    ],
  },

  // ── A3: Pointing to request ────────────────────────────────────────────────
  {
    id: 'A3', domain: 'Communication',
    text: 'Does your child point to indicate that they want something (e.g., a toy out of reach)?',
    options: ['Many times a day', 'A few times a day', 'A few times a week', 'Less than once a week', 'Never'],
    tooltip: 'Look for an extended index finger toward an object - not just reaching.',
    followUps: [
      {
        triggerIndexes: [3, 4],
        question: {
          id: 'A3a', domain: 'Communication',
          text: 'Instead of pointing, how does your child usually communicate what they want?',
          options: [
            'Takes my hand and leads me',
            'Cries or makes distressed sounds',
            'Reaches without pointing',
            'Does not communicate wants clearly',
          ],
          tooltip: 'Using an adult\'s hand as a tool (rather than pointing) is a key ASD indicator.',
        },
      },
    ],
  },

  // ── A4: Pointing to share ──────────────────────────────────────────────────
  {
    id: 'A4', domain: 'Communication',
    text: 'Does your child point to share interest with you (e.g., pointing at a bird or airplane)?',
    options: ['Many times a day', 'A few times a day', 'A few times a week', 'Less than once a week', 'Never'],
    tooltip: 'This is declarative pointing - sharing excitement, not requesting.',
    followUps: [
      {
        triggerIndexes: [2, 3, 4],
        question: {
          id: 'A4a', domain: 'Communication',
          text: 'When your child points at something, do they look back at your face to check you are looking too?',
          options: ['Yes, always checks my face', 'Sometimes', 'Rarely or never checks'],
          tooltip: 'Looking back to share attention (joint attention) is a key early milestone.',
        },
      },
    ],
  },

  // ── A5: Pretend play ───────────────────────────────────────────────────────
  {
    id: 'A5', domain: 'Social Interaction',
    text: 'Does your child pretend play (e.g., feed a doll, talk on a toy phone, pretend to cook)?',
    options: ['Many times a day', 'A few times a day', 'A few times a week', 'Less than once a week', 'Never'],
    followUps: [
      {
        triggerIndexes: [3, 4],
        question: {
          id: 'A5a', domain: 'Social Interaction',
          text: 'What does your child prefer to do with toys?',
          options: [
            'Lines them up or arranges them in patterns',
            'Spins or rotates them repeatedly',
            'Uses them as intended but no pretend play',
            'Shows little interest in toys generally',
          ],
          tooltip: 'Repetitive or unusual use of toys is an early ASD indicator.',
        },
      },
    ],
  },

  // ── A6: Following gaze ─────────────────────────────────────────────────────
  {
    id: 'A6', domain: 'Social Interaction',
    text: "Does your child follow where you're looking across the room?",
    options: ['Many times a day', 'A few times a day', 'A few times a week', 'Less than once a week', 'Never'],
    tooltip: 'Point to something across the room. Does your child look in that direction?',
    followUps: [
      {
        triggerIndexes: [2, 3, 4],
        question: {
          id: 'A6a', domain: 'Social Interaction',
          text: "If you point to something within arm's reach, does your child look at it?",
          options: ['Yes, follows nearby pointing', 'Sometimes', 'No, even nearby pointing not followed'],
          tooltip: 'Some children follow nearby but not distant pointing - a meaningful developmental difference.',
        },
      },
    ],
  },

  // ── A7: Empathy ────────────────────────────────────────────────────────────
  {
    id: 'A7', domain: 'Social Interaction',
    text: 'If you or someone in the family is visibly upset, does your child show signs of wanting to comfort them?',
    options: ['Always', 'Usually', 'Sometimes', 'Rarely', 'Never'],
    followUps: [
      {
        triggerIndexes: [3, 4],
        question: {
          id: 'A7a', domain: 'Social Interaction',
          text: "Does your child notice when others are upset, even if they don't try to comfort them?",
          options: [
            'Yes, notices but walks away',
            'Sometimes glances over',
            'No, seems unaware of others\' emotions',
          ],
        },
      },
    ],
  },

  // ── A8: First words ────────────────────────────────────────────────────────
  {
    id: 'A8', domain: 'Communication',
    text: "Would you describe your child's first words as:",
    options: ['Very typical', 'Quite typical', 'Slightly unusual', 'Very unusual', "My child doesn't speak"],
    tooltip: 'Unusual first words include using words out of context, or repeating phrases from TV.',
    followUps: [
      {
        triggerIndexes: [2, 3],
        question: {
          id: 'A8a', domain: 'Communication',
          text: 'What makes their words seem unusual?',
          options: [
            'They repeat phrases from TV or books (echolalia)',
            'They use words but not to communicate with people',
            'They used to say words but stopped',
            'Their words are hard to understand',
          ],
        },
      },
      {
        triggerIndexes: [4],
        question: {
          id: 'A8b', domain: 'Communication',
          text: "Did your child say any words before and then stop?",
          options: [
            'Yes - had words then lost them before 18 months',
            'Yes - had words then lost them after 18 months',
            'No - has never spoken',
            'They babble but no clear words yet',
          ],
          tooltip: 'Loss of language after normal development is a clinically significant regression.',
        },
      },
    ],
  },

  // ── A9: Gestures ──────────────────────────────────────────────────────────
  {
    id: 'A9', domain: 'Communication',
    text: 'Does your child use simple gestures (e.g., wave goodbye, clap, shake head for no)?',
    options: ['Many times a day', 'A few times a day', 'A few times a week', 'Less than once a week', 'Never'],
    followUps: [
      {
        triggerIndexes: [3, 4],
        question: {
          id: 'A9a', domain: 'Communication',
          text: 'Has your child ever used gestures and then stopped, or have they never developed them?',
          options: [
            'Used to gesture, then stopped',
            'Never used gestures',
            'Uses some gestures but very inconsistently',
          ],
        },
      },
    ],
  },

  // ── A10: Staring ──────────────────────────────────────────────────────────
  {
    id: 'A10', domain: 'Behavioral Patterns',
    text: 'Does your child stare at nothing with no apparent purpose?',
    options: ['Many times a day', 'A few times a day', 'A few times a week', 'Less than once a week', 'Never'],
    reverseScored: true,
    tooltip: 'Look for glazed, fixed staring that is hard to interrupt - distinct from normal daydreaming.',
    followUps: [
      {
        triggerIndexes: [0, 1],
        question: {
          id: 'A10a', domain: 'Behavioral Patterns',
          text: 'When your child stares like this, can you easily get their attention back?',
          options: [
            'Yes, easily snapped out of it',
            'Needs a loud sound or touch',
            'Very hard to get attention back',
            'Sometimes seems like they cannot hear me',
          ],
          tooltip: 'Difficulty interrupting staring spells may warrant a neurological check.',
        },
      },
    ],
  },

  // ── A11: Reciprocal smiling (M-CHAT-R) ────────────────────────────────────
  {
    id: 'A11', domain: 'Social Interaction',
    text: 'Does your child smile back at you when you smile at him/her?',
    options: ['Always', 'Usually', 'Sometimes', 'Rarely', 'Never'],
    tooltip: 'The social smile is one of the earliest social milestones, expected by 2–3 months.',
    followUps: [
      {
        triggerIndexes: [3, 4],
        question: {
          id: 'A11a', domain: 'Social Interaction',
          text: 'Does your child smile spontaneously at you at other times - even if they do not smile back?',
          options: [
            'Yes, they smile spontaneously',
            'Only when tickled or physically stimulated',
            'Rarely smiles at people',
            'Almost never smiles at people',
          ],
        },
      },
    ],
  },

  // ── A12: Showing objects (joint attention) ─────────────────────────────────
  {
    id: 'A12', domain: 'Social Interaction',
    text: 'Does your child bring objects to show you - not to get help, just to share their interest?',
    options: ['Many times a day', 'A few times a day', 'A few times a week', 'Less than once a week', 'Never'],
    tooltip: 'Protodeclarative showing - distinct from requesting help. Key joint attention marker.',
    followUps: [
      {
        triggerIndexes: [3, 4],
        question: {
          id: 'A12a', domain: 'Social Interaction',
          text: 'When your child shows you something, do they look at your face to see your reaction?',
          options: [
            'Yes, always checks my face',
            'Sometimes looks at me',
            'Rarely - just hands me the object and walks away',
          ],
        },
      },
    ],
  },

  // ── A13: Following a distal point (M-CHAT-R core item) ────────────────────
  {
    id: 'A13', domain: 'Communication',
    text: 'Does your child look at something when you point to it across the room?',
    options: ['Always', 'Usually', 'Sometimes', 'Rarely', 'Never'],
    tooltip: 'Point to something across the room without looking at it yourself. Does your child follow?',
    followUps: [
      {
        triggerIndexes: [2, 3, 4],
        question: {
          id: 'A13a', domain: 'Communication',
          text: "When your child doesn't follow your point, what do they tend to look at instead?",
          options: [
            'They look at my finger, not the object',
            'They look at my face',
            'They look away entirely',
            'They seem uninterested in the whole interaction',
          ],
          tooltip: 'Looking at the finger rather than the object suggests the pointing gesture is not understood.',
        },
      },
    ],
  },

  // ── A14: Object part fixation (CARS-2 / DSM-5 criterion B) ────────────────
  {
    id: 'A14', domain: 'Behavioral Patterns',
    text: 'Does your child show unusual interest in parts of objects (e.g., spinning wheels, flicking switches repeatedly for long periods)?',
    options: ['Never', 'Rarely', 'Sometimes', 'Often', 'Always'],
    reverseScored: true,
    tooltip: 'This is different from normal curiosity - look for prolonged, repetitive focus on one part.',
    followUps: [
      {
        triggerIndexes: [3, 4],
        question: {
          id: 'A14a', domain: 'Behavioral Patterns',
          text: 'How does your child react when you interrupt this activity?',
          options: [
            'Accepts it calmly',
            'Protests briefly then moves on',
            'Has a significant meltdown',
            'Becomes extremely distressed for a prolonged time',
          ],
        },
      },
    ],
  },

  // ── A15: Peer interest ─────────────────────────────────────────────────────
  {
    id: 'A15', domain: 'Social Interaction',
    text: 'Does your child enjoy being around other children and show interest in playing with them?',
    options: ['Always', 'Usually', 'Sometimes', 'Rarely', 'Never'],
    followUps: [
      {
        triggerIndexes: [3, 4],
        question: {
          id: 'A15a', domain: 'Social Interaction',
          text: 'When around other children, what does your child typically do?',
          options: [
            'Plays alongside but separately (parallel play)',
            'Moves away from other children',
            'Seems unaware other children are present',
            'Watches from a distance but does not approach',
          ],
        },
      },
    ],
  },

  // ── A16: Auditory hypersensitivity (DSM-5 criterion B4) ───────────────────
  {
    id: 'A16', domain: 'Behavioral Patterns',
    text: 'Does your child become very distressed by everyday sounds (e.g., vacuum cleaner, hand dryer, music)?',
    options: ['Never', 'Rarely', 'Sometimes', 'Often', 'Always'],
    reverseScored: true,
    tooltip: 'This is about distress beyond typical startle reactions - covering ears, screaming, fleeing.',
    followUps: [
      {
        triggerIndexes: [3, 4],
        question: {
          id: 'A16a', domain: 'Behavioral Patterns',
          text: 'Does your child also seek out intense sensory input (e.g., loves very loud sounds, spins constantly, seeks tight pressure)?',
          options: [
            'No - only avoids sensory input',
            'Yes - seeks some sensory input while avoiding other types',
            'Primarily seeks intense sensory experiences',
          ],
          tooltip: 'Mixed sensory seeking and avoidance is a common sensory processing pattern in ASD.',
        },
      },
    ],
  },

  // ── A17: Two-word combinations (language milestone) ───────────────────────
  {
    id: 'A17', domain: 'Communication',
    text: 'Does your child combine two or more words together (e.g., "more juice", "daddy go")?',
    options: ['Many times a day', 'A few times a day', 'A few times a week', 'Less than once a week', 'Never / not yet'],
    tooltip: 'Two-word combinations are expected by 24 months. This is a critical language milestone.',
    followUps: [
      {
        triggerIndexes: [3, 4],
        question: {
          id: 'A17a', domain: 'Communication',
          text: 'Does your child use single words consistently to communicate?',
          options: [
            'Yes - uses several single words consistently',
            'Yes - uses a few words inconsistently',
            'Only echoes words heard from others',
            'No words at all',
          ],
        },
      },
    ],
  },

  // ── A18: Social referencing ────────────────────────────────────────────────
  {
    id: 'A18', domain: 'Social Interaction',
    text: 'In a new or uncertain situation, does your child look at your face to check your reaction?',
    options: ['Always', 'Usually', 'Sometimes', 'Rarely', 'Never'],
    tooltip: 'This is called social referencing - the child uses your emotion as a guide for how to react.',
    followUps: [
      {
        triggerIndexes: [3, 4],
        question: {
          id: 'A18a', domain: 'Social Interaction',
          text: 'In a new situation, how does your child typically respond?',
          options: [
            'Explores confidently without checking back',
            'Freezes or withdraws without seeking reassurance',
            'Becomes distressed without looking to you for comfort',
            'Seems unaware that you are nearby',
          ],
        },
      },
    ],
  },

  // ── A19: Unusual object attachment (DSM-5 criterion B3) ───────────────────
  {
    id: 'A19', domain: 'Behavioral Patterns',
    text: 'Does your child show strong attachment to unusual objects (e.g., always carries a specific string, stick, or non-toy item)?',
    options: ['Never', 'Rarely', 'Sometimes', 'Often', 'Always'],
    reverseScored: true,
    tooltip: 'This is about non-functional object attachment - distinct from comfort objects like a blanket.',
    followUps: [
      {
        triggerIndexes: [3, 4],
        question: {
          id: 'A19a', domain: 'Behavioral Patterns',
          text: 'What happens if you take this object away?',
          options: [
            'Accepts it with mild protest',
            'Becomes significantly upset',
            'Has a major meltdown that lasts a long time',
            'Will not settle until the object is returned',
          ],
        },
      },
    ],
  },

  // ── A20: Motor imitation (BISCUIT / prospective ASD studies) ──────────────
  {
    id: 'A20', domain: 'Social Interaction',
    text: 'Does your child imitate actions you do (e.g., clapping, waving, banging a drum after watching you)?',
    options: ['Many times a day', 'A few times a day', 'A few times a week', 'Less than once a week', 'Never'],
    tooltip: 'Motor imitation is a critical early learning mechanism, consistently reduced in ASD.',
    followUps: [
      {
        triggerIndexes: [3, 4],
        question: {
          id: 'A20a', domain: 'Social Interaction',
          text: 'Does your child copy facial expressions - for example, opening their mouth wide or sticking their tongue out when you do?',
          options: [
            'Yes - copies facial expressions readily',
            'Sometimes copies faces but not body actions',
            'Rarely copies either',
            'No imitation of any kind',
          ],
          tooltip: 'Facial imitation is even more fundamental than motor imitation - its absence is significant.',
        },
      },
    ],
  },
];


// ══════════════════════════════════════════════════════════════════════════════
// ENGINE - builds dynamic question sequence from answers
// ══════════════════════════════════════════════════════════════════════════════

export function buildQuestionSequence(
  answers: Record<string, number>,
  baseQuestions: AdaptiveQuestion[] = adaptiveQuestions,
): AdaptiveQuestion[] {
  const sequence: AdaptiveQuestion[] = [];
  const added = new Set<string>();   // prevent any duplicate IDs

  for (const baseQ of baseQuestions) {
    if (added.has(baseQ.id)) continue;
    sequence.push(baseQ);
    added.add(baseQ.id);

    const answerIndex = answers[baseQ.id];
    if (answerIndex === undefined || !baseQ.followUps) continue;

    for (const followUp of baseQ.followUps) {
      if (!followUp.triggerIndexes.includes(answerIndex)) continue;
      const fq = followUp.question;
      if (added.has(fq.id)) continue;
      sequence.push(fq);
      added.add(fq.id);

      // Nested follow-ups
      const nestedAnswer = answers[fq.id];
      if (nestedAnswer !== undefined && fq.followUps) {
        for (const nested of fq.followUps) {
          if (!nested.triggerIndexes.includes(nestedAnswer)) continue;
          if (added.has(nested.question.id)) continue;
          sequence.push(nested.question);
          added.add(nested.question.id);
        }
      }
    }
  }

  return sequence;
}


export function getNextQuestionId(
  currentId: string,
  answers: Record<string, number>,
): string | null {
  const seq = buildQuestionSequence(answers);
  const idx = seq.findIndex(q => q.id === currentId);
  if (idx === -1 || idx + 1 >= seq.length) return null;
  return seq[idx + 1].id;
}


export function getAllQuestionsFlat(): Record<string, AdaptiveQuestion> {
  const map: Record<string, AdaptiveQuestion> = {};
  function walk(q: AdaptiveQuestion) {
    map[q.id] = q;
    if (q.followUps) q.followUps.forEach(f => walk(f.question));
  }
  adaptiveQuestions.forEach(walk);
  return map;
}