/**
 * Claude judge for scoring benchmark outputs.
 *
 * Usage (from bestjobforme/):
 *   npx tsx scripts/llm-judge.ts --in-dir ./eval-runs/run-001 --model claude-sonnet-4-20250514 --sleep-ms 200
 *   npx tsx scripts/llm-judge.ts --in-dir ./eval-runs/run-001 --mock-judge
 */

import fs from "fs";
import path from "path";

import Anthropic from "@anthropic-ai/sdk";
import dotenv from "dotenv";

import {
  DEFAULT_JUDGE_MODEL,
  JUDGE_SYSTEM_PROMPT,
  JudgeOutputSchema,
  stripJsonFences,
  type JudgeOutput,
} from "./eval/judge-schema";
import { parseArgs, getString, getInt } from "./eval/cli-utils";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config();

type ScoringFile = {
  takerId: string;
  displayName?: string;
  personaId: string;
  scenarioTitle: string;
  scenarioRationale?: string;
  answersSummary: Record<string, unknown>;
  debug: unknown;
  topCareers: Array<{
    socRaw: string;
    socNormalized: string;
    name: string;
    medianSalary: number;
    educationRequirements?: string;
    hollandScore: number;
    transferabilityScore?: number;
    jobDescription?: string;
  }>;
};

const SCHEMA_USER_HINT = `Respond with ONLY this JSON shape (numbers integers 1-5 where noted):
{
  "overall_quality_1_to_5": 0,
  "constraint_compliance_1_to_5": 0,
  "coherence_1_to_5": 0,
  "diversity_1_to_5": 0,
  "constraint_violations": [
    { "type": "string", "detail": "string", "career_soc": null }
  ],
  "unexpected_inclusions": [
    { "career_soc": "string", "name": "string", "why_unexpected": "string" }
  ],
  "missed_expectations": [
    { "expected_kind": "string", "detail": "string" }
  ],
  "suggested_scoring_changes": [
    { "change": "string", "expected_effect": "string", "risk": "string" }
  ],
  "notes": "string"
}
Use JSON null for unknown career_soc in constraint_violations.`;

function mockJudgeOutput(): JudgeOutput {
  return {
    overall_quality_1_to_5: 3,
    constraint_compliance_1_to_5: 3,
    coherence_1_to_5: 3,
    diversity_1_to_5: 3,
    constraint_violations: [],
    unexpected_inclusions: [],
    missed_expectations: [],
    suggested_scoring_changes: [],
    notes: "mock-judge stub (no API call)",
  };
}

function extractText(resp: Anthropic.Messages.Message): string {
  const blocks = resp.content || [];
  return blocks
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}

function buildUserPayload(scoring: ScoringFile, judgeTopK: number): string {
  const careers = scoring.topCareers.slice(0, judgeTopK);
  return JSON.stringify(
    {
      takerId: scoring.takerId,
      displayName: scoring.displayName || null,
      personaId: scoring.personaId,
      scenarioTitle: scoring.scenarioTitle,
      scenarioRationale: scoring.scenarioRationale ?? null,
      answersSummary: scoring.answersSummary,
      scoringDebug: scoring.debug,
      topCareersForReview: careers,
    },
    null,
    2
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function parseJudgeJson(raw: string): JudgeOutput {
  const stripped = stripJsonFences(raw);
  const data = JSON.parse(stripped) as unknown;
  return JudgeOutputSchema.parse(data);
}

async function callJudge(
  client: Anthropic,
  model: string,
  userPayload: string,
  repairHint?: string
): Promise<string> {
  const userText = repairHint
    ? `${userPayload}\n\nYour previous reply failed validation: ${repairHint}\nReturn ONLY corrected JSON.`
    : `${SCHEMA_USER_HINT}\n\nData:\n${userPayload}`;

  const msg = await client.messages.create({
    model,
    max_tokens: 4096,
    temperature: 0.2,
    system: JUDGE_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userText }],
  });
  return extractText(msg);
}

async function main() {
  const args = parseArgs(process.argv);
  const inDir = getString(args, "in-dir", "");
  const model = getString(args, "model", DEFAULT_JUDGE_MODEL);
  const sleepMs = getInt(args, "sleep-ms", 200);
  const judgeTopK = getInt(args, "judge-top-k", 20);
  const mockJudge = Boolean(args["mock-judge"]);
  const force = Boolean(args["force"]);

  if (!inDir || !fs.existsSync(inDir)) {
    console.error("Missing or invalid --in-dir");
    process.exit(1);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY || "";
  if (!mockJudge && !apiKey) {
    console.error("ANTHROPIC_API_KEY is not set. Use --mock-judge for offline smoke tests.");
    process.exit(1);
  }

  const client = mockJudge ? null : new Anthropic({ apiKey });

  const files = fs
    .readdirSync(inDir)
    .filter((f) => f.endsWith(".scoring.json"))
    .sort();

  if (files.length === 0) {
    console.error(`No *.scoring.json files in ${inDir}`);
    process.exit(1);
  }

  for (const file of files) {
    const base = file.replace(/\.scoring\.json$/i, "");
    const scoringPath = path.join(inDir, file);
    const reqPath = path.join(inDir, `${base}.judge-request.json`);
    const rawPath = path.join(inDir, `${base}.judge-response.txt`);
    const parsedPath = path.join(inDir, `${base}.judge-parsed.json`);

    if (!force && fs.existsSync(parsedPath)) {
      console.log(`Skip ${base} (exists ${path.basename(parsedPath)})`);
      continue;
    }

    const scoring = JSON.parse(fs.readFileSync(scoringPath, "utf8")) as ScoringFile;
    const payload = buildUserPayload(scoring, judgeTopK);
    fs.writeFileSync(
      reqPath,
      JSON.stringify({ model: mockJudge ? "mock" : model, judgeTopK, payload }, null, 2),
      "utf8"
    );

    if (mockJudge) {
      const out = mockJudgeOutput();
      fs.writeFileSync(rawPath, JSON.stringify(out, null, 2) + "\n", "utf8");
      fs.writeFileSync(parsedPath, JSON.stringify(out, null, 2), "utf8");
      console.log(`Mock-judge ${base}`);
      continue;
    }

    let rawText = "";
    let parsed: JudgeOutput | null = null;
    let lastErr = "";

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        rawText = await callJudge(client!, model, payload, attempt === 0 ? undefined : lastErr);
        fs.writeFileSync(rawPath, rawText, "utf8");
        parsed = parseJudgeJson(rawText);
        break;
      } catch (e) {
        lastErr = (e as Error).message;
        if (attempt === 1) {
          console.error(`Judge failed for ${base}: ${lastErr}`);
          process.exit(1);
        }
      }
    }

    fs.writeFileSync(parsedPath, JSON.stringify(parsed, null, 2), "utf8");
    console.log(`Judged ${base}`);

    if (sleepMs > 0) await sleep(sleepMs);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
