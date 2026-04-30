/**
 * Precompute job transferability neighbors (offline).
 * Reads careers.json, relatedOccupations.json, onet-by-soc.json (optional).
 *
 * Usage (from bestjobforme/): npx tsx scripts/build-transferability.ts
 */

import fs from "fs";
import path from "path";

import type { Career, OnetBySoc, RelatedOccRow, TransferabilityNeighbor } from "@/lib/types";
import {
  buildRelatedAdjacency,
  careerJobDescTokens,
  computeTransferabilityPair,
  descriptionOverlapFromSets,
  getOnetRecord,
  normalizeSocKey,
} from "@/lib/transferability";

const TOP_K = 80;

function main() {
  const root = process.cwd();
  const careersPath = path.join(root, "data", "careers.json");
  const relatedPath = path.join(root, "data", "relatedOccupations.json");
  const onetPath = path.join(root, "data", "onet-by-soc.json");
  const outPath = path.join(root, "data", "transferability-neighbors.json");

  const careers = JSON.parse(fs.readFileSync(careersPath, "utf8")) as Career[];
  const related = JSON.parse(fs.readFileSync(relatedPath, "utf8")) as Record<string, RelatedOccRow[]>;
  let onet: OnetBySoc = {};
  try {
    onet = JSON.parse(fs.readFileSync(onetPath, "utf8")) as OnetBySoc;
  } catch {
    onet = {};
  }

  const adj = buildRelatedAdjacency(related);
  const tokensBySoc = new Map<string, Set<string>>();
  for (const c of careers) {
    if (c.soc) tokensBySoc.set(c.soc, careerJobDescTokens(c));
  }

  const bySourceSoc: Record<string, TransferabilityNeighbor[]> = {};

  for (const from of careers) {
    if (!from.soc) continue;
    const fromNorm = normalizeSocKey(from.soc);
    const onF = getOnetRecord(onet, from.soc);
    const scored: TransferabilityNeighbor[] = [];

    for (const to of careers) {
      if (!to.soc || to.soc === from.soc) continue;
      const onT = getOnetRecord(onet, to.soc);
      const descMatch = descriptionOverlapFromSets(
        tokensBySoc.get(from.soc) || new Set(),
        tokensBySoc.get(to.soc) || new Set()
      );
      const { combined } = computeTransferabilityPair(from, to, onF, onT, related, adj, descMatch);
      if (combined <= 0.001) continue;
      scored.push({ soc: to.soc, score: Math.round(combined * 10000) / 10000 });
    }

    scored.sort((a, b) => b.score - a.score);
    bySourceSoc[fromNorm] = scored.slice(0, TOP_K);
  }

  const payload = {
    version: 1,
    generatedAt: new Date().toISOString(),
    topK: TOP_K,
    bySourceSoc,
  };

  fs.writeFileSync(outPath, JSON.stringify(payload), "utf8");
  console.log(`Wrote ${outPath} (${Object.keys(bySourceSoc).length} source SOCs, up to ${TOP_K} neighbors each).`);
}

main();
