export type HollandLetter = "R" | "I" | "A" | "S" | "E" | "C";

export type HollandAnswerOption = {
  text: string;
  hollandType: HollandLetter;
};

export type HollandQuestion = {
  id: string; // H1-H7
  questionNumber: number;
  text: string;
  type: "holland";
  answers: HollandAnswerOption[];
};

export type P1AnswerMapping = Record<string, unknown> & {
  salaryMin?: number;
  salaryMax?: number;
  willingToRelocate?: boolean;
  jobMarketWeight?: "high" | "medium" | "low";
  aiToleranceScale?: number;
  workSetting?: "indoors" | "outdoors" | "mix";
  peopleContactMin?: number;
  peopleContactMax?: number;
  physicalDemandLevel?: "Highly Active" | "Moderately Active" | "Primarily Sedentary";
};

export type P1AnswerOption = {
  text: string;
  mapping?: P1AnswerMapping;
};

export type P1Question = {
  id: string; // Q2-Q9
  label: string;
  text: string;
  filterType?: string;
  inputType?: "state";
  answers: P1AnswerOption[];
  states?: { abbr: string; name: string }[];
};

export type QuizData = {
  hollandQuestions: HollandQuestion[];
  p1Questions: P1Question[];
  questionOrder: string[];
};

export type Career = {
  soc: string;
  name: string;
  salaryLow: number;
  medianSalary: number;
  salaryHigh?: number;
  nationalEmployment?: number;
  aiReplacementRisk: number;
  hollandCode: string;
  suggestedMajors?: string;
  careerArea?: string;
  careerAreas?: string[];
  currentDemand?: string;
  educationRequirements?: string;
  jobDescription?: string;
  workSetting?: string;
  physicalDemandLevel?: string;
  peopleContactScore?: number;
  physicalActivityScore?: number;
};

export type StateDemandRow = {
  soc: string;
  state?: string;
  stateAbbr?: string;
  demandLevel?: string;
};

/** O*NET-style enrichments keyed by SOC (raw or normalized). See `data/onet-by-soc.json`. */
export type OnetSkillEntry = { id?: string; name?: string; importance?: number };

export type OnetRecord = {
  topSkills?: OnetSkillEntry[];
  hotTechnologies?: string[];
};

export type OnetBySoc = Record<string, OnetRecord>;

export type RelatedOccRow = { soc: string; title?: string };

export type TransferabilityNeighbor = { soc: string; score: number };

export type TransferabilityTable = {
  version: number;
  bySourceSoc: Record<string, TransferabilityNeighbor[]>;
  generatedAt?: string;
  topK?: number;
};

/** Built by `scripts/build-skill-neighborhoods.ts` → `data/skill-neighborhoods.json`. */
export type SkillNeighborhoodBundle = {
  version: number;
  tau: number;
  lambdaSkill: number;
  minPoolAfterGate: number;
  socVectors: Record<string, Record<string, number>>;
  socTechnologies: Record<string, string[]>;
  generatedAt?: string;
  kMeansK?: number;
  neighborhoods?: Array<{
    k: number;
    topSkills: string[];
    exemplarSocs: string[];
  }>;
  socToNeighborhoods?: Record<string, Array<{ k: number; sim: number }>>;
};

export type CareerData = {
  careers: Career[];
  stateDemand: StateDemandRow[];
  /** Precomputed transferability neighbors by normalized source SOC (see `data/transferability-neighbors.json`). */
  transferability?: TransferabilityTable;
  /** Optional O*NET-style sidecar for fallback pair scoring (see `data/onet-by-soc.json`). */
  onetBySoc?: OnetBySoc;
  /** For graph term in fallback scoring when a pair is missing from `transferability`. */
  relatedOccupations?: Record<string, RelatedOccRow[]>;
  /** Skill + technology vectors and gate params (see `data/skill-neighborhoods.json`). */
  skillNeighborhoods?: SkillNeighborhoodBundle;
};

export type Answers = Record<
  string,
  | { text: string; mapping?: P1AnswerMapping }
  | { value: string }
  | string
  | undefined
>;

