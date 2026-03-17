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

function applyHardFilters(careers: Career[], answers: Answers, careerData: CareerData): Career[] {
  let result = [...careers];

  // Persona 2: scope results based on current job and direction
  const personaId = (answers.personaId as any)?.value as string | undefined;
  if (personaId === "P2") {
    const currentSoc = (answers.P2_JOB as any)?.mapping?.soc as string | undefined;
    const majorGroup = currentSoc ? normalizeSoc(currentSoc).slice(0, 2) : undefined;
    const direction = (answers.P2_DIRECTION as any)?.mapping?.p2Direction as string | undefined;
    if (majorGroup && (direction === "grow" || direction === "adjacent")) {
      result = result.filter((c) => normalizeSoc(c.soc).startsWith(majorGroup));
    }
  }

  const salaryFloor = (answers.Q5 as any)?.mapping?.salaryFloor as number | undefined;
  if (salaryFloor != null) {
    result = result.filter((c) => (c.salaryLow || 0) >= salaryFloor);
  }

  // Education ceiling (P1/P2): if user is NOT open to more education, ceiling = completed (assume high school).
  if (personaId === "P1" || personaId === "P2") {
    const completed = "highschool";
    const open =
      personaId === "P2"
        ? ((answers.P2_EDU_OPEN as any)?.mapping?.openToMoreEducation as boolean | undefined)
        : ((answers.P1_EDU_OPEN as any)?.mapping?.openToMoreEducation as boolean | undefined);
    const ceiling =
      open === true
        ? (personaId === "P2"
            ? ((answers.P2_EDU_CEIL as any)?.mapping?.educationCeiling as string | undefined)
            : ((answers.P1_EDU_CEIL as any)?.mapping?.educationCeiling as string | undefined))
        : completed;

    const ceilingRank = educationRankFromKey(ceiling);
    if (ceilingRank != null) {
      result = result.filter((c) => {
        const reqRank = educationRankFromRequirement(c.educationRequirements || "");
        return reqRank == null ? true : reqRank <= ceilingRank;
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

function educationRankFromRequirement(req: string): number | null {
  const r = String(req || "").toLowerCase();
  if (!r) return null;
  if (r.includes("high school")) return 0;
  if (r.includes("certificate")) return 1;
  if (r.includes("associate")) return 2;
  if (r.includes("bachelor")) return 3;
  if (r.includes("master")) return 4;
  if (r.includes("doctoral") || r.includes("phd") || r.includes("jd") || r.includes("md")) return 5;
  return null;
}

function applyAiExclusions(careers: Career[], answers: Answers): Career[] {
  const aiScale = ((answers.Q9 as any)?.mapping?.aiToleranceScale ?? 3) as number;
  const aiRisk = (c: Career) => Number(c.aiReplacementRisk || 0);

  if (aiScale === 5) return careers.filter((c) => aiRisk(c) <= 30);
  if (aiScale === 4) return careers.filter((c) => aiRisk(c) <= 50);
  return careers;
}

function applySoftPenalties(careers: Career[], answers: Answers): Array<Career & { _softPenalty: number }> {
  const workSetting = (answers.Q2 as any)?.mapping?.workSetting as string | undefined;
  const peopleMin = (answers.Q3 as any)?.mapping?.peopleContactMin as number | undefined;
  const peopleMax = (answers.Q3 as any)?.mapping?.peopleContactMax as number | undefined;
  const peopleRanges = (answers.Q3 as any)?.mapping?.peopleContactRanges as Array<{ min: number; max: number }> | undefined;
  const physicalLevel = (answers.Q4 as any)?.mapping?.physicalDemandLevel as string | undefined;
  const physicalLevels = (answers.Q4 as any)?.mapping?.physicalDemandLevels as string[] | undefined;

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
    p2Direction?: string;
    p2MajorGroup?: string;
    salaryFloor?: number;
    stateAbbr?: string;
    willingToRelocate?: boolean;
    p2EducationCeiling?: string;
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
  const p2Direction = (answers.P2_DIRECTION as any)?.mapping?.p2Direction as string | undefined;
  const p2Soc = (answers.P2_JOB as any)?.mapping?.soc as string | undefined;
  const p2MajorGroup = p2Soc ? normalizeSoc(p2Soc).slice(0, 2) : undefined;

  const salaryFloor = (answers.Q5 as any)?.mapping?.salaryFloor as number | undefined;
  const stateAbbr = (answers.Q6 as any)?.value as string | undefined;
  const willingToRelocate = (answers.Q7 as any)?.mapping?.willingToRelocate as boolean | undefined;

  const openEdu = (answers.P2_EDU_OPEN as any)?.mapping?.openToMoreEducation as boolean | undefined;
  const eduCeiling = personaId === "P2"
    ? (openEdu === true ? ((answers.P2_EDU_CEIL as any)?.mapping?.educationCeiling as string | undefined) : "highschool")
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
      p2Direction,
      p2MajorGroup,
      salaryFloor,
      stateAbbr,
      willingToRelocate,
      p2EducationCeiling: eduCeiling,
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

