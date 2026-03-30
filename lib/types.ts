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

export type CareerData = {
  careers: Career[];
  stateDemand: StateDemandRow[];
};

export type Answers = Record<
  string,
  | { text: string; mapping?: P1AnswerMapping }
  | { value: string }
  | string
  | undefined
>;

