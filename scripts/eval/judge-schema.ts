import { z } from "zod";

export const DEFAULT_JUDGE_MODEL = "claude-sonnet-4-20250514";

const violationItem = z.object({
  type: z.string(),
  detail: z.string(),
  career_soc: z.string().nullable().optional(),
});

const unexpectedItem = z.object({
  career_soc: z.string(),
  name: z.string(),
  why_unexpected: z.string(),
});

const missedItem = z.object({
  expected_kind: z.string(),
  detail: z.string(),
});

const suggestItem = z.object({
  change: z.string(),
  expected_effect: z.string(),
  risk: z.string(),
});

export const JudgeOutputSchema = z.object({
  overall_quality_1_to_5: z.number(),
  constraint_compliance_1_to_5: z.number(),
  coherence_1_to_5: z.number(),
  diversity_1_to_5: z.number(),
  constraint_violations: z.array(violationItem),
  unexpected_inclusions: z.array(unexpectedItem),
  missed_expectations: z.array(missedItem),
  suggested_scoring_changes: z.array(suggestItem),
  notes: z.string(),
});

export type JudgeOutput = z.infer<typeof JudgeOutputSchema>;

export const JUDGE_SYSTEM_PROMPT = `You are evaluating career quiz outputs for a product engineering team.

Rules:
- Output ONLY valid JSON matching the provided schema. No markdown, no commentary outside JSON.
- Base your judgment on the provided answers summary and scoring debug. If information is missing, use nulls and explain inside strings.
- Do not critique whether BLS salary/medians are "correct." Focus on fit, internal consistency, and usefulness.
- If education ceiling is bachelor, flag Master's/doctoral-required careers as constraint violations if they appear in top results.
- Prefer specific, testable scoring feedback (e.g., adjust penalty magnitudes, tie-breakers, filter ordering), not generic UX advice.

Rubric:
1) Constraint compliance (hard): salary floor, education ceiling, and persona-specific gates should be respected.
2) Coherence: recommendations should match persona narrative (especially P4 job history / majors / preferences).
3) Job adjacency / transferability: when the user listed past job(s), top results should be plausibly reachable from that experience (skills, tasks, sector), not only major/SOC-prefix neighbors. Use transferabilityScore in the payload when present as a diagnostic, not as ground truth.
4) Diversity: avoid redundant near-duplicates unless justified.
5) Missed expectations: only where filters wouldn't obviously exclude them; otherwise explain the filter rationale briefly.`;

export function stripJsonFences(raw: string): string {
  let s = raw.trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
  }
  return s.trim();
}
