import type {
  Career,
  CareerData,
  OnetBySoc,
  OnetRecord,
  OnetSkillEntry,
  RelatedOccRow,
  TransferabilityNeighbor,
  TransferabilityTable,
} from "@/lib/types";

/** Same logic as `normalizeSoc` in scoring (keep in sync). */
export function normalizeSocKey(soc: string | undefined | null): string {
  if (!soc) return "";
  const s = String(soc).trim();
  return s.replace(/\.\d+$/, "");
}

/** MVP weights (sum = 1). Redistributed when a signal is missing. */
export const TRANSFERABILITY_WEIGHTS = {
  skills: 0.35,
  tech: 0.25,
  description: 0.3,
  graph: 0.1,
} as const;

const STOPWORDS = new Set(
  `a an the and or for to of in on at by with from as is are was were be been being this that these those it its their may can will would should could other such than into over also using use used plan direct coordinate`.split(
    /\s+/
  )
);

/** Skills considered too generic for overlap (O*NET-style names). */
const GENERIC_SKILL_NAMES = new Set(
  [
    "active listening",
    "speaking",
    "reading comprehension",
    "writing",
    "critical thinking",
    "social perceptiveness",
    "coordination",
    "persuasion",
    "negotiation",
    "instructing",
    "service orientation",
    "judgment and decision making",
    "time management",
    "monitoring",
    "learning strategies",
    "complex problem solving",
    "management of personnel resources",
  ].map((s) => s.toLowerCase())
);

function tokenizeDescription(text: string | undefined): Set<string> {
  const out = new Set<string>();
  if (!text) return out;
  const parts = text.toLowerCase().split(/[^a-z0-9+.#]+/);
  for (const p of parts) {
    if (p.length < 3) continue;
    if (STOPWORDS.has(p)) continue;
    out.add(p);
  }
  return out;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const x of a) {
    if (b.has(x)) inter++;
  }
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

function skillKey(s: OnetSkillEntry): string {
  const id = s.id?.trim();
  if (id) return id.toLowerCase();
  return (s.name || "").trim().toLowerCase();
}

/** Weighted overlap: sum min(importance) / sum max(importance) per shared skill; falls back to Jaccard on keys. */
export function skillsOverlap(
  a: OnetSkillEntry[] | undefined,
  b: OnetSkillEntry[] | undefined
): number {
  if (!a?.length || !b?.length) return 0;
  const mapA = new Map<string, number>();
  for (const e of a) {
    const k = skillKey(e);
    if (!k || GENERIC_SKILL_NAMES.has(k)) continue;
    const imp = e.importance != null && e.importance > 0 ? e.importance : 3;
    mapA.set(k, Math.max(mapA.get(k) || 0, imp));
  }
  const mapB = new Map<string, number>();
  for (const e of b) {
    const k = skillKey(e);
    if (!k || GENERIC_SKILL_NAMES.has(k)) continue;
    const imp = e.importance != null && e.importance > 0 ? e.importance : 3;
    mapB.set(k, Math.max(mapB.get(k) || 0, imp));
  }
  if (mapA.size === 0 || mapB.size === 0) return 0;
  let num = 0;
  let den = 0;
  const allKeys = new Set([...mapA.keys(), ...mapB.keys()]);
  for (const k of allKeys) {
    const va = mapA.get(k) || 0;
    const vb = mapB.get(k) || 0;
    if (va > 0 && vb > 0) num += Math.min(va, vb);
    den += Math.max(va, vb);
  }
  return den === 0 ? 0 : Math.min(1, num / den);
}

export function techOverlap(a: string[] | undefined, b: string[] | undefined): number {
  if (!a?.length || !b?.length) return 0;
  const setA = new Set(a.map((t) => t.trim().toLowerCase()).filter(Boolean));
  const setB = new Set(b.map((t) => t.trim().toLowerCase()).filter(Boolean));
  return jaccard(setA, setB);
}

export function careerJobDescTokens(c: Career): Set<string> {
  return tokenizeDescription(c.jobDescription);
}

export function descriptionOverlapFromSets(a: Set<string>, b: Set<string>): number {
  return jaccard(a, b);
}

export function descriptionOverlap(cA: Career, cB: Career): number {
  return descriptionOverlapFromSets(careerJobDescTokens(cA), careerJobDescTokens(cB));
}

export function buildRelatedAdjacency(
  relatedByRawSoc: Record<string, RelatedOccRow[]>
): Map<string, Set<string>> {
  const adj = new Map<string, Set<string>>();
  function addEdge(x: string, y: string) {
    if (!adj.has(x)) adj.set(x, new Set());
    if (!adj.has(y)) adj.set(y, new Set());
    adj.get(x)!.add(y);
    adj.get(y)!.add(x);
  }
  for (const [raw, rows] of Object.entries(relatedByRawSoc || {})) {
    const a = normalizeSocKey(raw);
    if (!a) continue;
    for (const row of rows || []) {
      const b = normalizeSocKey(row.soc);
      if (b) addEdge(a, b);
    }
  }
  return adj;
}

/** BFS shortest path length up to maxHops; 0 = same node, unreachable = 0 (caller checks !== toNorm). */
export function shortestHopDistance(
  adj: Map<string, Set<string>>,
  fromNorm: string,
  toNorm: string,
  maxHops = 3
): number {
  if (fromNorm === toNorm) return 0;
  if (!adj.has(fromNorm) || !adj.has(toNorm)) return 0;
  const visited = new Set<string>([fromNorm]);
  let frontier = new Set<string>([fromNorm]);
  for (let d = 1; d <= maxHops; d++) {
    const next = new Set<string>();
    for (const n of frontier) {
      for (const m of adj.get(n) || []) {
        if (m === toNorm) return d;
        if (!visited.has(m)) {
          visited.add(m);
          next.add(m);
        }
      }
    }
    frontier = next;
    if (frontier.size === 0) break;
  }
  return 0;
}

export function graphProximityFromAdj(
  adj: Map<string, Set<string>>,
  fromNorm: string,
  toNorm: string
): number {
  const hops = shortestHopDistance(adj, fromNorm, toNorm, 3);
  if (hops === 1) return 1;
  if (hops === 2) return 0.55;
  if (hops === 3) return 0.18;
  return 0;
}

export function graphProximityScore(
  fromNorm: string,
  toNorm: string,
  relatedByRawSoc: Record<string, RelatedOccRow[]>
): number {
  const adj = buildRelatedAdjacency(relatedByRawSoc);
  return graphProximityFromAdj(adj, fromNorm, toNorm);
}

export type TransferabilityComponents = {
  skillsMatch: number;
  techMatch: number;
  descriptionMatch: number;
  graphMatch: number;
  combined: number;
};

export function computeTransferabilityPair(
  from: Career,
  to: Career,
  onetFrom: OnetRecord | undefined,
  onetTo: OnetRecord | undefined,
  relatedByRawSoc: Record<string, RelatedOccRow[]>,
  sharedAdj?: Map<string, Set<string>>,
  descriptionMatchOverride?: number
): TransferabilityComponents {
  const fromNorm = normalizeSocKey(from.soc);
  const toNorm = normalizeSocKey(to.soc);

  let skillsMatch = skillsOverlap(onetFrom?.topSkills, onetTo?.topSkills);
  let techMatch = techOverlap(onetFrom?.hotTechnologies, onetTo?.hotTechnologies);
  const descriptionMatch =
    descriptionMatchOverride != null ? descriptionMatchOverride : descriptionOverlap(from, to);
  const graphMatch = sharedAdj
    ? graphProximityFromAdj(sharedAdj, fromNorm, toNorm)
    : graphProximityScore(fromNorm, toNorm, relatedByRawSoc);

  let wS: number = TRANSFERABILITY_WEIGHTS.skills;
  let wT: number = TRANSFERABILITY_WEIGHTS.tech;
  let wD: number = TRANSFERABILITY_WEIGHTS.description;
  let wG: number = TRANSFERABILITY_WEIGHTS.graph;

  const hasSkills = Boolean(onetFrom?.topSkills?.length && onetTo?.topSkills?.length);
  const hasTech = Boolean(onetFrom?.hotTechnologies?.length && onetTo?.hotTechnologies?.length);

  if (!hasSkills) {
    const r = wS;
    wS = 0;
    wD += r * 0.55;
    wG += r * 0.45;
  }
  if (!hasTech) {
    const r = wT;
    wT = 0;
    wD += r * 0.65;
    wG += r * 0.35;
  }

  const wSum = wS + wT + wD + wG;
  const combined =
    wSum > 0
      ? (wS * skillsMatch + wT * techMatch + wD * descriptionMatch + wG * graphMatch) / wSum
      : descriptionMatch;

  return {
    skillsMatch,
    techMatch,
    descriptionMatch,
    graphMatch,
    combined: Math.max(0, Math.min(1, combined)),
  };
}

export function getOnetRecord(onet: OnetBySoc | undefined, rawSoc: string): OnetRecord | undefined {
  if (!onet) return undefined;
  return onet[rawSoc] || onet[normalizeSocKey(rawSoc)];
}

export function lookupPrecomputedTransferability(
  table: TransferabilityTable | undefined,
  fromNorm: string,
  toRawSoc: string
): number | undefined {
  if (!table?.bySourceSoc) return undefined;
  const row = table.bySourceSoc[fromNorm];
  if (!row?.length) return undefined;
  const toN = normalizeSocKey(toRawSoc);
  const hit = row.find((e) => normalizeSocKey(e.soc) === toN);
  return hit?.score;
}

/**
 * Transferability [0,1] from one past-job SOC to a candidate.
 * Uses precomputed neighbors when available; otherwise full MVP pair score (description + graph + optional O*NET).
 */
export function resolveTransferabilityOneJob(
  careerData: CareerData,
  fromRaw: string,
  candidate: Career
): number {
  if (!fromRaw || !candidate.soc) return 0;
  const fromNorm = normalizeSocKey(fromRaw);
  const pre = lookupPrecomputedTransferability(careerData.transferability, fromNorm, candidate.soc);
  if (pre != null) return pre;
  const fromC = (careerData.careers || []).find((x) => normalizeSocKey(x.soc) === fromNorm);
  if (!fromC) return 0;
  const related = careerData.relatedOccupations || {};
  const onF = getOnetRecord(careerData.onetBySoc, fromC.soc);
  const onT = getOnetRecord(careerData.onetBySoc, candidate.soc);
  return computeTransferabilityPair(fromC, candidate, onF, onT, related).combined;
}

/**
 * Best transferability [0,1] from any listed past-job SOC to the candidate (multi-job).
 * `personaId` is unused but kept for call-site compatibility.
 */
export function resolveTransferabilityScore(
  careerData: CareerData,
  jobSocsRaw: string[],
  _personaId: string | undefined,
  candidate: Career
): number {
  if (!jobSocsRaw.length) return 0;
  let best = 0;
  for (const fromRaw of jobSocsRaw) {
    best = Math.max(best, resolveTransferabilityOneJob(careerData, fromRaw, candidate));
  }
  return best;
}

/** Penalty reduction 0–22 from transferability [0,1] (tie-break strength). */
export function transferabilityPenaltyDelta(score01: number): number {
  return Math.round(Math.min(22, Math.max(0, score01) * 22));
}
