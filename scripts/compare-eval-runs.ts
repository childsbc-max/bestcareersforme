/**
 * Compare top-career SOC order between two scoring output directories (same fixture filenames).
 *
 * Usage (from bestjobforme/):
 *   npx.cmd tsx scripts/compare-eval-runs.ts --baseline-dir eval-runs/baseline-2026-04-08 --candidate-dir eval-runs/post-transfer-2026-04-08
 *   npx.cmd tsx scripts/compare-eval-runs.ts --baseline-dir ... --candidate-dir ... --out reports/compare.txt
 */

import fs from "fs";
import path from "path";

import { parseArgs, getString, getInt } from "./eval/cli-utils";

type ScoringFile = {
  takerId?: string;
  displayName?: string;
  personaId?: string;
  topCareers?: Array<{ socRaw?: string; name?: string }>;
};

function socKey(c: { socRaw?: string }): string {
  return String(c.socRaw ?? "").trim();
}

function main() {
  const args = parseArgs(process.argv);
  const baselineDir = getString(args, "baseline-dir", "");
  const candidateDir = getString(args, "candidate-dir", "");
  const topN = getInt(args, "top", 20);
  const outPath = getString(args, "out", "");

  if (!baselineDir || !candidateDir) {
    console.error(
      "Usage: tsx scripts/compare-eval-runs.ts --baseline-dir <dir> --candidate-dir <dir> [--top 20] [--out report.txt]"
    );
    process.exit(1);
  }

  const absBase = path.isAbsolute(baselineDir) ? baselineDir : path.join(process.cwd(), baselineDir);
  const absCand = path.isAbsolute(candidateDir) ? candidateDir : path.join(process.cwd(), candidateDir);

  if (!fs.existsSync(absBase) || !fs.existsSync(absCand)) {
    console.error("baseline-dir or candidate-dir does not exist.");
    process.exit(1);
  }

  const files = fs
    .readdirSync(absBase)
    .filter((f) => f.endsWith(".scoring.json"))
    .sort();

  const lines: string[] = [];
  lines.push(`Baseline: ${absBase}`);
  lines.push(`Candidate: ${absCand}`);
  lines.push(`Comparing top ${topN} SOCs per taker.\n`);

  let totalDiffRanks = 0;

  for (const f of files) {
    const pb = path.join(absBase, f);
    const pc = path.join(absCand, f);
    if (!fs.existsSync(pc)) {
      lines.push(`MISSING in candidate: ${f}\n`);
      continue;
    }

    const b = JSON.parse(fs.readFileSync(pb, "utf8")) as ScoringFile;
    const c = JSON.parse(fs.readFileSync(pc, "utf8")) as ScoringFile;

    const label = [b.displayName, b.takerId].filter(Boolean).join(" · ") || f.replace(/\.scoring\.json$/i, "");
    const baseSocs = (b.topCareers || []).slice(0, topN).map(socKey);
    const candSocs = (c.topCareers || []).slice(0, topN).map(socKey);

    const baseSet = new Set(baseSocs);
    const candSet = new Set(candSocs);
    const added = candSocs.filter((s) => s && !baseSet.has(s));
    const removed = baseSocs.filter((s) => s && !candSet.has(s));

    let diffAtRank = 0;
    const rankLines: string[] = [];
    for (let i = 0; i < topN; i++) {
      const bs = baseSocs[i] ?? "";
      const cs = candSocs[i] ?? "";
      if (bs !== cs) {
        diffAtRank++;
        rankLines.push(`  #${i + 1}: ${bs || "(empty)"} → ${cs || "(empty)"}`);
      }
    }

    totalDiffRanks += diffAtRank;

    lines.push(`## ${label}`);
    lines.push(`Persona (baseline/candidate): ${b.personaId ?? "?"} / ${c.personaId ?? "?"}`);
    if (diffAtRank === 0 && added.length === 0 && removed.length === 0) {
      lines.push(`Top ${topN} SOC order: identical.`);
    } else {
      if (diffAtRank > 0) {
        lines.push(`Rank changes at ${diffAtRank} position(s):`);
        rankLines.forEach((x) => lines.push(x));
      }
      if (added.length || removed.length) {
        lines.push(`Set diff (top ${topN}): +${[...new Set(added)].join(", ") || "none"} | -${[...new Set(removed)].join(", ") || "none"}`);
      }
    }
    lines.push("");
  }

  lines.push(`Total rank-position differences (sum): ${totalDiffRanks}`);
  const report = lines.join("\n");
  if (outPath) {
    const absOut = path.isAbsolute(outPath) ? outPath : path.join(process.cwd(), outPath);
    fs.mkdirSync(path.dirname(absOut), { recursive: true });
    fs.writeFileSync(absOut, report, "utf8");
    console.error(`Wrote ${absOut}`);
  }
  console.log(report);
}

main();
