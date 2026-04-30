/**
 * Generate synthetic quiz answer specs (localStorage-shaped) for evaluation.
 *
 * Usage (from bestjobforme/):
 *   npx tsx scripts/synthetic-takers.ts --count 10 --seed 123 --persona-mix "P4:7,P3:3" --out synthetic-spec.jsonl
 *   npx tsx scripts/synthetic-takers.ts ... --full-holland
 */

import fs from "fs";
import path from "path";

import type { Answers } from "@/lib/types";
import { computeHollandCodeFromChoices } from "@/lib/holland-binary";
import { hollandPairs, INTEREST_QUESTION_IDS } from "@/lib/holland-pairs";

import { parseArgs, getString, getInt } from "./eval/cli-utils";

type PersonaId = "P1" | "P3" | "P4";

type CareerRow = {
  soc: string;
  name: string;
  medianSalary: number;
  educationRequirements?: string;
  suggestedMajors?: string;
};

function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleInPlace<T>(arr: T[], rng: () => number): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function getSocMajorGroup(soc: string): string {
  return String(soc || "").trim().slice(0, 2);
}

function majorsFromCareer(c: CareerRow): string[] {
  return (c.suggestedMajors || "")
    .split("|")
    .map((m) => m.trim())
    .filter(Boolean)
    .slice(0, 4);
}

function buildJobsAnswer(jobs: Array<{ title: string; soc: string; socMajorGroup: string }>): {
  text: string;
  mapping: Record<string, unknown>;
} {
  const first = jobs[0];
  return {
    text: jobs.map((j) => j.title).join(", "),
    mapping: {
      jobs,
      soc: first.soc,
      socMajorGroup: first.socMajorGroup,
    },
  };
}

function balancedPersonas(count: number): PersonaId[] {
  const order: PersonaId[] = ["P1", "P3", "P4"];
  return Array.from({ length: count }, (_, i) => order[i % 3]!);
}

function parsePersonaMix(s: string, count: number): PersonaId[] {
  const counts: Partial<Record<PersonaId, number>> = {};
  for (const part of s.split(",").map((p) => p.trim()).filter(Boolean)) {
    const [k, vRaw] = part.split(":").map((x) => x.trim());
    const v = parseInt(vRaw, 10);
    if (!k || !["P1", "P3", "P4"].includes(k) || !Number.isFinite(v) || v < 0) {
      throw new Error(`Invalid persona-mix segment: "${part}"`);
    }
    counts[k as PersonaId] = (counts[k as PersonaId] || 0) + v;
  }
  const personas: PersonaId[] = [];
  (["P1", "P3", "P4"] as const).forEach((p) => {
    const n = counts[p] || 0;
    for (let i = 0; i < n; i++) personas.push(p);
  });
  if (personas.length !== count) {
    throw new Error(`persona-mix counts sum to ${personas.length}, expected --count ${count}`);
  }
  return personas;
}

const HOLLAND_POOL = ["SIE", "RIA", "EAC", "CIS", "IAR", "SEC", "RCE", "AIE"] as const;

/** Q2–Q4 / Q6–Q8 exact strings from `data/quiz-data.json` + UI multi-select behavior (salary + AI set on results page). */
function sharedPreferenceBlock(archetype: number, rng: () => number): Pick<Answers, "Q2" | "Q3" | "Q4" | "Q6" | "Q7" | "Q8"> {
  const q6State = archetype === 3 ? "CA" : ["TX", "OH", "FL", "NY", "WA"][Math.floor(rng() * 5)]!;

  const q7 =
    archetype === 3
      ? {
          text: "No — I want to stay where I am",
          mapping: { willingToRelocate: false },
        }
      : {
          text: "Yes — I am open to moving",
          mapping: { willingToRelocate: true },
        };

  let q8: { text: string; mapping: { jobMarketWeight: string } };
  if (archetype === 3 || archetype === 0) {
    q8 = {
      text: "Very important — I need reliable job openings in my area",
      mapping: { jobMarketWeight: "high" },
    };
  } else if (archetype === 4) {
    q8 = {
      text: "Somewhat important — I'd prefer good availability but it's not a dealbreaker",
      mapping: { jobMarketWeight: "medium" },
    };
  } else {
    q8 =
      rng() > 0.35
        ? {
            text: "Somewhat important — I'd prefer good availability but it's not a dealbreaker",
            mapping: { jobMarketWeight: "medium" },
          }
        : {
            text: "Not very important — local job availability isn't a deciding factor for me",
            mapping: { jobMarketWeight: "low" },
          };
  }

  const q2 = {
    text: "__multi__",
    mapping: {
      selectedTexts: ["I am open to indoors or outdoors"],
      workSettings: [] as string[],
    },
  };

  const q3opts = [
    {
      text: "__multi__",
      mapping: {
        selectedTexts: ["Mixed — I like some people contact but also need independent focus time"],
        peopleContactRanges: [{ min: 3.0, max: 4.5 }],
      },
    },
    {
      text: "__multi__",
      mapping: {
        selectedTexts: ["Mostly with people — clients, patients, students, or teams energize me"],
        peopleContactRanges: [{ min: 4.5, max: 5.0 }],
      },
    },
    {
      text: "__multi__",
      mapping: {
        selectedTexts: ["Mostly on my own — I work better with data, systems, or tasks than with people"],
        peopleContactRanges: [{ min: 0, max: 3.0 }],
      },
    },
  ];
  const q3 = q3opts[Math.floor(rng() * q3opts.length)]!;

  const q4opts = [
    {
      text: "__multi__",
      mapping: {
        selectedTexts: ["Moderately active — a mix of physical activity and seated or desk work"],
        physicalDemandLevels: ["Moderately Active"],
      },
    },
    {
      text: "__multi__",
      mapping: {
        selectedTexts: ["Mostly stationary — I prefer to work primarily at a desk or workstation"],
        physicalDemandLevels: ["Primarily Sedentary"],
      },
    },
  ];
  const q4 = q4opts[Math.floor(rng() * q4opts.length)]!;

  return {
    Q2: q2 as Answers["Q2"],
    Q3: q3 as Answers["Q3"],
    Q4: q4 as Answers["Q4"],
    Q6: { value: q6State } as Answers["Q6"],
    Q7: q7 as Answers["Q7"],
    Q8: q8 as Answers["Q8"],
  };
}

function hollandApproachB(rng: () => number): { hollandCode: string } {
  return { hollandCode: HOLLAND_POOL[Math.floor(rng() * HOLLAND_POOL.length)]! };
}

function hollandApproachA(rng: () => number): { hollandCode: string; interest: Record<string, Answers[string]> } {
  const choices = Array.from({ length: hollandPairs.length }, () => (rng() < 0.5 ? "A" : "B") as "A" | "B");
  const code = computeHollandCodeFromChoices(choices);
  const interest: Record<string, Answers[string]> = {};
  for (let i = 0; i < INTEREST_QUESTION_IDS.length; i++) {
    const id = INTEREST_QUESTION_IDS[i]!;
    const side = choices[i]!;
    const pair = hollandPairs[i]!;
    const winLetter = side === "A" ? pair.A.type : pair.B.type;
    interest[id] = {
      text: side,
      mapping: { choice: side, winLetter },
    };
  }
  return { hollandCode: code, interest };
}

function filterCareerPool(all: CareerRow[]): CareerRow[] {
  return all.filter((c) => c.soc && c.name && Number.isFinite(c.medianSalary));
}

function pickPoolForPersona(persona: PersonaId, all: CareerRow[], rng: () => number): CareerRow[] {
  const bach = all.filter((c) => /bachelor/i.test(c.educationRequirements || ""));
  if (persona === "P4") {
    const withMajors = bach.filter((c) => majorsFromCareer(c).length > 0 && c.medianSalary >= 40000);
    const loose = bach.filter((c) => majorsFromCareer(c).length > 0);
    if (withMajors.length > 80) return withMajors;
    if (loose.length > 40) return loose;
    return bach.length ? bach : all;
  }
  if (persona === "P3") {
    return bach.length > 50 ? bach : all;
  }
  void rng;
  return all;
}

function pickCareer(rng: () => number, pool: CareerRow[]): CareerRow {
  return pool[Math.floor(rng() * pool.length)]!;
}

function buildSpec(args: {
  idx: number;
  seed: number;
  persona: PersonaId;
  fullHolland: boolean;
  careers: CareerRow[];
}): { line: object } {
  const { idx, seed, persona, fullHolland, careers } = args;
  const rng = mulberry32(seed + idx * 1_000_003 + persona.charCodeAt(1) * 17);
  const archetype = idx % 5;
  const pool = pickPoolForPersona(persona, careers, rng);
  const anchor = pickCareer(rng, pool);
  const anchorMajors = majorsFromCareer(anchor);
  const majorStr = anchorMajors[0] || "General Studies";

  const shared = sharedPreferenceBlock(archetype, rng);

  const scenParts: string[] = [];
  if (archetype === 1) scenParts.push("High salary floor ($120k+).");
  if (archetype === 2) scenParts.push("Bachelor education ceiling with aspirational advanced-field interest.");
  if (archetype === 3) scenParts.push("Stay in-state (no relocate) with strong local job-market weight.");
  if (archetype === 4) scenParts.push("AI-averse (scale 5).");
  if (archetype === 0) scenParts.push("Baseline mixed preferences.");

  let answers: Answers = {
    personaId: { value: persona },
    ...shared,
  } as Answers;

  if (fullHolland) {
    const packed = hollandApproachA(rng);
    answers = { ...answers, ...packed.interest, hollandCode: packed.hollandCode };
  } else {
    (answers as { hollandCode?: string }).hollandCode = hollandApproachB(rng).hollandCode;
  }

  if (persona === "P1") {
    answers.P1_EDU_LEVEL = {
      text: "Bachelor's degree",
      mapping: { educationLevel: "bachelor" },
    } as Answers["P1_EDU_LEVEL"];
    if (archetype === 2) {
      answers.P1_EDU_INTEREST_MAJORS = {
        text: "Medicine, Law",
        mapping: { primaryMajors: ["Pre-Medicine Studies", "Legal Studies"], primaryMajor: "Pre-Medicine Studies" },
      } as Answers["P1_EDU_INTEREST_MAJORS"];
      answers.P1_EDU_CEIL = {
        text: "Bachelor's degree",
        mapping: { educationCeiling: "bachelor" },
      } as Answers["P1_EDU_CEIL"];
      scenParts.push("P1 exploring advanced fields but caps at bachelor's.");
    } else {
      answers.P1_EDU_INTEREST_MAJORS = {
        text: "",
        mapping: { primaryMajors: [] },
      } as Answers["P1_EDU_INTEREST_MAJORS"];
    }
  }

  if (persona === "P3") {
    answers.P3_MAJOR = {
      text: majorStr,
      mapping: { primaryMajors: anchorMajors.slice(0, 2).length ? anchorMajors.slice(0, 2) : [majorStr], primaryMajor: majorStr },
    } as Answers["P3_MAJOR"];
    answers.P3_MAJOR_SCOPE = {
      text: "Show me related fields too — I am open to adjacent paths",
      mapping: { p3MajorScope: "adjacent" },
    } as Answers["P3_MAJOR_SCOPE"];
    answers.P3_EDU_LEVEL = {
      text: "Bachelor's degree",
      mapping: { educationLevel: "bachelor" },
    } as Answers["P3_EDU_LEVEL"];
    if (archetype === 2) {
      answers.P3_EDU_INTEREST_MAJORS = {
        text: "MBA, Physician Assistant",
        mapping: { primaryMajors: ["Business Administration", "Physician Assistant"], primaryMajor: "Business Administration" },
      } as Answers["P3_EDU_INTEREST_MAJORS"];
      answers.P3_EDU_CEIL = {
        text: "Bachelor's degree",
        mapping: { educationCeiling: "bachelor" },
      } as Answers["P3_EDU_CEIL"];
    } else {
      answers.P3_EDU_INTEREST_MAJORS = {
        text: "",
        mapping: { primaryMajors: [] },
      } as Answers["P3_EDU_INTEREST_MAJORS"];
    }
    const qualifiedNow = archetype !== 1;
    answers.P3_QUALIFIED_NOW = qualifiedNow
      ? ({
          text: "Careers I'm qualified for now",
          mapping: { p3QualifiedNow: true },
        } as Answers["P3_QUALIFIED_NOW"])
      : ({
          text: "Careers I could achieve with more experience",
          mapping: { p3QualifiedNow: false },
        } as Answers["P3_QUALIFIED_NOW"]);
    if (qualifiedNow) {
      answers.P3_EXPERIENCE = {
        text: "Some — I have worked in a related role for less than 2 years",
        mapping: { p3ExperienceLevel: "some" },
      } as Answers["P3_EXPERIENCE"];
    }
    scenParts.push(`P3 graduate anchored to majors aligned with ${anchor.name}.`);
  }

  if (persona === "P4") {
    const jobPick = anchor;
    answers.P4_JOB = buildJobsAnswer([
      {
        title: jobPick.name,
        soc: jobPick.soc,
        socMajorGroup: getSocMajorGroup(jobPick.soc),
      },
    ]) as Answers["P4_JOB"];
    answers.P4_EDU_LEVEL = {
      text: "Bachelor's degree",
      mapping: { educationLevel: "bachelor" },
    } as Answers["P4_EDU_LEVEL"];

    /** Former standalone P5 — pivot/retrain toward a different academic background than current job cluster. */
    const careerChangeFlavor = rng() > 0.55;
    if (careerChangeFlavor) {
      const altPool = pool.filter((c) => normalizeSoc(c.soc) !== normalizeSoc(anchor.soc));
      const alt = pickCareer(rng, altPool.length ? altPool : pool);
      const altMajors = majorsFromCareer(alt);
      answers.P4_MAJOR = {
        text: altMajors.slice(0, 2).join(", ") || altMajors[0] || "Psychology",
        mapping: {
          primaryMajors: altMajors.slice(0, 2).length ? altMajors.slice(0, 2) : [altMajors[0] || "Psychology"],
          primaryMajor: altMajors[0] || "Psychology",
        },
      } as Answers["P4_MAJOR"];
      answers.P4_MAJOR_SCOPE = {
        text: "Include adjacent fields too — I'm open to related paths",
        mapping: { p4MajorScope: "adjacent" },
      } as Answers["P4_MAJOR_SCOPE"];
      scenParts.push(
        `P4 career-change flavor: working area ${jobPick.name} vs prior study toward ${alt.name} (Holland ${(answers as { hollandCode?: string }).hollandCode ?? ""}).`
      );
    } else {
      const majs = majorsFromCareer(jobPick);
      if (majs.length) {
        answers.P4_MAJOR = {
          text: majs.slice(0, 2).join(", "),
          mapping: { primaryMajors: majs.slice(0, 2), primaryMajor: majs[0] },
        } as Answers["P4_MAJOR"];
      }
      scenParts.push(`P4 currently in ${jobPick.name} (${jobPick.soc}) wanting adjacent growth.`);
    }

    if (archetype === 2) {
      answers.P4_EDU_INTEREST_MAJORS = {
        text: careerChangeFlavor ? "Nursing, Engineering" : "Public Health, Data Science",
        mapping: careerChangeFlavor
          ? { primaryMajors: ["Nursing", "Mechanical Engineering"], primaryMajor: "Nursing" }
          : { primaryMajors: ["Public Health", "Data Science"], primaryMajor: "Public Health" },
      } as Answers["P4_EDU_INTEREST_MAJORS"];
      answers.P4_EDU_CEIL = {
        text: "Bachelor's degree",
        mapping: { educationCeiling: "bachelor" },
      } as Answers["P4_EDU_CEIL"];
    } else {
      answers.P4_EDU_INTEREST_MAJORS = { text: "", mapping: { primaryMajors: [] } } as Answers["P4_EDU_INTEREST_MAJORS"];
    }
  }

  const scenarioTitle = `${persona} · ${scenParts[0] ?? "Synthetic benchmark taker"}`;
  const scenarioRationale = scenParts.join(" ");

  const takerId = `taker-${String(idx + 1).padStart(3, "0")}`;

  return {
    line: {
      takerId,
      displayName: "",
      personaId: persona,
      scenarioTitle,
      scenarioRationale,
      answers,
    },
  };
}

function normalizeSoc(soc: string): string {
  return String(soc || "")
    .trim()
    .replace(/\.\d+$/, "");
}

function main() {
  const args = parseArgs(process.argv);
  const count = getInt(args, "count", 10);
  const seed = getInt(args, "seed", 42);
  const mixRaw = args["persona-mix"];
  const outPath = getString(args, "out", "synthetic-spec.jsonl");
  const fullHolland = Boolean(args["full-holland"]);

  let personas: PersonaId[];
  if (mixRaw === true || mixRaw === undefined) {
    personas = balancedPersonas(count);
  } else {
    try {
      personas = parsePersonaMix(String(mixRaw), count);
    } catch (e) {
      console.error((e as Error).message);
      process.exit(1);
    }
  }

  const careersPath = path.join(process.cwd(), "data", "careers.json");
  const allCareers = filterCareerPool(JSON.parse(fs.readFileSync(careersPath, "utf8")) as CareerRow[]);
  const rngOrder = mulberry32(seed);
  shuffleInPlace(personas, rngOrder);

  const lines: string[] = [];
  for (let i = 0; i < count; i++) {
    const { line } = buildSpec({
      idx: i,
      seed,
      persona: personas[i]!,
      fullHolland,
      careers: allCareers,
    });
    lines.push(JSON.stringify(line));
  }

  fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
  fs.writeFileSync(outPath, lines.join("\n") + "\n", "utf8");
  console.log(`Wrote ${count} spec(s) to ${outPath}`);
}

main();
