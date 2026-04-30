import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const answers = {
  personaId: { value: "P4" },
  P4_JOB: {
    text: "Paralegals and Legal Assistants, Retail Salespersons, Receptionists and Information Clerks",
    mapping: {
      jobs: [
        { title: "Paralegals and Legal Assistants", soc: "23-2011.00", socMajorGroup: "23" },
        { title: "Retail Salespersons", soc: "41-2031.00", socMajorGroup: "41" },
        { title: "Receptionists and Information Clerks", soc: "43-4171.00", socMajorGroup: "43" },
      ],
      soc: "23-2011.00",
      socMajorGroup: "23",
    },
  },
  P4_EDU_LEVEL: {
    text: "Master's degree",
    mapping: { educationLevel: "master" },
  },
  P4_MAJOR: {
    text: "Political Science and Government, History, Spanish",
    mapping: {
      primaryMajors: ["Political Science and Government", "History", "Spanish"],
      primaryMajor: "Political Science and Government",
    },
  },
  P4_EDU_INTEREST_MAJORS: {
    text: "English",
    mapping: { primaryMajors: ["English"], primaryMajor: "English" },
  },
  P4_EDU_CEIL: {
    text: "Doctoral or professional degree",
    mapping: { educationCeiling: "doctoral" },
  },
  INTEREST_1: { text: "B", mapping: { choice: "B", winLetter: "I" } },
  INTEREST_2: { text: "B", mapping: { choice: "B", winLetter: "S" } },
  INTEREST_10: { text: "A", mapping: { choice: "A", winLetter: "C" } },
  INTEREST_11: { text: "B", mapping: { choice: "B", winLetter: "C" } },
  INTEREST_12: { text: "B", mapping: { choice: "B", winLetter: "A" } },
  hollandCode: "SIC",
  Q2: {
    text: "__multi__",
    mapping: { selectedTexts: ["Only Indoors"], workSettings: ["indoors"] },
  },
  Q3: {
    text: "__multi__",
    mapping: {
      selectedTexts: [
        "Mostly on my own — I work better with data, systems, or tasks than with people",
      ],
      peopleContactRanges: [{ min: 0, max: 3 }],
    },
  },
  Q4: {
    text: "__multi__",
    mapping: {
      selectedTexts: [
        "Mostly stationary — I prefer to work primarily at a desk or workstation",
      ],
      physicalDemandLevels: ["Primarily Sedentary"],
    },
  },
  Q5: {
    text: "$80,000–$120,000",
    mapping: { salaryMin: 80000, salaryMax: 120000 },
  },
  Q6: { value: "SC" },
  Q7: {
    text: "No — I want to stay where I am",
    mapping: { willingToRelocate: false },
  },
  Q8: {
    text: "Very important — I need reliable job openings in my area",
    mapping: { jobMarketWeight: "high" },
  },
  Q9: {
    text: "3 — I am neutral — it depends on the career",
    mapping: { aiToleranceScale: 3 },
  },
};

const line = JSON.stringify({
  displayName: "Mary",
  takerId: "taker-006",
  personaId: "P4",
  scenarioTitle: "Mary · P4 — feedback form",
  scenarioRationale:
    "Feedback form. P4 multi-job (23-2011, 41-2031, 43-4171), master’s, P4_EDU_CEIL doctoral, interest English. Partial INTEREST_3–9 omitted in export. Holland SIC, SC, $80k–$120k, not relocating, job market high, AI 3.",
  answers,
});

const p = path.join(__dirname, "../eval-fixtures/ten-takers.jsonl");
const lines = fs.readFileSync(p, "utf8").split(/\r?\n/).filter((l) => l.trim());
lines[5] = line;
fs.writeFileSync(p, lines.join("\n") + "\n", "utf8");
console.log("Updated eval-fixtures/ten-takers.jsonl line 6 (Mary / P4, taker-006).");
