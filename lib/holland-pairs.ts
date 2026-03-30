import type { HollandLetter } from "@/lib/types";

/** One forced-choice pair (content from holland_binary_quiz.html; logic is dev-only, not shown in UI). */
export type HollandPair = {
  prompt: string;
  /** Developer intent — not displayed to users */
  logic: string;
  A: { text: string; type: HollandLetter };
  B: { text: string; type: HollandLetter };
};

/**
 * 12 binary pairs — copy of holland_binary_quiz.html `pairs` array.
 * Do not paraphrase question text.
 */
export const hollandPairs: readonly HollandPair[] = [
  {
    prompt: "Which sounds more like a good afternoon?",
    logic:
      "R vs I — Contrasts hands-on physical activity with curiosity-driven mental exploration. Leisure framing is more honest than work framing, especially for users with limited work experience.",
    A: { text: "Taking something apart to see how it works, then putting it back together", type: "R" },
    B: { text: "Researching a topic you know nothing about until you actually understand it", type: "I" },
  },
  {
    prompt: "You have to give a presentation. Which would you rather present?",
    logic:
      'A vs C — Contrasts expressive/creative output with organized/structured output. The presentation context is universal and removes the "I don\'t like presenting" objection.',
    A: { text: "Something you created — a design, a piece of writing, or an original idea", type: "A" },
    B: { text: "A well-organized report with clear data, findings, and recommendations", type: "C" },
  },
  {
    prompt: "Which kind of problem feels more satisfying to solve?",
    logic:
      "S vs E — Contrasts helping an individual with achieving a goal through persuasion or strategy. Both are people-oriented but in fundamentally different ways.",
    A: { text: "Helping someone work through a difficult situation until they feel better about it", type: "S" },
    B: { text: "Convincing a group of people to get behind an idea you believe in", type: "E" },
  },
  {
    prompt: "Which workday would feel more rewarding at 5pm?",
    logic:
      "R vs C — Both are concrete and practical but diverge on physical vs. administrative. Catches people who score high on both R and C, common in skilled trades with supervisory roles.",
    A: { text: "You built, fixed, or made something tangible with your hands", type: "R" },
    B: { text: "You organized, processed, and cleared a complex backlog of work", type: "C" },
  },
  {
    prompt: "Which would you rather spend a week doing?",
    logic:
      'I vs A — Both are intellectual but diverge on analytical vs. expressive. Key differentiator between scientists/analysts and designers/writers who both say they "like creative work".',
    A: { text: "Running experiments and analysing the results to test a hypothesis", type: "I" },
    B: { text: "Creating something original — a film, a game, a piece of music, or a story", type: "A" },
  },
  {
    prompt: "At a team meeting, which role feels most natural?",
    logic:
      "E vs S — Both are social but diverge on leadership/influence vs. support/cohesion. Meeting context is relatable across all age groups and work experience levels.",
    A: { text: "Driving the agenda, making decisions, and keeping people accountable", type: "E" },
    B: { text: "Making sure everyone's voice is heard and the team stays on the same page", type: "S" },
  },
  {
    prompt: "Which environment would you thrive in most?",
    logic:
      "R vs S — Physical/outdoor vs. people-facing/service. Also feeds directly into the Work Setting question that follows the interest section.",
    A: { text: "Outdoors, on a job site, in a workshop, or somewhere hands-on and physical", type: "R" },
    B: { text: "In a school, clinic, community centre, or anywhere you're helping people directly", type: "S" },
  },
  {
    prompt: "Which sounds more interesting to figure out?",
    logic:
      "I vs E — Contrasts analytical problem-solving with strategic/competitive thinking. Both attract high achievers but for very different reasons.",
    A: { text: "Why something works the way it does — the underlying science or logic", type: "I" },
    B: { text: "How to outmanoeuvre a competitor or win in a high-stakes situation", type: "E" },
  },
  {
    prompt: "Which kind of feedback feels more meaningful?",
    logic:
      "A vs S — Feedback framing reveals intrinsic motivation more reliably than direct questions about values. Contrasts creative recognition with helping recognition.",
    A: { text: '"That piece you made really moved me — it was genuinely original"', type: "A" },
    B: { text: '"I don\'t know what I would have done without your help — you really made a difference"', type: "S" },
  },
  {
    prompt: "You have a free afternoon to learn something new. You pick:",
    logic:
      "C vs I — Both involve learning but diverge on structured/procedural vs. open-ended/exploratory. Low-stakes framing that works well across all personas.",
    A: { text: "A skill with a clear process — bookkeeping, coding syntax, a new software tool", type: "C" },
    B: { text: "A concept you don't fully understand — quantum physics, economics, how the brain works", type: "I" },
  },
  {
    prompt: "Which achievement would you be prouder of?",
    logic:
      "E vs C — Achievement framing surfaces identity more honestly than activity preference. Contrasts ambitious/entrepreneurial with precise/reliable.",
    A: { text: "Building something from nothing and turning it into a success", type: "E" },
    B: { text: "Running something flawlessly — zero errors, every detail exactly right", type: "C" },
  },
  {
    prompt: "Which sounds like a better use of your brain?",
    logic:
      "R vs A — The tiebreaker pair, placed last. Both are hands-on but diverge on technical/mechanical vs. expressive/aesthetic. Resolves ties between these two types which frequently co-occur.",
    A: { text: "Mastering a technical skill — welding, engineering, piloting, coding hardware", type: "R" },
    B: { text: "Developing a creative voice — a visual style, a writing tone, a musical sound", type: "A" },
  },
];

export const HOLLAND_PAIR_COUNT = hollandPairs.length;

export const INTEREST_QUESTION_IDS = Array.from({ length: HOLLAND_PAIR_COUNT }, (_, i) => `INTEREST_${i + 1}`) as readonly string[];

export function interestIndexFromQuestionId(qId: string): number | null {
  const m = /^INTEREST_(\d+)$/.exec(qId);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (n < 1 || n > HOLLAND_PAIR_COUNT) return null;
  return n - 1;
}
