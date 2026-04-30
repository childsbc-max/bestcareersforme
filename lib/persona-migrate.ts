import type { Answers } from "@/lib/types";

/** Legacy persona P5 was merged into P4 — map stored answers + keys. */
const P5_TO_P4_ANSWER_KEYS: [string, string][] = [
  ["P5_EDU_LEVEL", "P4_EDU_LEVEL"],
  ["P5_EDU_COMPLETED", "P4_EDU_COMPLETED"],
  ["P5_MAJOR", "P4_MAJOR"],
  ["P5_MAJOR_SCOPE", "P4_MAJOR_SCOPE"],
  ["P5_EDU_INTEREST_MAJORS", "P4_EDU_INTEREST_MAJORS"],
  ["P5_EDU_CEIL", "P4_EDU_CEIL"],
  ["P5_EDU_OPEN", "P4_EDU_OPEN"],
];

export function migratePersonaAnswers(input: Answers): Answers {
  const pid = (input.personaId as { value?: string } | undefined)?.value;
  if (pid !== "P5") return input;

  const next = { ...(input as Record<string, unknown>) } as Record<string, unknown>;
  next.personaId = { value: "P4" };

  for (const [from, to] of P5_TO_P4_ANSWER_KEYS) {
    if (next[from] != null && next[to] == null) {
      next[to] = next[from];
    }
    delete next[from];
  }

  const scope = next.P4_MAJOR_SCOPE as { mapping?: Record<string, unknown> } | undefined;
  const m = scope?.mapping;
  if (m && m.p5MajorScope != null && m.p4MajorScope == null) {
    m.p4MajorScope = m.p5MajorScope;
    delete m.p5MajorScope;
  }

  return next as Answers;
}
