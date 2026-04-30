/**
 * Build skill + technology vectors (IDF-weighted, L2-normalized) and k-means neighborhoods.
 * Reads data/onet-by-soc.json + data/careers.json (for SOC list validation).
 *
 * Usage: npx tsx scripts/build-skill-neighborhoods.ts
 */

import fs from "fs";
import path from "path";

import type { Career, OnetBySoc, OnetSkillEntry, SkillNeighborhoodBundle } from "@/lib/types";

const GENERIC_NAMES = new Set(
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
  ].map((s) => s.toLowerCase())
);

function normSoc(s: string): string {
  return String(s || "")
    .trim()
    .replace(/\.\d+$/, "");
}

function skillKey(e: OnetSkillEntry): string {
  const id = e.id?.trim();
  if (id) return id;
  const n = (e.name || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
  return n ? `n:${n}` : "";
}

function importance(e: OnetSkillEntry): number {
  return e.importance != null && e.importance > 0 ? e.importance : 3;
}

function normalizeTech(t: string): string {
  return String(t || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function l2Normalize(v: Record<string, number>): Record<string, number> {
  let s = 0;
  for (const x of Object.values(v)) s += x * x;
  const n = Math.sqrt(s);
  if (n < 1e-12) return v;
  const out: Record<string, number> = {};
  for (const [k, x] of Object.entries(v)) out[k] = x / n;
  return out;
}

/** [-1, 1] from SOC string so unrelated jobs don't share cosine 1 when O*NET skill lists match. */
function socVectorSalt01(rawSoc: string): number {
  let h = 0;
  const s = String(rawSoc);
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h / 0xffffffff;
}

function cosine(a: Record<string, number>, b: Record<string, number>): number {
  let d = 0;
  for (const k of Object.keys(a)) d += (a[k] || 0) * (b[k] || 0);
  return d;
}

function addVec(target: Record<string, number>, src: Record<string, number>, scale: number) {
  for (const [k, v] of Object.entries(src)) target[k] = (target[k] || 0) + v * scale;
}

function main() {
  const root = process.cwd();
  const onetPath = path.join(root, "data", "onet-by-soc.json");
  const careersPath = path.join(root, "data", "careers.json");
  const outPath = path.join(root, "data", "skill-neighborhoods.json");

  const onet = JSON.parse(fs.readFileSync(onetPath, "utf8")) as OnetBySoc;
  const careers = JSON.parse(fs.readFileSync(careersPath, "utf8")) as Career[];

  const occKeys = Object.keys(onet).filter((k) => onet[k]?.topSkills?.length || onet[k]?.hotTechnologies?.length);
  if (occKeys.length === 0) {
    const empty: SkillNeighborhoodBundle = {
      version: 1,
      tau: 0.12,
      lambdaSkill: 0.72,
      minPoolAfterGate: 5,
      socVectors: {},
      socTechnologies: {},
    };
    fs.writeFileSync(outPath, JSON.stringify({ ...empty, generatedAt: new Date().toISOString() }), "utf8");
    console.log("No O*NET rows in onet-by-soc.json; wrote empty skill-neighborhoods.json");
    return;
  }

  // Document frequency
  const df = new Map<string, number>();
  for (const soc of occKeys) {
    const row = onet[soc]!;
    const seen = new Set<string>();
    for (const e of row.topSkills || []) {
      const k = skillKey(e);
      if (!k || GENERIC_NAMES.has((e.name || "").trim().toLowerCase())) continue;
      seen.add(k);
    }
    for (const k of seen) df.set(k, (df.get(k) || 0) + 1);
  }

  const N = occKeys.length;
  const idf = new Map<string, number>();
  for (const [k, c] of df.entries()) {
    idf.set(k, Math.log((N + 1) / (c + 1)));
  }

  const socVectors: Record<string, Record<string, number>> = {};
  const socTechnologies: Record<string, string[]> = {};

  for (const rawSoc of occKeys) {
    const row = onet[rawSoc]!;
    let vec: Record<string, number> = {};
    for (const e of row.topSkills || []) {
      const k = skillKey(e);
      if (!k) continue;
      const nm = (e.name || "").trim().toLowerCase();
      if (GENERIC_NAMES.has(nm)) continue;
      const w = importance(e) * (idf.get(k) || 0);
      if (w > 0) vec[k] = (vec[k] || 0) + w;
    }
    // If generic + IDF leaves 0–1 dimensions, many SOCs collapse to the same unit vector
    // (skill cosine = 1 for unrelated careers). Fall back to importance-weighted full list.
    if (Object.keys(vec).length < 2) {
      vec = {};
      for (const e of row.topSkills || []) {
        const k = skillKey(e);
        if (!k) continue;
        vec[k] = (vec[k] || 0) + importance(e);
      }
    }
    let normed = l2Normalize(vec);
    if (Object.keys(normed).length > 0) {
      const salt = 1e-4 * (socVectorSalt01(rawSoc) * 2 - 1);
      normed = l2Normalize({ ...normed, __soc_salt: salt });
      socVectors[rawSoc] = normed;
      socVectors[normSoc(rawSoc)] = normed;
    }
    const tech = [...new Set((row.hotTechnologies || []).map(normalizeTech).filter(Boolean))];
    if (tech.length > 0) {
      socTechnologies[rawSoc] = tech;
      socTechnologies[normSoc(rawSoc)] = tech;
    }
  }

  const vectorsList = occKeys
    .map((s) => ({ soc: s, v: socVectors[s] }))
    .filter((x) => x.v && Object.keys(x.v).length > 0);
  const nVec = vectorsList.length;
  const K = Math.max(4, Math.min(48, Math.floor(Math.sqrt(nVec / 2)) + 8));

  // Spherical k-means (cosine): init from random occupation vectors
  const rng = (s: number) => () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const rand = rng(42);
  const centroids: Record<string, number>[] = [];
  const picked = new Set<number>();
  while (centroids.length < K && picked.size < nVec) {
    const idx = Math.floor(rand() * nVec);
    if (picked.has(idx)) continue;
    picked.add(idx);
    centroids.push({ ...vectorsList[idx]!.v });
  }

  const assign = new Map<string, number>();
  for (let iter = 0; iter < 12; iter++) {
    assign.clear();
    for (const { soc, v } of vectorsList) {
      let best = 0;
      let bestSim = -1;
      for (let k = 0; k < centroids.length; k++) {
        const sim = cosine(v, centroids[k]!);
        if (sim > bestSim) {
          bestSim = sim;
          best = k;
        }
      }
      assign.set(soc, best);
    }
    // Update centroids: mean then L2 normalize
    const sums: Record<string, number>[] = centroids.map(() => ({}));
    const counts = new Array(K).fill(0);
    for (const { soc, v } of vectorsList) {
      const k = assign.get(soc)!;
      counts[k]++;
      addVec(sums[k]!, v, 1);
    }
    for (let k = 0; k < K; k++) {
      const c = counts[k];
      if (c === 0) continue;
      const avg: Record<string, number> = {};
      for (const [key, val] of Object.entries(sums[k]!)) avg[key] = val / c;
      centroids[k] = l2Normalize(avg);
    }
  }

  const socToNeighborhoods: Record<string, Array<{ k: number; sim: number }>> = {};
  const neighborhoods: SkillNeighborhoodBundle["neighborhoods"] = [];

  for (let k = 0; k < K; k++) {
    const cen = centroids[k]!;
    const scored = vectorsList
      .map(({ soc, v }) => ({ soc, sim: cosine(v, cen) }))
      .sort((a, b) => b.sim - a.sim)
      .slice(0, 5);
    const topSkills = Object.entries(cen)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([sk]) => sk);
    neighborhoods!.push({ k, topSkills, exemplarSocs: scored.map((x) => x.soc) });
  }

  for (const { soc, v } of vectorsList) {
    const sims: Array<{ k: number; sim: number }> = [];
    for (let k = 0; k < K; k++) {
      sims.push({ k, sim: cosine(v, centroids[k]!) });
    }
    sims.sort((a, b) => b.sim - a.sim);
    socToNeighborhoods[soc] = sims.slice(0, 3);
    socToNeighborhoods[normSoc(soc)] = sims.slice(0, 3);
  }

  const bundle: SkillNeighborhoodBundle & { generatedAt: string; kMeansK: number } = {
    version: 1,
    generatedAt: new Date().toISOString(),
    kMeansK: K,
    tau: 0.1,
    lambdaSkill: 0.72,
    minPoolAfterGate: 5,
    socVectors,
    socTechnologies,
    neighborhoods,
    socToNeighborhoods,
  };

  fs.writeFileSync(outPath, JSON.stringify(bundle), "utf8");
  console.log(`Wrote ${outPath} (${Object.keys(socVectors).length / 2 | 0} SOCs with vectors, K=${K}).`);
  void careers;
}

main();
