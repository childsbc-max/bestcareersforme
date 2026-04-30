import type { Answers } from "@/lib/types";
import { effectiveMajorsForPersona, readEducationLevel } from "@/lib/scoring";

/** Human-readable bundle for judge prompts and benchmark exports. */
export function buildAnswersSummary(answers: Answers): Record<string, unknown> {
  const personaId = (answers.personaId as { value?: string } | undefined)?.value;
  const q5 = answers.Q5 as { mapping?: { salaryMin?: number } } | undefined;
  const q6 = answers.Q6 as { value?: string } | undefined;
  const q7 = answers.Q7 as { mapping?: { willingToRelocate?: boolean } } | undefined;
  const q8 = answers.Q8 as { mapping?: { jobMarketWeight?: string } } | undefined;
  const q9 = answers.Q9 as { mapping?: { aiToleranceScale?: number } } | undefined;
  const q2 = answers.Q2 as { mapping?: { workSettings?: string[] } } | undefined;
  const q3 = answers.Q3 as { mapping?: { peopleContactRanges?: Array<{ min: number; max: number }> } } | undefined;
  const q4 = answers.Q4 as { mapping?: { physicalDemandLevels?: string[] } } | undefined;

  const p4Job = answers.P4_JOB as { mapping?: { jobs?: Array<{ soc?: string; title?: string }> } } | undefined;
  const jobs = p4Job?.mapping?.jobs;

  const hollandCode = (answers as { hollandCode?: string }).hollandCode;
  const interestKeys = Object.keys(answers).filter((k) => /^INTEREST_\d+$/.test(k));
  const interestMode = interestKeys.length > 0 ? "full-holland (12 pairs)" : hollandCode ? "hollandCode only" : "derived from H* / empty";

  return {
    personaId,
    hollandCode: hollandCode ?? null,
    interestMode,
    educationCompleted: readEducationLevel(answers, personaId) ?? null,
    effectiveMajors: effectiveMajorsForPersona(answers, personaId),
    salaryMin: q5?.mapping?.salaryMin ?? null,
    state: q6?.value ?? null,
    willingToRelocate: q7?.mapping?.willingToRelocate ?? null,
    jobMarketWeight: q8?.mapping?.jobMarketWeight ?? null,
    aiToleranceScale: q9?.mapping?.aiToleranceScale ?? null,
    workSettings: q2?.mapping?.workSettings ?? null,
    peopleContactRanges: q3?.mapping?.peopleContactRanges ?? null,
    physicalDemandLevels: q4?.mapping?.physicalDemandLevels ?? null,
    p4Jobs:
      Array.isArray(jobs) && jobs.length > 0
        ? jobs.map((j) => ({ soc: j.soc ?? null, title: j.title ?? null }))
        : null,
  };
}

export function truncateText(s: string | undefined, maxLen: number): string | undefined {
  if (s == null) return undefined;
  const t = String(s);
  if (t.length <= maxLen) return t;
  return t.slice(0, maxLen) + "…";
}
