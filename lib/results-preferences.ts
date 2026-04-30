import type { Answers } from "@/lib/types";

/** sessionStorage key for optional salary / AI filters on the results page */
export const RESULTS_PREFS_STORAGE_KEY = "bestcareerfor.me:results_prefs:v1";

/**
 * Salary / AI are configured on the results screen, not in the quiz.
 * `null` means “no preference” — salary: no floor; AI: omit Q9 so scoring defaults to scale 3.
 */
export type ResultsPreferenceOverrides = {
  salaryMin: number | null;
  aiToleranceScale: number | null;
};

/** Remove legacy quiz answers for Q5/Q9 so scoring uses results prefs only. */
export function stripQuizSalaryAi(answers: Answers): Answers {
  const o = { ...(answers as Record<string, unknown>) };
  delete o.Q5;
  delete o.Q9;
  return o as Answers;
}

function readLegacySalaryMin(answers: Answers): number | null {
  const m = (answers.Q5 as { mapping?: { salaryMin?: number } } | undefined)?.mapping?.salaryMin;
  return typeof m === "number" && !Number.isNaN(m) ? m : null;
}

function readLegacyAiScale(answers: Answers): number | null {
  const s = (answers.Q9 as { mapping?: { aiToleranceScale?: number } } | undefined)?.mapping?.aiToleranceScale;
  return typeof s === "number" && s >= 1 && s <= 5 ? s : null;
}

/** Seed prefs from legacy stored answers when session has no prefs yet. */
export function initialResultsPrefsFromAnswers(answers: Answers): ResultsPreferenceOverrides {
  return {
    salaryMin: readLegacySalaryMin(answers),
    aiToleranceScale: readLegacyAiScale(answers),
  };
}

/**
 * Build the answer object passed into scoring: strips quiz Q5/Q9, then applies results-page prefs.
 * Salary uses **minimum only** (no max). `salaryMin` null or ≤0 → no salary floor.
 */
export function prepareAnswersForScoring(
  answers: Answers,
  prefs: ResultsPreferenceOverrides | null
): Answers {
  const base = stripQuizSalaryAi(answers);
  if (prefs == null) return base;
  const out = { ...base } as Record<string, unknown>;
  if (prefs.salaryMin != null && prefs.salaryMin > 0) {
    out.Q5 = { text: "", mapping: { salaryMin: prefs.salaryMin } };
  }
  if (prefs.aiToleranceScale != null && prefs.aiToleranceScale >= 1 && prefs.aiToleranceScale <= 5) {
    out.Q9 = { text: "", mapping: { aiToleranceScale: prefs.aiToleranceScale } };
  }
  return out as Answers;
}

/** Bands aligned with the former quiz Q5 options (floor only). */
export const SALARY_MIN_OPTIONS: { label: string; value: number | null }[] = [
  { label: "No minimum", value: null },
  { label: "At least $50,000", value: 50_000 },
  { label: "At least $80,000", value: 80_000 },
  { label: "At least $120,000", value: 120_000 },
];

export const AI_TOLERANCE_OPTIONS: { label: string; value: number | null }[] = [
  { label: "Default (neutral)", value: null },
  { label: "1 — High tolerance for AI-related change", value: 1 },
  { label: "2 — Somewhat comfortable adapting", value: 2 },
  { label: "3 — Neutral", value: 3 },
  { label: "4 — Prefer limited AI impact", value: 4 },
  { label: "5 — Avoid AI-impacted fields", value: 5 },
];
