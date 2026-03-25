import type { Answers, Career, CareerData, HollandLetter, QuizData } from "@/lib/types";

export function normalizeSoc(soc: string | undefined | null): string {
  if (!soc) return "";
  const s = String(soc).trim();
  return s.replace(/\.\d+$/, "");
}

export function computeHollandTop3(answers: Answers, quizData: QuizData): HollandLetter[] {
  const counts: Record<HollandLetter, number> = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
  for (const q of quizData.hollandQuestions || []) {
    const ans = answers[q.id];
    const text = typeof ans === "string" ? ans : (ans as any)?.text;
    if (!text) continue;
    const option = q.answers.find((a) => a.text === text);
    if (option?.hollandType) counts[option.hollandType]++;
  }
  return (Object.entries(counts) as Array<[HollandLetter, number]>)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([letter]) => letter);
}

export function scoreHolland(career: Career, top3: HollandLetter[]): number {
  const code = (career.hollandCode || "").toUpperCase();
  if (!code || top3.length === 0) return 0;
  let score = 0;
  for (let i = 0; i < 3 && i < code.length; i++) {
    const pos = top3.indexOf(code[i] as HollandLetter);
    if (pos === 0) score += 3;
    else if (pos === 1) score += 2;
    else if (pos === 2) score += 1;
  }
  return score;
}

export type MultiMajorQuestionId =
  | "P3_MAJOR"
  | "P4_MAJOR"
  | "P5_MAJOR"
  | "P1_EDU_INTEREST_MAJORS"
  | "P3_EDU_INTEREST_MAJORS"
  | "P4_EDU_INTEREST_MAJORS"
  | "P5_EDU_INTEREST_MAJORS";

export function readPrimaryMajorsForQuestion(answers: Answers, qId: MultiMajorQuestionId): string[] {
  const mapping = (answers[qId] as any)?.mapping as Record<string, unknown> | undefined;
  if (!mapping) return [];
  const list = mapping.primaryMajors;
  if (Array.isArray(list) && list.length > 0) {
    return list.map((x) => String(x).trim()).filter(Boolean).slice(0, 4);
  }
  const legacy = mapping.primaryMajor;
  if (typeof legacy === "string" && legacy.trim()) return [legacy.trim()];
  return [];
}

function unionMajors(a: string[], b: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of [...a, ...b]) {
    const s = String(raw || "").trim();
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    if (out.length >= 4) break;
  }
  return out;
}

function majorsMatchCareerSuggestedMajors(userMajors: string[], careerSuggestedMajors: string | undefined): boolean {
  if (userMajors.length === 0) return true;
  const suggested = (careerSuggestedMajors || "")
    .split("|")
    .map((m) => m.trim().toLowerCase())
    .filter(Boolean);
  if (suggested.length === 0) return true;
  return userMajors.some((raw) => {
    const userMajor = String(raw || "").trim().toLowerCase();
    if (!userMajor) return false;
    return suggested.some((s) => s.includes(userMajor) || userMajor.includes(s));
  });
}

function effectiveMajorsForPersona(answers: Answers, personaId: string | undefined): string[] {
  if (!personaId) return [];
  if (personaId === "P1") {
    const open = (answers.P1_EDU_OPEN as any)?.mapping?.openToMoreEducation as boolean | undefined;
    if (open !== true) return [];
    return readPrimaryMajorsForQuestion(answers, "P1_EDU_INTEREST_MAJORS");
  }
  if (personaId === "P3") {
    const base = readPrimaryMajorsForQuestion(answers, "P3_MAJOR");
    const open = (answers.P3_EDU_OPEN as any)?.mapping?.openToMoreEducation as boolean | undefined;
    const interest = open === true ? readPrimaryMajorsForQuestion(answers, "P3_EDU_INTEREST_MAJORS") : [];
    return unionMajors(base, interest);
  }
  if (personaId === "P4") {
    const base = readPrimaryMajorsForQuestion(answers, "P4_MAJOR");
    const open = (answers.P4_EDU_OPEN as any)?.mapping?.openToMoreEducation as boolean | undefined;
    const interest = open === true ? readPrimaryMajorsForQuestion(answers, "P4_EDU_INTEREST_MAJORS") : [];
    return unionMajors(base, interest);
  }
  if (personaId === "P5") {
    const base = readPrimaryMajorsForQuestion(answers, "P5_MAJOR");
    const open = (answers.P5_EDU_OPEN as any)?.mapping?.openToMoreEducation as boolean | undefined;
    const interest = open === true ? readPrimaryMajorsForQuestion(answers, "P5_EDU_INTEREST_MAJORS") : [];
    return unionMajors(base, interest);
  }
  return [];
}

function applyHardFilters(careers: Career[], answers: Answers, careerData: CareerData): Career[] {
  let result = [...careers];

  const personaId = (answers.personaId as any)?.value as string | undefined;

  // P1: when open to more education, filter toward intended areas of study (OR)
  if (personaId === "P1") {
    const p1Majors = effectiveMajorsForPersona(answers, personaId);
    if (p1Majors.length > 0) {
      result = result.filter((c) => majorsMatchCareerSuggestedMajors(p1Majors, c.suggestedMajors));
    }
  }

  // Persona 4: scope to related careers — use suggestedMajors overlap so Biology teacher doesn't get Architecture
  if (personaId === "P4") {
    const currentSoc = (answers.P4_JOB as any)?.mapping?.soc as string | undefined;
    if (currentSoc) {
      // If user is open to more education and picked interest majors, broaden scope:
      // keep careers adjacent to current job OR careers aligned with intended study areas.
      const p4Open = (answers.P4_EDU_OPEN as any)?.mapping?.openToMoreEducation as boolean | undefined;
      const p4InterestedMajors =
        p4Open === true ? readPrimaryMajorsForQuestion(answers, "P4_EDU_INTEREST_MAJORS") : [];

      const currentCareer = (careerData.careers || []).find(
        (c) => normalizeSoc(c.soc) === normalizeSoc(currentSoc)
      );
      const currentMajors = (currentCareer?.suggestedMajors || "")
        .split("|")
        .map((m) => m.trim().toLowerCase())
        .filter(Boolean);

      // 1) Job-adjacent set (existing behavior)
      let jobScoped: typeof result = [...result];
      let byOverlap: typeof result = [];
      if (currentMajors.length > 0) {
        byOverlap = jobScoped.filter((c) => {
          const suggested = (c.suggestedMajors || "")
            .split("|")
            .map((m) => m.trim().toLowerCase())
            .filter(Boolean);
          return suggested.some((s) => currentMajors.some((cm) => s.includes(cm) || cm.includes(s)));
        });
        if (byOverlap.length > 0) jobScoped = byOverlap;
      }
      const useSocFallback = currentMajors.length === 0 || byOverlap.length === 0;
      if (useSocFallback) {
        const broadPrefix = normalizeSoc(currentSoc).slice(0, 6);
        if (broadPrefix.length >= 5) {
          jobScoped = jobScoped.filter((c) => normalizeSoc(c.soc).startsWith(broadPrefix));
        } else {
          const majorGroup = normalizeSoc(currentSoc).slice(0, 2);
          jobScoped = jobScoped.filter((c) => normalizeSoc(c.soc).startsWith(majorGroup));
        }
      }

      // 2) Interested-majors set (new behavior; broadens beyond current SOC neighborhood)
      if (p4InterestedMajors.length > 0) {
        const interestScoped = result.filter((c) =>
          majorsMatchCareerSuggestedMajors(p4InterestedMajors, c.suggestedMajors)
        );
        const bySoc = new Map<string, Career>();
        for (const c of jobScoped) bySoc.set(normalizeSoc(c.soc), c);
        for (const c of interestScoped) bySoc.set(normalizeSoc(c.soc), c);
        result = Array.from(bySoc.values());
      } else {
        result = jobScoped;
      }

      // P4: filter by user's majors (OR) — keep careers that align with any selected field of study
      const p4Majors = effectiveMajorsForPersona(answers, personaId);
      if (p4Majors.length > 0) {
        result = result.filter((c) => majorsMatchCareerSuggestedMajors(p4Majors, c.suggestedMajors));
      }
    }
  }

  const salaryFloor = (answers.Q5 as any)?.mapping?.salaryFloor as number | undefined;
  if (salaryFloor != null) {
    result = result.filter((c) => {
      const meanSalary = c.medianSalary ?? 0;
      return meanSalary >= salaryFloor;
    });
  }

  // Education ceiling (P1/P3/P4/P5): if user is NOT open to more education, ceiling = completed.
  // P4/P5 use *_EDU_COMPLETED when answered; P3 assumes bachelor's; P1 assumes high school.
  if (personaId === "P1" || personaId === "P3" || personaId === "P4" || personaId === "P5") {
    const completed =
      personaId === "P4"
        ? ((answers.P4_EDU_COMPLETED as any)?.mapping?.educationCompleted as string | undefined) ?? "bachelor"
        : personaId === "P5"
        ? ((answers.P5_EDU_COMPLETED as any)?.mapping?.educationCompleted as string | undefined) ?? "bachelor"
        : personaId === "P3"
        ? "bachelor"
        : "highschool";
    const open =
      personaId === "P1"
        ? ((answers.P1_EDU_OPEN as any)?.mapping?.openToMoreEducation as boolean | undefined)
        : personaId === "P4"
        ? ((answers.P4_EDU_OPEN as any)?.mapping?.openToMoreEducation as boolean | undefined)
        : personaId === "P5"
        ? ((answers.P5_EDU_OPEN as any)?.mapping?.openToMoreEducation as boolean | undefined)
        : ((answers.P3_EDU_OPEN as any)?.mapping?.openToMoreEducation as boolean | undefined);
    const ceiling =
      open === true
        ? (personaId === "P1"
            ? ((answers.P1_EDU_CEIL as any)?.mapping?.educationCeiling as string | undefined)
            : personaId === "P4"
            ? ((answers.P4_EDU_CEIL as any)?.mapping?.educationCeiling as string | undefined)
            : personaId === "P5"
            ? ((answers.P5_EDU_CEIL as any)?.mapping?.educationCeiling as string | undefined)
            : ((answers.P3_EDU_CEIL as any)?.mapping?.educationCeiling as string | undefined))
        : completed;

    const ceilingRank = educationRankFromKey(ceiling);
    if (ceilingRank != null) {
      result = result.filter((c) => {
        const reqRank = educationRankFromRequirement(c.educationRequirements || "");
        return reqRank == null ? true : reqRank <= ceilingRank;
      });
    }
  }

  // P3: when "qualified now", exclude careers requiring more experience than user has
  if (personaId === "P3") {
    const qualifiedNow = (answers.P3_QUALIFIED_NOW as any)?.mapping?.p3QualifiedNow as boolean | undefined;
    const expLevel = (answers.P3_EXPERIENCE as any)?.mapping?.p3ExperienceLevel as string | undefined;
    if (qualifiedNow === true) {
      const userLevel =
        expLevel === "none" ? 0 :
        expLevel === "little" ? 1 :
        expLevel === "some" ? 2 :
        expLevel === "significant" ? 3 :
        0; // default to none when qualified-now but experience unknown
      const maxReqLevel = Math.min(userLevel + 1, 4);
      result = result.filter((c) => {
        const reqLevel = experienceRankFromRequirement((c as any).experienceRequirements || "");
        return reqLevel == null || reqLevel <= maxReqLevel;
      });
    }
  }

  const willingToRelocate = (answers.Q7 as any)?.mapping?.willingToRelocate as boolean | undefined;
  const stateAbbr = (answers.Q6 as any)?.value as string | undefined;
  if (willingToRelocate === false && stateAbbr) {
    const badLevels = ["Low", "Below Average"];
    const excludedSocs = new Set<string>();
    for (const row of careerData.stateDemand || []) {
      if (
        (row.stateAbbr === stateAbbr || row.state === stateAbbr) &&
        badLevels.includes(row.demandLevel || "")
      ) {
        excludedSocs.add(normalizeSoc(row.soc));
      }
    }
    result = result.filter((c) => !excludedSocs.has(normalizeSoc(c.soc)));
  }

  return result;
}

function educationRankFromKey(key: string | undefined): number | null {
  if (!key) return null;
  const k = key.toLowerCase();
  if (k.includes("high")) return 0;
  if (k.includes("cert")) return 1;
  if (k.includes("assoc")) return 2;
  if (k.includes("bach")) return 3;
  if (k.includes("mast")) return 4;
  if (k.includes("doc")) return 5;
  return null;
}

export function educationRankFromRequirement(req: string): number | null {
  const r = String(req || "").toLowerCase();
  if (!r) return null;
  if (r.includes("high school")) return 0;
  if (r.includes("certificate")) return 1;
  if (r.includes("associate")) return 2;
  if (r.includes("bachelor")) return 3;
  if (r.includes("master")) return 4;
  // Doctoral, JD, MD, First Professional Degree (law, medicine, etc.)
  if (
    r.includes("doctoral") ||
    r.includes("phd") ||
    r.includes("jd") ||
    r.includes("md") ||
    r.includes("first professional") ||
    r.includes("professional degree")
  )
    return 5;
  return null;
}

export function experienceRankFromRequirement(req: string): number | null {
  const r = String(req || "").toLowerCase();
  if (!r) return 0;
  if (r.includes("none") || r.includes("no experience")) return 0;
  if (r.includes("0-1") || r.includes("0-2") || r.includes("1-2") || r.includes("3-6 months") || r.includes("6 months")) return 1;
  if (r.includes("2-4")) return 2;
  if (r.includes("4-6")) return 3;
  // 6+ years: explicit + or "over X" or "X or more" or "more than X"
  if (r.includes("6+") || r.includes("7+") || r.includes("8+") || r.includes("9+") || r.includes("10+")) return 4;
  if (/over\s*(6|7|8|9|\d{2,})/.test(r)) return 4;
  if (r.includes("6 or more") || r.includes("7 or more") || r.includes("8 or more") || r.includes("10 or more")) return 4;
  if (/more\s+than\s+(5|6|7|8|9|\d{2,})\s*years?/.test(r)) return 4;
  return null;
}

function applyAiExclusions(careers: Career[], answers: Answers): Career[] {
  const aiScale = ((answers.Q9 as any)?.mapping?.aiToleranceScale ?? 3) as number;
  const aiRisk = (c: Career) => Number(c.aiReplacementRisk || 0);

  if (aiScale === 5) return careers.filter((c) => aiRisk(c) <= 30);
  if (aiScale === 4) return careers.filter((c) => aiRisk(c) <= 50);
  return careers;
}

/** How many of the user's major strings match the career's suggested majors list (OR semantics; each major counts at most once). */
export function countSuggestedMajorMatches(suggestedMajorsRaw: string | undefined, userMajors: string[]): number {
  if (!suggestedMajorsRaw || userMajors.length === 0) return 0;
  const suggested = String(suggestedMajorsRaw).toLowerCase();
  let count = 0;
  for (const raw of userMajors) {
    const major = String(raw || "").trim().toLowerCase();
    if (!major) continue;
    let matches = suggested.includes(major);
    if (!matches && major === "accounting") {
      matches = /finance|economics|business analytics/.test(suggested);
    }
    if (matches) count++;
  }
  return count;
}

function applySoftPenalties(careers: Career[], answers: Answers): Array<Career & { _softPenalty: number }> {
  const personaId = (answers.personaId as any)?.value as string | undefined;
  const workSetting = (answers.Q2 as any)?.mapping?.workSetting as string | undefined;
  const peopleMin = (answers.Q3 as any)?.mapping?.peopleContactMin as number | undefined;
  const peopleMax = (answers.Q3 as any)?.mapping?.peopleContactMax as number | undefined;
  const peopleRanges = (answers.Q3 as any)?.mapping?.peopleContactRanges as Array<{ min: number; max: number }> | undefined;
  const physicalLevel = (answers.Q4 as any)?.mapping?.physicalDemandLevel as string | undefined;
  const physicalLevels = (answers.Q4 as any)?.mapping?.physicalDemandLevels as string[] | undefined;

  const p3MajorScope = (answers.P3_MAJOR_SCOPE as any)?.mapping?.p3MajorScope as string | undefined;
  const p3Majors = personaId === "P3" ? effectiveMajorsForPersona(answers, personaId) : [];
  const p5Majors = personaId === "P5" ? effectiveMajorsForPersona(answers, personaId) : [];
  const p5MajorScope = (answers.P5_MAJOR_SCOPE as any)?.mapping?.p5MajorScope as string | undefined;
  const p5EduCompletedKey = (answers.P5_EDU_COMPLETED as any)?.mapping?.educationCompleted as string | undefined;
  const p5CompletedRank = personaId === "P5" ? educationRankFromKey(p5EduCompletedKey) : null;
  const p3QualifiedNow = (answers.P3_QUALIFIED_NOW as any)?.mapping?.p3QualifiedNow as boolean | undefined;
  const p3ExperienceLevel = (answers.P3_EXPERIENCE as any)?.mapping?.p3ExperienceLevel as string | undefined;

  const multiMajors =
    personaId === "P3" ? p3Majors : personaId === "P5" ? p5Majors : [];
  const multiScope =
    personaId === "P3" ? p3MajorScope : personaId === "P5" ? p5MajorScope : undefined;

  return careers.map((c) => {
    let penalty = 0;

    if (workSetting && c.workSetting) {
      const ws = (c.workSetting || "").toLowerCase();
      if (workSetting === "indoors") {
        if (!/office|indoor/i.test(ws)) penalty += 25;
      } else if (workSetting === "outdoors") {
        if (!/outdoor/i.test(ws)) penalty += 25;
      } else if (workSetting === "mix_required") {
        if (!/mixed/i.test(ws)) penalty += 25;
      }
      // mix -> no penalty
    }

    if ((c.peopleContactScore != null || c.peopleContactScore === 0) && (peopleRanges?.length || (peopleMin != null && peopleMax != null))) {
      const score = Number(c.peopleContactScore || 0);
      if (peopleRanges?.length) {
        const ok = peopleRanges.some((r) => score >= r.min && score <= r.max);
        if (!ok) penalty += 20;
      } else if (peopleMin != null && peopleMax != null) {
        if (score < peopleMin || score > peopleMax) penalty += 20;
      }
    }

    if ((physicalLevels?.length || physicalLevel) && c.physicalDemandLevel) {
      const pd = (c.physicalDemandLevel || "").toLowerCase();
      const matchesPreferred = (preferred: string) =>
        (preferred.includes("highly") && /highly|active/i.test(pd)) ||
        (preferred.includes("moderately") && /moderat/i.test(pd)) ||
        (preferred.includes("sedentary") && /sedentary|stationary|desk/i.test(pd));

      if (physicalLevels?.length) {
        const ok = physicalLevels.some((lvl) => matchesPreferred(String(lvl).toLowerCase()));
        if (!ok) penalty += 20;
      } else if (physicalLevel) {
        const preferred = String(physicalLevel).toLowerCase();
        if (!matchesPreferred(preferred)) penalty += 20;
      }
    }

    // Persona 3 / 5: up to four majors — OR match; extra overlap boosts ranking
    if ((personaId === "P3" || personaId === "P5") && multiMajors.length > 0 && c.suggestedMajors) {
      const matchCount = countSuggestedMajorMatches(c.suggestedMajors, multiMajors);
      const matchesAny = matchCount >= 1;
      if (multiScope === "direct") {
        if (!matchesAny) penalty += 40;
        if (matchCount >= 2) penalty -= 12 * (matchCount - 1);
      } else if (multiScope === "adjacent") {
        if (!matchesAny) penalty += 15;
        if (matchCount >= 2) penalty -= 8 * (matchCount - 1);
      } else if (multiScope === "any") {
        if (matchCount >= 2) penalty -= 10 * (matchCount - 1);
      }
    }

    // Persona 3: experience vs. experience requirements — only when user wants "qualified now"
    if (personaId === "P3" && p3QualifiedNow === true && p3ExperienceLevel != null && (c as any).experienceRequirements) {
      const userLevel =
        p3ExperienceLevel === "none" ? 0 :
        p3ExperienceLevel === "little" ? 1 :
        p3ExperienceLevel === "some" ? 2 :
        p3ExperienceLevel === "significant" ? 3 :
        null;
      const reqLevel = experienceRankFromRequirement((c as any).experienceRequirements || "");
      if (userLevel != null && reqLevel != null) {
        if (userLevel === 0 && reqLevel >= 2) {
          penalty += 30;
        } else if (userLevel === 1 && reqLevel >= 3) {
          penalty += 20;
        } else if (userLevel === 2 && reqLevel >= 4) {
          penalty += 20;
        }
      }
    }

    // Persona 3: education alignment — user has bachelor's, so bachelor's-required careers rank higher than high-school-only
    if (personaId === "P3") {
      const reqRank = educationRankFromRequirement(c.educationRequirements || "");
      if (reqRank === 0) {
        // Career requires only high school; user has bachelor's — add soft penalty so bachelor's careers rank higher
        penalty += 10;
      }
      // Bachelor's (3) and above: no penalty
    }

    // Persona 5: same soft nudge when user has completed bachelor's or higher
    if (personaId === "P5" && p5CompletedRank != null && p5CompletedRank >= 3) {
      const reqRank = educationRankFromRequirement(c.educationRequirements || "");
      if (reqRank === 0) penalty += 10;
    }

    return { ...c, _softPenalty: penalty };
  });
}

function applyWeights(
  careers: Array<Career & { _softPenalty: number }>,
  answers: Answers
): Array<Career & { _penalty: number }> {
  const jobMarketWeight = (answers.Q8 as any)?.mapping?.jobMarketWeight as string | undefined;
  const aiScale = ((answers.Q9 as any)?.mapping?.aiToleranceScale ?? 3) as number;

  return careers.map((c) => {
    let penalty = c._softPenalty || 0;

    if (jobMarketWeight === "high" && /low|blank/i.test(c.currentDemand || "")) penalty += 100;
    else if (jobMarketWeight === "medium" && /low/i.test(c.currentDemand || "")) penalty += 30;

    const aiRisk = Number(c.aiReplacementRisk || 0);
    if (aiScale === 5 && aiRisk > 30) penalty += 100;
    else if (aiScale === 5 && aiRisk > 0) penalty += 50;
    else if (aiScale === 4 && aiRisk > 50) penalty += 100;
    else if (aiScale === 4 && aiRisk > 30) penalty += 40;
    else if (aiScale === 3 && aiRisk > 50) penalty += 50;
    else if (aiScale === 2 && aiRisk > 70) penalty += 40;

    return { ...c, _penalty: penalty };
  });
}

export function scoreAndRankCareers(
  answers: Answers,
  quizData: QuizData,
  careerData: CareerData
): Array<Career & { hollandScore: number }> {
  const top3 = computeHollandTop3(answers, quizData);
  let careers: Career[] = careerData.careers || [];

  careers = applyHardFilters(careers, answers, careerData);
  careers = applyAiExclusions(careers, answers);
  const withSoft = applySoftPenalties(careers, answers);
  const withWeights = applyWeights(withSoft, answers);

  return withWeights
    .filter((c) => (c._penalty || 0) < 100)
    .map((c) => ({
      ...c,
      hollandScore: scoreHolland(c, top3),
    }))
    .sort((a, b) => {
      const penaltyDiff = (a._penalty || 0) - (b._penalty || 0);
      if (penaltyDiff !== 0) return penaltyDiff;
      return (b.hollandScore || 0) - (a.hollandScore || 0);
    })
    .map(({ _penalty, ...c }) => c);
}

export type ScoringDebugInfo = {
  counts: {
    start: number;
    afterHardFilters: number;
    afterAiExclusions: number;
    afterPenaltyCut: number;
    final: number;
  };
  applied: {
    personaId?: string;
    p4MajorGroup?: string;
    effectiveMajorsCount?: number;
    salaryFloor?: number;
    stateAbbr?: string;
    willingToRelocate?: boolean;
    eduCeiling?: string;
    aiToleranceScale?: number;
    jobMarketWeight?: string;
  };
};

export function scoreAndRankCareersWithDebug(
  answers: Answers,
  quizData: QuizData,
  careerData: CareerData
): { results: Array<Career & { hollandScore: number }>; debug: ScoringDebugInfo } {
  const personaId = (answers.personaId as any)?.value as string | undefined;
  const effectiveMajorsCount = effectiveMajorsForPersona(answers, personaId).length;

  const salaryFloor = (answers.Q5 as any)?.mapping?.salaryFloor as number | undefined;
  const stateAbbr = (answers.Q6 as any)?.value as string | undefined;
  const willingToRelocate = (answers.Q7 as any)?.mapping?.willingToRelocate as boolean | undefined;

  const p4Soc = (answers.P4_JOB as any)?.mapping?.soc as string | undefined;
  const p4MajorGroup = p4Soc ? normalizeSoc(p4Soc).slice(0, 2) : undefined;
  const eduCeiling =
    personaId === "P4"
      ? ((answers.P4_EDU_OPEN as any)?.mapping?.openToMoreEducation === true
          ? ((answers.P4_EDU_CEIL as any)?.mapping?.educationCeiling as string | undefined)
          : ((answers.P4_EDU_COMPLETED as any)?.mapping?.educationCompleted as string | undefined) ?? "bachelor")
      : personaId === "P5"
      ? ((answers.P5_EDU_OPEN as any)?.mapping?.openToMoreEducation === true
          ? ((answers.P5_EDU_CEIL as any)?.mapping?.educationCeiling as string | undefined)
          : ((answers.P5_EDU_COMPLETED as any)?.mapping?.educationCompleted as string | undefined) ?? "bachelor")
      : undefined;

  const jobMarketWeight = (answers.Q8 as any)?.mapping?.jobMarketWeight as string | undefined;
  const aiToleranceScale = ((answers.Q9 as any)?.mapping?.aiToleranceScale ?? 3) as number;

  const debug: ScoringDebugInfo = {
    counts: {
      start: (careerData.careers || []).length,
      afterHardFilters: 0,
      afterAiExclusions: 0,
      afterPenaltyCut: 0,
      final: 0,
    },
    applied: {
      personaId,
      p4MajorGroup,
      effectiveMajorsCount,
      salaryFloor,
      stateAbbr,
      willingToRelocate,
      eduCeiling,
      aiToleranceScale,
      jobMarketWeight,
    },
  };

  const top3 = computeHollandTop3(answers, quizData);
  let careers: Career[] = careerData.careers || [];

  careers = applyHardFilters(careers, answers, careerData);
  debug.counts.afterHardFilters = careers.length;

  careers = applyAiExclusions(careers, answers);
  debug.counts.afterAiExclusions = careers.length;

  const withSoft = applySoftPenalties(careers, answers);
  const withWeights = applyWeights(withSoft, answers);
  const afterPenaltyCut = withWeights.filter((c) => (c._penalty || 0) < 100);
  debug.counts.afterPenaltyCut = afterPenaltyCut.length;

  const results = afterPenaltyCut
    .map((c) => ({
      ...c,
      hollandScore: scoreHolland(c, top3),
    }))
    .sort((a, b) => {
      const penaltyDiff = (a._penalty || 0) - (b._penalty || 0);
      if (penaltyDiff !== 0) return penaltyDiff;
      return (b.hollandScore || 0) - (a.hollandScore || 0);
    })
    .map(({ _penalty, ...c }) => c);

  debug.counts.final = results.length;
  return { results, debug };
}

