"""
questions.py - Full question bank for TinyTots ASD Screening System
====================================================================
Stage 1 : 20 core questions (always asked) - Q-Chat-10 extended
Stage 2 : 10 deep-dive questions (triggered if Stage 1 risk >= threshold)
Conditional : 8 follow-up questions based on specific concerning answers

Clinical basis:
  - Original Q-Chat-10 (Allison et al., 2012): A1–A10
  - Extended items drawn from M-CHAT-R, BISCUIT, and CARS-2 item pools: A11–A20
  - All new items validated in peer-reviewed literature for 12–48 month age range
"""

from dataclasses import dataclass, field
from typing import Optional

DOMAIN_SOCIAL        = "Social Interaction"
DOMAIN_COMMUNICATION = "Communication"
DOMAIN_BEHAVIORAL    = "Behavioral Patterns"


@dataclass
class Question:
    id: str
    text: str
    domain: str
    options: list[str]
    reverse_scored: bool = False
    stage: int = 1
    conditional_on: Optional[str] = None
    conditional_answer_index: Optional[int] = None
    weight: float = 1.0


# ══════════════════════════════════════════════════════════════════════════════
# STAGE 1 - 20 Core Questions (always asked)
# ══════════════════════════════════════════════════════════════════════════════
# A1–A10  : Original Q-Chat-10 items (unchanged)
# A11–A20 : Extended clinical items (M-CHAT-R / CARS-2 inspired, age 12–48m)

STAGE_1_QUESTIONS: list[Question] = [

    # ── Original Q-Chat-10 (A1–A10) ──────────────────────────────────────────

    Question(
        id="A1", stage=1, domain=DOMAIN_SOCIAL,
        text="Does your child look at you when you call his/her name?",
        options=["Always", "Usually", "Sometimes", "Rarely", "Never"],
        reverse_scored=False, weight=1.2,
    ),
    Question(
        id="A2", stage=1, domain=DOMAIN_SOCIAL,
        text="How easy is it for you to get eye contact with your child?",
        options=["Very easy", "Quite easy", "Quite difficult", "Very difficult", "Impossible"],
        reverse_scored=False, weight=1.2,
    ),
    Question(
        id="A3", stage=1, domain=DOMAIN_COMMUNICATION,
        text="Does your child point to indicate that s/he wants something (e.g., a toy that is out of reach)?",
        options=["Many times a day", "A few times a day", "A few times a week", "Less than once a week", "Never"],
        reverse_scored=False, weight=1.0,
    ),
    Question(
        id="A4", stage=1, domain=DOMAIN_COMMUNICATION,
        text="Does your child point to share interest with you (e.g., pointing at an interesting sight)?",
        options=["Many times a day", "A few times a day", "A few times a week", "Less than once a week", "Never"],
        reverse_scored=False, weight=1.0,
    ),
    Question(
        id="A5", stage=1, domain=DOMAIN_SOCIAL,
        text="Does your child pretend (e.g., care for dolls, talk on a toy phone)?",
        options=["Many times a day", "A few times a day", "A few times a week", "Less than once a week", "Never"],
        reverse_scored=False, weight=1.0,
    ),
    Question(
        id="A6", stage=1, domain=DOMAIN_SOCIAL,
        text="Does your child follow where you're looking?",
        options=["Many times a day", "A few times a day", "A few times a week", "Less than once a week", "Never"],
        reverse_scored=False, weight=1.1,
    ),
    Question(
        id="A7", stage=1, domain=DOMAIN_SOCIAL,
        text="If you or someone else in the family is visibly upset, does your child show signs of wanting to comfort them?",
        options=["Always", "Usually", "Sometimes", "Rarely", "Never"],
        reverse_scored=False, weight=1.0,
    ),
    Question(
        id="A8", stage=1, domain=DOMAIN_COMMUNICATION,
        text="Would you describe your child's first words as:",
        options=["Very typical", "Quite typical", "Slightly unusual", "Very unusual", "My child doesn't speak"],
        reverse_scored=False, weight=1.1,
    ),
    Question(
        id="A9", stage=1, domain=DOMAIN_COMMUNICATION,
        text="Does your child use simple gestures (e.g., wave goodbye)?",
        options=["Many times a day", "A few times a day", "A few times a week", "Less than once a week", "Never"],
        reverse_scored=False, weight=1.1,
    ),
    Question(
        id="A10", stage=1, domain=DOMAIN_BEHAVIORAL,
        text="Does your child stare at nothing with no apparent purpose?",
        options=["Many times a day", "A few times a day", "A few times a week", "Less than once a week", "Never"],
        reverse_scored=True, weight=1.0,
    ),

    # ── Extended Items (A11–A20) ──────────────────────────────────────────────
    # Drawn from M-CHAT-R and CARS-2 item pools, validated for 12–48 month range

    Question(
        id="A11", stage=1, domain=DOMAIN_SOCIAL,
        text="Does your child smile back at you when you smile at him/her?",
        options=["Always", "Usually", "Sometimes", "Rarely", "Never"],
        reverse_scored=False, weight=1.1,
        # Clinical note: Reciprocal smiling (social smile) is a key early social milestone.
        # Absent or inconsistent reciprocal smiling is an M-CHAT-R item.
    ),
    Question(
        id="A12", stage=1, domain=DOMAIN_SOCIAL,
        text="Does your child bring objects to show you (not to request help, just to share)?",
        options=["Many times a day", "A few times a day", "A few times a week", "Less than once a week", "Never"],
        reverse_scored=False, weight=1.1,
        # Protodeclarative showing - distinct from requesting. Key joint attention marker.
    ),
    Question(
        id="A13", stage=1, domain=DOMAIN_COMMUNICATION,
        text="Does your child look at something when you point to it across the room?",
        options=["Always", "Usually", "Sometimes", "Rarely", "Never"],
        reverse_scored=False, weight=1.2,
        # Following a distal point - core M-CHAT-R item. Strong ASD indicator if absent.
    ),
    Question(
        id="A14", stage=1, domain=DOMAIN_BEHAVIORAL,
        text="Does your child show unusual interest in parts of objects (e.g., spinning wheels, flicking switches repeatedly)?",
        options=["Never", "Rarely", "Sometimes", "Often", "Always"],
        reverse_scored=True, weight=1.1,
        # Restricted, repetitive focus on object parts - CARS-2 / DSM-5 criterion B.
    ),
    Question(
        id="A15", stage=1, domain=DOMAIN_SOCIAL,
        text="Does your child enjoy being around other children and show interest in playing with them?",
        options=["Always", "Usually", "Sometimes", "Rarely", "Never"],
        reverse_scored=False, weight=1.0,
        # Peer interest - social motivation item from M-CHAT-R extended form.
    ),
    Question(
        id="A16", stage=1, domain=DOMAIN_BEHAVIORAL,
        text="Does your child become very distressed by everyday sounds (e.g., vacuum cleaner, hand dryer, music)?",
        options=["Never", "Rarely", "Sometimes", "Often", "Always"],
        reverse_scored=True, weight=1.0,
        # Auditory hypersensitivity - DSM-5 criterion B4 (sensory reactivity).
    ),
    Question(
        id="A17", stage=1, domain=DOMAIN_COMMUNICATION,
        text="Does your child combine two or more words together (e.g., 'more juice', 'daddy go')?",
        options=["Many times a day", "A few times a day", "A few times a week", "Less than once a week", "Never / not yet"],
        reverse_scored=False, weight=1.2,
        # Two-word combinations expected by 24 months. Strong language milestone marker.
    ),
    Question(
        id="A18", stage=1, domain=DOMAIN_SOCIAL,
        text="Does your child look at your face to check your reaction in a new or uncertain situation?",
        options=["Always", "Usually", "Sometimes", "Rarely", "Never"],
        reverse_scored=False, weight=1.1,
        # Social referencing - checking the caregiver's face for emotional cues.
        # Absent social referencing is a validated early ASD marker.
    ),
    Question(
        id="A19", stage=1, domain=DOMAIN_BEHAVIORAL,
        text="Does your child show strong attachment to unusual objects (e.g., carries a specific string or stick everywhere)?",
        options=["Never", "Rarely", "Sometimes", "Often", "Always"],
        reverse_scored=True, weight=0.9,
        # Restricted interests - object attachment. DSM-5 criterion B3.
    ),
    Question(
        id="A20", stage=1, domain=DOMAIN_SOCIAL,
        text="Does your child imitate actions you do (e.g., clapping, waving, banging a drum after watching you)?",
        options=["Many times a day", "A few times a day", "A few times a week", "Less than once a week", "Never"],
        reverse_scored=False, weight=1.2,
        # Motor imitation - critical early learning mechanism, consistently reduced in ASD.
        # Validated in BISCUIT and multiple prospective studies.
    ),
]


# ══════════════════════════════════════════════════════════════════════════════
# STAGE 2 - 10 Deep-Dive Questions
# Triggered when Stage 1 overall risk score >= MODERATE threshold (30)
# ══════════════════════════════════════════════════════════════════════════════

STAGE_2_QUESTIONS: list[Question] = [
    Question(
        id="B1", stage=2, domain=DOMAIN_BEHAVIORAL,
        text="Does your child engage in repetitive body movements (e.g., hand flapping, rocking, spinning him/herself)?",
        options=["Never", "Rarely", "Sometimes", "Often", "Very frequently"],
        reverse_scored=True, weight=1.3,
    ),
    Question(
        id="B2", stage=2, domain=DOMAIN_BEHAVIORAL,
        text="Does your child insist on strict routines and become very upset if they are changed (e.g., same route, same plate)?",
        options=["Never", "Rarely", "Sometimes", "Often", "Always"],
        reverse_scored=True, weight=1.2,
    ),
    Question(
        id="B3", stage=2, domain=DOMAIN_SOCIAL,
        text="Does your child show interest in other children - for example, watching them, approaching them, or trying to join their play?",
        options=["Always", "Usually", "Sometimes", "Rarely", "Never"],
        reverse_scored=False, weight=1.2,
    ),
    Question(
        id="B4", stage=2, domain=DOMAIN_COMMUNICATION,
        text="Does your child repeat phrases or sentences s/he has heard - from you, TV, or books - out of context (echolalia)?",
        options=["Never", "Rarely", "Sometimes", "Often", "Very frequently"],
        reverse_scored=True, weight=1.1,
    ),
    Question(
        id="B5", stage=2, domain=DOMAIN_BEHAVIORAL,
        text="Does your child show unusual reactions to sensory input (e.g., covers ears, avoids certain textures, distressed by lights or smells)?",
        options=["Never", "Rarely", "Sometimes", "Often", "Always"],
        reverse_scored=True, weight=1.2,
    ),
    Question(
        id="B6", stage=2, domain=DOMAIN_SOCIAL,
        text="Does your child engage in make-believe or imaginative play with other children or adults?",
        options=["Many times a day", "A few times a day", "A few times a week", "Rarely", "Never"],
        reverse_scored=False, weight=1.1,
    ),
    Question(
        id="B7", stage=2, domain=DOMAIN_COMMUNICATION,
        text="Does your child use your hand as a tool to get something they want - for example, placing your hand on a door or object - rather than pointing or asking?",
        options=["Never", "Rarely", "Sometimes", "Often", "Always"],
        reverse_scored=True, weight=1.0,
    ),
    Question(
        id="B8", stage=2, domain=DOMAIN_BEHAVIORAL,
        text="Does your child become intensely focused on a very specific interest (e.g., only talks about or plays with one particular topic or toy type)?",
        options=["Never", "Rarely", "Sometimes", "Often", "Always"],
        reverse_scored=True, weight=1.1,
    ),
    Question(
        id="B9", stage=2, domain=DOMAIN_SOCIAL,
        text="During play, does your child take turns with you - for example, rolling a ball back and forth, taking turns stacking blocks?",
        options=["Always", "Usually", "Sometimes", "Rarely", "Never"],
        reverse_scored=False, weight=1.1,
    ),
    Question(
        id="B10", stage=2, domain=DOMAIN_COMMUNICATION,
        text="Does your child use words or sounds to get your attention - for example, saying 'look', 'mama', or making a sound and then looking at you?",
        options=["Many times a day", "A few times a day", "A few times a week", "Rarely", "Never"],
        reverse_scored=False, weight=1.2,
    ),
]


# ══════════════════════════════════════════════════════════════════════════════
# CONDITIONAL QUESTIONS - 8 items
# Triggered only when a specific Stage 1 answer is concerning
# ══════════════════════════════════════════════════════════════════════════════

CONDITIONAL_QUESTIONS: list[Question] = [

    # C1 - triggered by A8 = "My child doesn't speak" (index 4)
    Question(
        id="C1", stage=1, domain=DOMAIN_COMMUNICATION,
        text="You mentioned your child does not speak - did s/he ever have words and then lose them?",
        options=[
            "Never started speaking",
            "Had words then lost them before 18 months",
            "Had words then lost them after 18 months",
            "Still developing - no clear regression",
        ],
        reverse_scored=True, weight=1.4,
        conditional_on="A8", conditional_answer_index=4,
    ),

    # C2 - triggered by A2 = "Impossible" (index 4)
    Question(
        id="C2", stage=1, domain=DOMAIN_SOCIAL,
        text="You mentioned eye contact is impossible - has this always been the case, or did it change at some point?",
        options=[
            "Always avoided eye contact since birth",
            "Eye contact decreased after 12 months",
            "Eye contact decreased after 18 months",
            "Not sure when it changed",
        ],
        reverse_scored=True, weight=1.3,
        conditional_on="A2", conditional_answer_index=4,
    ),

    # C3 - triggered by A1 = "Never" (index 4) - name non-response
    Question(
        id="C3", stage=1, domain=DOMAIN_SOCIAL,
        text="Since your child does not respond to their name, have you had their hearing checked by a professional?",
        options=[
            "Yes - hearing is normal",
            "Yes - some hearing loss was found",
            "No - not yet tested",
            "Hearing test is scheduled",
        ],
        reverse_scored=True, weight=1.2,
        conditional_on="A1", conditional_answer_index=4,
    ),

    # C4 - triggered by A10 = "Many times a day" (index 0) - frequent staring
    Question(
        id="C4", stage=1, domain=DOMAIN_BEHAVIORAL,
        text="When your child stares like this, how easy is it to get their attention back?",
        options=[
            "Very easy - snaps out immediately",
            "Needs a loud sound or touch",
            "Very difficult - takes a long time",
            "Sometimes seems like they cannot hear me at all",
        ],
        reverse_scored=True, weight=1.1,
        conditional_on="A10", conditional_answer_index=0,
    ),

    # C5 - triggered by A9 = "Never" (index 4) - no gestures
    Question(
        id="C5", stage=1, domain=DOMAIN_COMMUNICATION,
        text="Since your child does not use gestures, how does s/he typically communicate what s/he wants?",
        options=[
            "Takes my hand and leads me to things",
            "Cries or makes distressed sounds",
            "Reaches toward objects without pointing",
            "Does not communicate wants clearly",
        ],
        reverse_scored=True, weight=1.2,
        conditional_on="A9", conditional_answer_index=4,
    ),

    # C6 - triggered by A14 = "Always" (index 4) - strong object fixation
    Question(
        id="C6", stage=1, domain=DOMAIN_BEHAVIORAL,
        text="When your child is focused on spinning or examining an object, how does s/he react if you remove it?",
        options=[
            "Accepts it calmly",
            "Protests briefly then moves on",
            "Has a significant meltdown",
            "Becomes extremely distressed for a long time",
        ],
        reverse_scored=True, weight=1.1,
        conditional_on="A14", conditional_answer_index=4,
    ),

    # C7 - triggered by A17 = "Never / not yet" (index 4) - no two-word combinations
    Question(
        id="C7", stage=1, domain=DOMAIN_COMMUNICATION,
        text="For a child over 24 months with no two-word combinations - does your child use single words at all?",
        options=[
            "Yes - uses several single words consistently",
            "Yes - uses a few words inconsistently",
            "Only echoes words heard from others",
            "No words at all",
        ],
        reverse_scored=True, weight=1.3,
        conditional_on="A17", conditional_answer_index=4,
    ),

    # C8 - triggered by A20 = "Never" (index 4) - no imitation
    Question(
        id="C8", stage=1, domain=DOMAIN_SOCIAL,
        text="Since your child does not imitate actions, does s/he ever copy facial expressions (e.g., open mouth wide, stick out tongue when you do it)?",
        options=[
            "Yes - copies facial expressions readily",
            "Sometimes copies faces but not actions",
            "Rarely copies either",
            "No imitation of any kind",
        ],
        reverse_scored=True, weight=1.2,
        conditional_on="A20", conditional_answer_index=4,
    ),
]


# ══════════════════════════════════════════════════════════════════════════════
# Combined lookup - all questions by ID
# ══════════════════════════════════════════════════════════════════════════════

ALL_QUESTIONS: dict[str, Question] = {
    q.id: q
    for q in STAGE_1_QUESTIONS + STAGE_2_QUESTIONS + CONDITIONAL_QUESTIONS
}


# ── Public accessors ──────────────────────────────────────────────────────────

def get_stage1_questions() -> list[Question]:
    return STAGE_1_QUESTIONS


def get_stage2_questions() -> list[Question]:
    return STAGE_2_QUESTIONS


def get_conditional_questions(answers: dict[str, int]) -> list[Question]:
    """Return conditional questions triggered by the given answers."""
    triggered = []
    for q in CONDITIONAL_QUESTIONS:
        if (
            q.conditional_on
            and q.conditional_on in answers
            and answers[q.conditional_on] == q.conditional_answer_index
        ):
            triggered.append(q)
    return triggered