/**
 * Run production scoring on synthetic (or captured) quiz specs.
 *
 * Usage (from bestjobforme/):
 *   npx tsx scripts/run-scoring-benchmark.ts --in synthetic-spec.jsonl --topK 20 --out-dir ./eval-runs/run-001
 */

import fs from "fs";
import path from "path";

import type { Answers, Career, CareerData, QuizData } from "@/lib/types";
import { buildSkillFootprintVector, skillTechAffinity, useSkillAffinityPath } from "@/lib/skill-neighborhoods";
import { resolveTransferabilityScore } from "@/lib/transferability";
import { normalizeJobSocList, normalizeSoc, scoreAndRankCareersWithDebug } from "@/lib/scoring";
import { initialResultsPrefsFromAnswers, prepareAnswersForScoring, stripQuizSalaryAi } from "@/lib/results-preferences";

import { buildAnswersSummary, truncateText } from "./eval/answer-summary";
import { parseArgs, getString, getInt, resolveTakerId, takerFilePrefix } from "./eval/cli-utils";

type SpecLine = {
  /** Unique key; used for output filenames (sanitized). Use a short slug if `displayName` has duplicates. */
  takerId?: string;
  /** Human label for spreadsheets / review (e.g. quiz taker’s name). Omit or "" if unused. */
  displayName?: string;
  personaId: string;
  scenarioTitle: string;
  scenarioRationale?: string;
  answers: Answers;
};

function loadJson<T>(p: string): T {
  return JSON.parse(fs.readFileSync(p, "utf8")) as T;
}

function defaultOutDir(): string {
  const iso = new Date().toISOString().replace(/[:.]/g, "-");
  return path.join(process.cwd(), "eval-runs", iso);
}

function parseOutDirArg(raw: string): string {
  if (raw.includes("<timestamp>")) {
    return raw.replace("<timestamp>", new Date().toISOString().replace(/[:.]/g, "-"));
  }
  return raw;
}

function main() {
  const args = parseArgs(process.argv);
  const inputPath = getString(args, "in", "");
  const topK = getInt(args, "topK", 20);
  const outDirRaw = getString(args, "out-dir", "");
  const outDir = parseOutDirArg(outDirRaw || defaultOutDir());

  if (!inputPath) {
    console.error("Missing --in <path-to.jsonl>");
    process.exit(1);
  }

  const quizPath = path.join(process.cwd(), "data", "quiz-data.json");
  const careersPath = path.join(process.cwd(), "data", "careers.json");
  const statePath = path.join(process.cwd(), "data", "stateDemand.json");
  const relatedPath = path.join(process.cwd(), "data", "relatedOccupations.json");
  const onetPath = path.join(process.cwd(), "data", "onet-by-soc.json");
  const transferPath = path.join(process.cwd(), "data", "transferability-neighbors.json");
  const skillNeighborhoodsPath = path.join(process.cwd(), "data", "skill-neighborhoods.json");

  const quizData = loadJson<QuizData>(quizPath);
  const careers = loadJson<Career[]>(careersPath);
  const stateDemand = loadJson<CareerData["stateDemand"]>(statePath);
  const careerData: CareerData = {
    careers,
    stateDemand,
    transferability: loadJson<CareerData["transferability"]>(transferPath),
    skillNeighborhoods: fs.existsSync(skillNeighborhoodsPath)
      ? loadJson<NonNullable<CareerData["skillNeighborhoods"]>>(skillNeighborhoodsPath)
      : undefined,
    onetBySoc: loadJson<CareerData["onetBySoc"]>(onetPath),
    relatedOccupations: loadJson<CareerData["relatedOccupations"]>(relatedPath),
  };

  const rawLines = fs.readFileSync(inputPath, "utf8").split(/\r?\n/).filter((l) => l.trim());

  fs.mkdirSync(outDir, { recursive: true });

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    let spec: SpecLine;
    try {
      spec = JSON.parse(line) as SpecLine;
    } catch (e) {
      console.error(`Invalid JSON on line ${i + 1}: ${(e as Error).message}`);
      process.exit(1);
    }
    const takerId = resolveTakerId(spec, i + 1);
    const prefix = takerFilePrefix(takerId);

    const prefs = initialResultsPrefsFromAnswers(spec.answers);
    const scoringAnswers = prepareAnswersForScoring(stripQuizSalaryAi(spec.answers), prefs);
    const { results, debug } = scoreAndRankCareersWithDebug(scoringAnswers, quizData, careerData);
    const personaIdVal = (spec.answers.personaId as { value?: string } | undefined)?.value;
    const jobSocs = normalizeJobSocList(spec.answers);
    const skillFootprint =
      useSkillAffinityPath(careerData, jobSocs, personaIdVal)
        ? buildSkillFootprintVector(careerData.skillNeighborhoods, jobSocs)
        : null;
    const slice = results.slice(0, topK).map((c: Career & { hollandScore: number }) => {
      const skillAffinity =
        skillFootprint && careerData.skillNeighborhoods
          ? skillTechAffinity(careerData.skillNeighborhoods, skillFootprint, c.soc)
          : undefined;
      return {
        socRaw: c.soc,
        socNormalized: normalizeSoc(c.soc),
        name: c.name,
        medianSalary: c.medianSalary,
        educationRequirements: c.educationRequirements,
        hollandScore: c.hollandScore,
        transferabilityScore: resolveTransferabilityScore(careerData, jobSocs, personaIdVal, c),
        skillAffinity,
        jobDescription: truncateText(c.jobDescription, 400),
      };
    });

    const payload = {
      takerId,
      displayName: spec.displayName?.trim() || "",
      personaId: spec.personaId,
      scenarioTitle: spec.scenarioTitle,
      scenarioRationale: spec.scenarioRationale,
      answersSummary: buildAnswersSummary(scoringAnswers),
      debug,
      topCareers: slice,
    };

    fs.writeFileSync(path.join(outDir, `${prefix}.scoring.json`), JSON.stringify(payload, null, 2), "utf8");
  }

  const meta = {
    inputPath,
    outDir,
    topK,
    rowCount: rawLines.length,
    quizPath,
    careersPath,
    statePath,
    relatedPath,
    onetPath,
    transferPath,
    skillNeighborhoodsPath,
    skillNeighborhoodsLoaded: fs.existsSync(skillNeighborhoodsPath),
  };
  fs.writeFileSync(path.join(outDir, "run-meta.json"), JSON.stringify(meta, null, 2), "utf8");
  console.log(`Wrote ${rawLines.length} scoring file(s) to ${outDir}`);
}

main();
