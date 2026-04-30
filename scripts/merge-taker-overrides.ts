/**
 * Patch rows in a benchmark fixture (.jsonl) using a JSON overrides map keyed by takerId.
 *
 * Drop real quiz answers in eval-fixtures/taker-overrides.local.json (gitignored), e.g.:
 *   {
 *     "taker-001": {
 *       "displayName": "Sandy",
 *       "personaId": "P1",
 *       "scenarioTitle": "Sandy — captured quiz",
 *       "scenarioRationale": "Optional note to yourself.",
 *       "answers": { ...same shape as fixture answers... }
 *     }
 *   }
 *
 * Usage (from bestjobforme/):
 *   npx.cmd tsx scripts/merge-taker-overrides.ts --fixture eval-fixtures/ten-takers.jsonl --overrides eval-fixtures/taker-overrides.local.json
 *   npx.cmd tsx scripts/merge-taker-overrides.ts ... --dry-run
 */

import fs from "fs";
import path from "path";

import { getString, parseArgs, resolveTakerId } from "./eval/cli-utils";

type Override = {
  displayName?: string;
  personaId?: string;
  scenarioTitle?: string;
  scenarioRationale?: string;
  answers?: Record<string, unknown>;
};

type SpecLine = {
  takerId?: string;
  displayName?: string;
  personaId?: string;
  scenarioTitle?: string;
  scenarioRationale?: string;
  answers: Record<string, unknown>;
};

function main() {
  const args = parseArgs(process.argv);
  const fixturePath = getString(args, "fixture", path.join("eval-fixtures", "ten-takers.jsonl"));
  const overridesPath = getString(
    args,
    "overrides",
    path.join("eval-fixtures", "taker-overrides.local.json")
  );
  const outPath = getString(args, "out", "");
  const dryRun = args["dry-run"] === true;

  const absFixture = path.isAbsolute(fixturePath) ? fixturePath : path.join(process.cwd(), fixturePath);
  const absOverrides = path.isAbsolute(overridesPath) ? overridesPath : path.join(process.cwd(), overridesPath);
  const absOut = outPath
    ? path.isAbsolute(outPath)
      ? outPath
      : path.join(process.cwd(), outPath)
    : absFixture;

  if (!fs.existsSync(absFixture)) {
    console.error(`Missing fixture: ${absFixture}`);
    process.exit(1);
  }
  if (!fs.existsSync(absOverrides)) {
    console.error(`Missing overrides: ${absOverrides}`);
    console.error(`Copy eval-fixtures/taker-overrides.example.json → taker-overrides.local.json and edit.`);
    process.exit(1);
  }

  let overridesRaw: Record<string, Override>;
  try {
    overridesRaw = JSON.parse(fs.readFileSync(absOverrides, "utf8")) as Record<string, Override>;
  } catch (e) {
    console.error(`Invalid JSON in overrides: ${(e as Error).message}`);
    process.exit(1);
  }

  const lines = fs.readFileSync(absFixture, "utf8").split(/\r?\n/).filter((l) => l.trim());
  const outLines: string[] = [];
  let patched = 0;

  for (let i = 0; i < lines.length; i++) {
    let spec: SpecLine;
    try {
      spec = JSON.parse(lines[i]!) as SpecLine;
    } catch (e) {
      console.error(`Invalid JSON on fixture line ${i + 1}: ${(e as Error).message}`);
      process.exit(1);
    }
    const takerId = resolveTakerId(spec, i + 1);
    const o = overridesRaw[takerId];
    if (o) {
      if (o.displayName !== undefined) spec.displayName = o.displayName;
      if (o.personaId !== undefined) spec.personaId = o.personaId;
      if (o.scenarioTitle !== undefined) spec.scenarioTitle = o.scenarioTitle;
      if (o.scenarioRationale !== undefined) spec.scenarioRationale = o.scenarioRationale;
      if (o.answers !== undefined) spec.answers = o.answers;
      patched++;
    }
    outLines.push(JSON.stringify(spec));
  }

  const unknownKeys = Object.keys(overridesRaw).filter(
    (k) => !lines.some((line, idx) => {
      try {
        const s = JSON.parse(line) as SpecLine;
        return resolveTakerId(s, idx + 1) === k;
      } catch {
        return false;
      }
    })
  );
  if (unknownKeys.length > 0) {
    console.error(`Warning: overrides keys not found in fixture (typo?): ${unknownKeys.join(", ")}`);
  }

  const body = outLines.join("\n") + "\n";
  if (dryRun) {
    process.stdout.write(body);
    console.error(`Dry-run: would patch ${patched} row(s); ${lines.length} total. (stdout = merged jsonl)`);
    return;
  }

  fs.writeFileSync(absOut, body, "utf8");
  console.error(`Patched ${patched} row(s) → ${absOut} (${lines.length} lines).`);
}

main();
