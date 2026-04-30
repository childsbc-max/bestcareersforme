/**
 * Aggregate judge outputs into CSV + Markdown; optional baseline vs candidate compare.
 *
 * Usage (from bestjobforme/):
 *   npx tsx scripts/aggregate-report.ts --in-dir ./eval-runs/run-001
 *   npx tsx scripts/aggregate-report.ts --in-dir ./eval-runs/run-002 --baseline ./eval-runs/run-001
 */

import fs from "fs";
import path from "path";

import type { JudgeOutput } from "./eval/judge-schema";
import { parseArgs, getString } from "./eval/cli-utils";

type Row = {
  takerId: string;
  displayName: string;
  personaId: string;
  scenarioTitle: string;
  judge: JudgeOutput;
};

function loadScoringMeta(
  dir: string,
  base: string
): { takerId: string; displayName: string; personaId: string; scenarioTitle: string } {
  const p = path.join(dir, `${base}.scoring.json`);
  if (!fs.existsSync(p)) {
    return { takerId: base, displayName: "", personaId: "", scenarioTitle: "" };
  }
  const j = JSON.parse(fs.readFileSync(p, "utf8")) as {
    takerId?: string;
    displayName?: string;
    personaId?: string;
    scenarioTitle?: string;
  };
  return {
    takerId: j.takerId || base,
    displayName: (j.displayName || "").trim(),
    personaId: j.personaId || "",
    scenarioTitle: j.scenarioTitle || "",
  };
}

function collectRows(dir: string): Row[] {
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".judge-parsed.json"))
    .sort();
  const rows: Row[] = [];
  for (const f of files) {
    const base = f.replace(/\.judge-parsed\.json$/i, "");
    const meta = loadScoringMeta(dir, base);
    const judge = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")) as JudgeOutput;
    rows.push({ ...meta, judge });
  }
  return rows;
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function escapeCsv(s: string): string {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function writeCsv(rows: Row[], outPath: string): void {
  const header =
    "displayName,takerId,personaId,scenarioTitle,overall_quality,constraint_compliance,coherence,diversity,violation_count,unexpected_count,notes";
  const lines = [header];
  for (const r of rows) {
    const j = r.judge;
    lines.push(
      [
        escapeCsv(r.displayName),
        escapeCsv(r.takerId),
        escapeCsv(r.personaId),
        escapeCsv(r.scenarioTitle),
        j.overall_quality_1_to_5,
        j.constraint_compliance_1_to_5,
        j.coherence_1_to_5,
        j.diversity_1_to_5,
        j.constraint_violations.length,
        j.unexpected_inclusions.length,
        escapeCsv(j.notes),
      ].join(",")
    );
  }
  fs.writeFileSync(outPath, lines.join("\n") + "\n", "utf8");
}

function writeJsonl(rows: Row[], outPath: string): void {
  const lines = rows.map((r) =>
    JSON.stringify({
      displayName: r.displayName,
      takerId: r.takerId,
      personaId: r.personaId,
      scenarioTitle: r.scenarioTitle,
      judge: r.judge,
    })
  );
  fs.writeFileSync(outPath, lines.join("\n") + "\n", "utf8");
}

function summaryMd(rows: Row[], title: string, compare?: { baseline: Row[]; labelBase: string; labelCand: string }): string {
  const n = rows.length;
  const overall = avg(rows.map((r) => r.judge.overall_quality_1_to_5));
  const cons = avg(rows.map((r) => r.judge.constraint_compliance_1_to_5));
  const coh = avg(rows.map((r) => r.judge.coherence_1_to_5));
  const div = avg(rows.map((r) => r.judge.diversity_1_to_5));
  const vCount = rows.reduce((a, r) => a + r.judge.constraint_violations.length, 0);

  let md = `# ${title}\n\n`;
  md += `Takers: **${n}** · Avg overall **${overall.toFixed(2)}** · Avg constraint **${cons.toFixed(2)}** · Avg coherence **${coh.toFixed(2)}** · Avg diversity **${div.toFixed(2)}** · Total constraint violations **${vCount}**\n\n`;

  if (compare) {
    const bOverall = avg(compare.baseline.map((r) => r.judge.overall_quality_1_to_5));
    const bCons = avg(compare.baseline.map((r) => r.judge.constraint_compliance_1_to_5));
    const bCoh = avg(compare.baseline.map((r) => r.judge.coherence_1_to_5));
    const bDiv = avg(compare.baseline.map((r) => r.judge.diversity_1_to_5));
    md += `## Compare (${compare.labelCand} vs ${compare.labelBase})\n\n`;
    md += `| Metric | ${compare.labelBase} | ${compare.labelCand} | Δ |\n|---|---|---|---|\n`;
    md += `| Avg overall | ${bOverall.toFixed(2)} | ${overall.toFixed(2)} | ${(overall - bOverall).toFixed(2)} |\n`;
    md += `| Avg constraint | ${bCons.toFixed(2)} | ${cons.toFixed(2)} | ${(cons - bCons).toFixed(2)} |\n`;
    md += `| Avg coherence | ${bCoh.toFixed(2)} | ${coh.toFixed(2)} | ${(coh - bCoh).toFixed(2)} |\n`;
    md += `| Avg diversity | ${bDiv.toFixed(2)} | ${div.toFixed(2)} | ${(div - bDiv).toFixed(2)} |\n\n`;
  }

  md += `## Per taker\n\n`;
  md += `| taker | persona | overall | constraint | notes (trunc.) |\n|---|---|---:|---:|---|\n`;
  for (const r of rows) {
    const note = r.judge.notes.length > 80 ? r.judge.notes.slice(0, 80) + "…" : r.judge.notes;
    const label = r.displayName ? `${r.displayName} (${r.takerId})` : r.takerId;
    md += `| ${label.replace(/\|/g, "\\|")} | ${r.personaId} | ${r.judge.overall_quality_1_to_5} | ${r.judge.constraint_compliance_1_to_5} | ${note.replace(/\|/g, "\\|")} |\n`;
  }
  return md;
}

function main() {
  const args = parseArgs(process.argv);
  const inDir = getString(args, "candidate", "") || getString(args, "in-dir", "");
  const baselineDir = getString(args, "baseline", "");

  if (!inDir || !fs.existsSync(inDir)) {
    console.error("Missing or invalid --in-dir (or --candidate)");
    process.exit(1);
  }

  const rows = collectRows(inDir);
  if (rows.length === 0) {
    console.error(`No *.judge-parsed.json in ${inDir}`);
    process.exit(1);
  }

  let compare: { baseline: Row[]; labelBase: string; labelCand: string } | undefined;
  if (baselineDir && fs.existsSync(baselineDir)) {
    compare = {
      baseline: collectRows(baselineDir),
      labelBase: path.basename(baselineDir),
      labelCand: path.basename(inDir),
    };
  }

  const title = `Evaluation summary — ${path.basename(inDir)}`;
  fs.writeFileSync(path.join(inDir, "summary.md"), summaryMd(rows, title, compare), "utf8");
  writeCsv(rows, path.join(inDir, "summary.csv"));
  writeJsonl(rows, path.join(inDir, "summary.jsonl"));
  console.log(`Wrote summary.md, summary.csv, summary.jsonl (${rows.length} rows) -> ${inDir}`);
}

main();
