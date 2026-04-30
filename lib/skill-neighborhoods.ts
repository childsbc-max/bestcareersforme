/**
 * Skill + hot-technology affinity (neighborhood-first model).
 * Uses precomputed sparse vectors from data/skill-neighborhoods.json (see build-skill-neighborhoods.ts).
 */

import type { Career, CareerData, SkillNeighborhoodBundle } from "@/lib/types";

export type { SkillNeighborhoodBundle } from "@/lib/types";

function normSoc(soc: string | undefined | null): string {
  if (!soc) return "";
  return String(soc).trim().replace(/\.\d+$/, "");
}

export function normalizeTechToken(t: string): string {
  return String(t || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function techSetForSoc(bundle: SkillNeighborhoodBundle | undefined, rawSoc: string): Set<string> {
  const s = bundle?.socTechnologies?.[rawSoc] ?? bundle?.socTechnologies?.[normSoc(rawSoc)] ?? [];
  return new Set(s.map(normalizeTechToken).filter(Boolean));
}

function socVectorFor(
  bundle: SkillNeighborhoodBundle | undefined,
  rawSoc: string
): Record<string, number> | undefined {
  if (!bundle?.socVectors) return undefined;
  return bundle.socVectors[rawSoc] ?? bundle.socVectors[normSoc(rawSoc)];
}

function cosineSparse(a: Record<string, number>, b: Record<string, number>): number {
  let dot = 0;
  const keys = Object.keys(a).length <= Object.keys(b).length ? a : b;
  const other = keys === a ? b : a;
  for (const k of Object.keys(keys)) {
    const va = a[k] || 0;
    const vb = b[k] || 0;
    dot += va * vb;
  }
  return Math.max(0, Math.min(1, dot));
}

function jaccardSets(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const x of a) {
    if (b.has(x)) inter++;
  }
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

/** Average normalized job SOC vectors (equal weight). */
export function buildSkillFootprintVector(
  bundle: SkillNeighborhoodBundle | undefined,
  jobSocsRaw: string[]
): { skill: Record<string, number>; tech: Set<string> } | null {
  if (!bundle?.socVectors || jobSocsRaw.length === 0) return null;
  const acc: Record<string, number> = {};
  let count = 0;
  const allTech = new Set<string>();

  for (const raw of jobSocsRaw) {
    const v = socVectorFor(bundle, raw);
    if (v && Object.keys(v).length > 0) {
      count++;
      for (const [k, val] of Object.entries(v)) {
        acc[k] = (acc[k] || 0) + val;
      }
    }
    for (const t of techSetForSoc(bundle, raw)) allTech.add(t);
  }

  if (count === 0) return null;

  for (const k of Object.keys(acc)) {
    acc[k] /= count;
  }
  // L2 normalize footprint
  let norm = 0;
  for (const v of Object.values(acc)) norm += v * v;
  norm = Math.sqrt(norm);
  if (norm > 1e-9) {
    for (const k of Object.keys(acc)) acc[k] /= norm;
  }

  return { skill: acc, tech: allTech };
}

export function skillTechAffinity(
  bundle: SkillNeighborhoodBundle | undefined,
  footprint: { skill: Record<string, number>; tech: Set<string> } | null,
  candidateSoc: string
): { combined: number; skillCos: number; techJac: number } {
  if (!bundle || !footprint) {
    return { combined: 0, skillCos: 0, techJac: 0 };
  }
  const cv = socVectorFor(bundle, candidateSoc);
  const skillCos = cv && Object.keys(cv).length > 0 ? cosineSparse(footprint.skill, cv) : 0;
  const ct = techSetForSoc(bundle, candidateSoc);
  const techJac =
    footprint.tech.size > 0 && ct.size > 0 ? jaccardSets(footprint.tech, ct) : 0;
  const lam = bundle.lambdaSkill ?? 0.72;
  const combined = lam * skillCos + (1 - lam) * techJac;
  return {
    combined: Math.max(0, Math.min(1, combined)),
    skillCos,
    techJac,
  };
}

export function useSkillAffinityPath(
  careerData: CareerData,
  jobSocs: string[],
  _personaId: string | undefined
): boolean {
  const bundle = careerData.skillNeighborhoods;
  if (!bundle?.socVectors || Object.keys(bundle.socVectors).length === 0) return false;
  if (jobSocs.length === 0) return false;
  return jobSocs.some((s) => {
    const v = socVectorFor(bundle, s);
    return v && Object.keys(v).length > 0;
  });
}

/**
 * Intersect pool with skill/tech affinity gate. Relaxes if pool would be tiny.
 * @param tauScale Multiplies bundle `tau` (e.g. &lt; 1 = weaker gate, keeps more careers).
 */
export function applySkillAffinityGate(
  careers: Career[],
  careerData: CareerData,
  jobSocs: string[],
  personaId: string | undefined,
  tauScale = 1
): Career[] {
  if (!useSkillAffinityPath(careerData, jobSocs, personaId)) return careers;

  const bundle = careerData.skillNeighborhoods;
  if (!bundle) return careers;

  const footprint = buildSkillFootprintVector(bundle, jobSocs);
  if (!footprint) return careers;

  const tau = (bundle.tau ?? 0.12) * tauScale;
  const minKeep = bundle.minPoolAfterGate ?? 5;

  const scored = careers.map((c) => ({
    c,
    ...skillTechAffinity(bundle, footprint, c.soc),
  }));

  const passed = scored.filter((x) => {
    const cv = socVectorFor(bundle!, x.c.soc);
    const hasVec = cv && Object.keys(cv).length > 0;
    // Cold-start candidates: no vector → keep in pool
    if (!hasVec) return true;
    return x.combined >= tau;
  });

  if (passed.length >= minKeep) {
    return passed.map((x) => x.c);
  }

  // Relax: lower tau
  const relaxedTau = Math.max(0, tau - 0.06);
  if (relaxedTau < tau) {
    const relaxed = scored.filter((x) => {
      const cv = socVectorFor(bundle!, x.c.soc);
      const hasVec = cv && Object.keys(cv).length > 0;
      if (!hasVec) return true;
      return x.combined >= relaxedTau;
    });
    if (relaxed.length >= minKeep) return relaxed.map((x) => x.c);
  }

  return careers;
}

/** Bonus 0–28 from combined affinity (when skill path active). */
export function skillAffinityPenaltyDelta(combined01: number): number {
  return Math.round(Math.min(28, Math.max(0, combined01) * 28));
}
