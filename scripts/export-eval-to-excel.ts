/**
 * Merge an eval spec (.jsonl) with a scoring output directory → one .xlsx.
 * One row per taker; columns = id/scenario, each answer key, debug counts, ranked careers.
 *
 * Usage (from bestjobforme/):
 *   npx tsx scripts/export-eval-to-excel.ts --spec eval-fixtures/ten-takers.jsonl --scoring-dir eval-runs/ten-latest --out eval-runs/ten-latest/summary.xlsx
 */

import fs from "fs";
import path from "path";

import ExcelJS from "exceljs";

import { parseArgs, getString, resolveTakerId, takerFilePrefix } from "./eval/cli-utils";

type SpecLine = {
  takerId?: string;
  displayName?: string;
  personaId: string;
  scenarioTitle: string;
  scenarioRationale?: string;
  answers: Record<string, unknown>;
};

type TopCareerRow = {
  socRaw?: string;
  name?: string;
  medianSalary?: number;
  educationRequirements?: string;
  hollandScore?: number;
  transferabilityScore?: number;
  skillAffinity?: { combined?: number; skillCos?: number; techJac?: number };
};

function answerCell(val: unknown): string {
  if (val == null) return "";
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  const o = val as Record<string, unknown>;
  if (typeof o.text === "string") return o.text;
  if (o.value != null) return String(o.value);
  try {
    return JSON.stringify(val);
  } catch {
    return String(val);
  }
}

function collectAnswerKeys(specs: SpecLine[]): string[] {
  const set = new Set<string>();
  for (const s of specs) {
    for (const k of Object.keys(s.answers || {})) set.add(k);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

function careerColumnHeaders(maxN: number): string[] {
  const out: string[] = [];
  for (let i = 1; i <= maxN; i++) {
    out.push(
      `career_${i}_soc`,
      `career_${i}_name`,
      `career_${i}_medianSalary`,
      `career_${i}_education`,
      `career_${i}_hollandScore`,
      `career_${i}_transferability`,
      `career_${i}_skillCombined`,
      `career_${i}_skillCos`,
      `career_${i}_techJac`
    );
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv);
  const specPath = getString(args, "spec", "");
  const scoringDir = getString(args, "scoring-dir", "");
  let outPath = getString(args, "out", "");

  if (!specPath || !scoringDir) {
    console.error(
      "Usage: npx tsx scripts/export-eval-to-excel.ts --spec <fixture.jsonl> --scoring-dir <dir> [--out summary.xlsx]"
    );
    process.exit(1);
  }

  const absSpec = path.isAbsolute(specPath) ? specPath : path.join(process.cwd(), specPath);
  const absScoringDir = path.isAbsolute(scoringDir) ? scoringDir : path.join(process.cwd(), scoringDir);

  const lines = fs.readFileSync(absSpec, "utf8").split(/\r?\n/).filter((l) => l.trim());
  const specs: SpecLine[] = [];
  for (let i = 0; i < lines.length; i++) {
    try {
      specs.push(JSON.parse(lines[i]!) as SpecLine);
    } catch (e) {
      console.error(`Bad JSON line ${i + 1}: ${(e as Error).message}`);
      process.exit(1);
    }
  }

  const answerKeys = collectAnswerKeys(specs);
  let maxCareers = 0;

  type ScoringFile = {
    displayName?: string;
    topCareers?: TopCareerRow[];
    debug?: { counts?: Record<string, number> };
  };

  const rowObjects: Record<string, string | number>[] = [];

  for (let si = 0; si < specs.length; si++) {
    const spec = specs[si]!;
    const takerId = resolveTakerId(spec, si + 1);
    const prefix = takerFilePrefix(takerId);
    const scoringPath = path.join(absScoringDir, `${prefix}.scoring.json`);
    if (!fs.existsSync(scoringPath)) {
      console.error(`Missing scoring file: ${scoringPath}`);
      process.exit(1);
    }
    const scoring = JSON.parse(fs.readFileSync(scoringPath, "utf8")) as ScoringFile;
    const top = scoring.topCareers || [];
    maxCareers = Math.max(maxCareers, top.length);

    const row: Record<string, string | number> = {
      name: scoring.displayName?.trim() || spec.displayName?.trim() || "",
      takerId,
      personaId: spec.personaId,
      scenarioTitle: spec.scenarioTitle,
      scenarioRationale: spec.scenarioRationale ?? "",
    };

    for (const k of answerKeys) {
      row[`Q_${k}`] = answerCell(spec.answers[k]);
    }

    const counts = scoring.debug?.counts;
    row.debug_start = counts?.start ?? "";
    row.debug_afterHardFilters = counts?.afterHardFilters ?? "";
    row.debug_afterSkillAffinityGate = counts?.afterSkillAffinityGate ?? "";
    row.debug_afterAiExclusions = counts?.afterAiExclusions ?? "";
    row.debug_afterPenaltyCut = counts?.afterPenaltyCut ?? "";
    row.debug_final = counts?.final ?? "";

    for (let i = 0; i < top.length; i++) {
      const c = top[i]!;
      const n = i + 1;
      row[`career_${n}_soc`] = c.socRaw ?? "";
      row[`career_${n}_name`] = c.name ?? "";
      row[`career_${n}_medianSalary`] = c.medianSalary ?? "";
      row[`career_${n}_education`] = c.educationRequirements ?? "";
      row[`career_${n}_hollandScore`] = c.hollandScore ?? "";
      row[`career_${n}_transferability`] = c.transferabilityScore ?? "";
      const sa = c.skillAffinity;
      row[`career_${n}_skillCombined`] = sa?.combined ?? "";
      row[`career_${n}_skillCos`] = sa?.skillCos ?? "";
      row[`career_${n}_techJac`] = sa?.techJac ?? "";
    }

    rowObjects.push(row);
  }

  const careerHeaders = careerColumnHeaders(maxCareers);
  /** First column is human label (fixture + scoring JSON); header `name` reads clearly in Excel vs `displayName`. */
  const baseCols = ["name", "takerId", "personaId", "scenarioTitle", "scenarioRationale"];
  const qCols = answerKeys.map((k) => `Q_${k}`);
  const debugCols = [
    "debug_start",
    "debug_afterHardFilters",
    "debug_afterSkillAffinityGate",
    "debug_afterAiExclusions",
    "debug_afterPenaltyCut",
    "debug_final",
  ];
  const headers = [...baseCols, ...qCols, ...debugCols, ...careerHeaders];

  for (const row of rowObjects) {
    for (const h of careerHeaders) {
      if (row[h] === undefined) row[h] = "";
    }
  }

  if (!outPath) {
    outPath = path.join(absScoringDir, "summary.xlsx");
  }
  const absOut = path.isAbsolute(outPath) ? outPath : path.join(process.cwd(), outPath);
  fs.mkdirSync(path.dirname(absOut), { recursive: true });

  const wb = new ExcelJS.Workbook();
  wb.creator = "bestjobforme";
  const sheet = wb.addWorksheet("Results", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  sheet.addRow(headers);
  const hr = sheet.getRow(1);
  hr.font = { bold: true };

  for (const rowObj of rowObjects) {
    sheet.addRow(headers.map((h) => rowObj[h] ?? ""));
  }

  headers.forEach((h, idx) => {
    const col = sheet.getColumn(idx + 1);
    let width = 14;
    if (h === "takerId") width = 22;
    if (h === "name") width = 28;
    if (h.includes("_name") || h === "scenarioTitle") width = 36;
    if (h === "scenarioRationale") width = 40;
    if (h.startsWith("Q_")) width = 44;
    if (h.endsWith("_soc")) width = 16;
    col.width = width;
  });

  await wb.xlsx.writeFile(absOut);
  console.error(`Wrote ${absOut} (${specs.length} rows, ${maxCareers} career rank columns max).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
