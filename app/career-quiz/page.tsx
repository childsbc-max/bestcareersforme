"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GraduationCap, BookOpen, Briefcase, Compass } from "lucide-react";

import careers from "@/data/careers.json";
import majorsData from "@/data/majors.json";
import quizData from "@/data/quiz-data.json";
import type { Answers, P1Question, QuizData } from "@/lib/types";
import { readPrimaryMajorsForQuestion, type MultiMajorQuestionId } from "@/lib/scoring";
import { hollandPairs, HOLLAND_PAIR_COUNT, INTEREST_QUESTION_IDS, interestIndexFromQuestionId, type HollandPair } from "@/lib/holland-pairs";
import { computeHollandCodeFromChoices } from "@/lib/holland-binary";
import { AnswersSidebar } from "@/app/components/AnswersSidebar";

const QUIZ_STORAGE_KEY = "bestcareerfor.me:quiz_answers:v1";

type PersonaId = "P1" | "P3" | "P4" | "P5";

const MAJORS = majorsData as string[];

const PERSONA_META: Record<string, { icon: any; description: string }> = {
  P1: {
    icon: GraduationCap,
    description: "You're in high school or early college and exploring what comes next.",
  },
  P3: {
    icon: BookOpen,
    description: "You have a degree or are finishing one and want to put it to work.",
  },
  P4: {
    icon: Briefcase,
    description: "You're employed and want to grow, advance, or find something better.",
  },
  P5: {
    icon: Compass,
    description: "You're ready to leave your current field and start something new.",
  },
};

const PERSONA_TITLES: Record<string, string> = {
  P1: "I'm still in school",
  P3: "Recent graduate or about to graduate",
  P4: "I want to move up",
  P5: "I want to change careers",
};

function isMultiMajorQuestionId(qId: string): qId is MultiMajorQuestionId {
  return (
    qId === "P3_MAJOR" ||
    qId === "P4_MAJOR" ||
    qId === "P5_MAJOR" ||
    qId === "P1_EDU_INTEREST_MAJORS" ||
    qId === "P3_EDU_INTEREST_MAJORS" ||
    qId === "P4_EDU_INTEREST_MAJORS" ||
    qId === "P5_EDU_INTEREST_MAJORS"
  );
}

/** "Additional areas you'd study" — may be left blank; CEIL is skipped when blank. */
function isEduInterestMajorsQuestionId(qId: string): boolean {
  return (
    qId === "P1_EDU_INTEREST_MAJORS" ||
    qId === "P3_EDU_INTEREST_MAJORS" ||
    qId === "P4_EDU_INTEREST_MAJORS" ||
    qId === "P5_EDU_INTEREST_MAJORS"
  );
}

function eduCeilKeyForInterestQ(interestQId: string): keyof Answers | null {
  const m: Record<string, keyof Answers> = {
    P1_EDU_INTEREST_MAJORS: "P1_EDU_CEIL",
    P3_EDU_INTEREST_MAJORS: "P3_EDU_CEIL",
    P4_EDU_INTEREST_MAJORS: "P4_EDU_CEIL",
    P5_EDU_INTEREST_MAJORS: "P5_EDU_CEIL",
  };
  return m[interestQId] ?? null;
}

/** After this interest question is submitted with no areas, omit the follow-up CEIL question. */
function includeEduCeilAfterInterest(answers: Answers, interestId: MultiMajorQuestionId): boolean {
  const row = answers[interestId as string];
  if (row === undefined || row === null) return true;
  return readPrimaryMajorsForQuestion(answers, interestId).length > 0;
}

function persistEmptyEduInterest(answers: Answers, interestQId: MultiMajorQuestionId): Answers {
  const ceil = eduCeilKeyForInterestQ(interestQId);
  const next: Record<string, unknown> = {
    ...answers,
    [interestQId]: { text: "", mapping: { primaryMajors: [] } },
  };
  if (ceil) delete next[ceil as string];
  return next as Answers;
}

function majorMultiHint(qId: MultiMajorQuestionId): string {
  if (qId === "P3_MAJOR") {
    return "Add up to four majors or fields of study (what you studied or are studying). Matches use any of your selections; careers that align with more than one rank higher.";
  }
  if (qId === "P4_MAJOR") {
    return "Add up to four majors or fields of study from your background. Matches use any of your selections; careers that align with more than one rank higher.";
  }
  if (qId === "P1_EDU_INTEREST_MAJORS") {
    return "Optional — add up to four areas you'd be interested in studying, or leave blank. If you skip this, we won't ask how far you'd go in school and we'll use your current education level for matching.";
  }
  if (qId === "P3_EDU_INTEREST_MAJORS") {
    return "Optional — add up to four areas you'd be interested in studying next, or leave blank. If you skip this, we won't ask how far you'd consider going and we'll use your current education level for matching.";
  }
  if (qId === "P4_EDU_INTEREST_MAJORS") {
    return "Optional — add up to four areas you'd be interested in studying, or leave blank. If you skip this, we won't ask how far you'd consider going and we'll use your current education level for matching.";
  }
  if (qId === "P5_EDU_INTEREST_MAJORS") {
    return "Optional — add up to four areas you'd be interested in studying, or leave blank. If you skip this, we won't ask how far you'd consider going and we'll use your current education level for matching.";
  }
  return "Add up to four majors or fields of study. Results can match any of them; careers that align with more than one get a stronger match.";
}

type ClientQuestion =
  | {
      id: "PERSONA";
      kind: "persona";
      text: string;
      options: Array<{ personaId: PersonaId; title: string; subtitle: string }>;
    }
  | {
      id: "P4_JOB";
      kind: "jobSearch";
      text: string;
    }
  | {
      id: string;
      kind: "hollandBinary";
      text: string;
      pair: HollandPair;
      pairIndex: number;
    }
  | {
      id: "P3_MAJOR";
      kind: "majorSearch";
      text: string;
    }
  | {
      id: "P3_MAJOR_SCOPE";
      kind: "singleChoice";
      text: string;
      options: Array<{ text: string; mapping: Record<string, unknown> }>;
    }
  | {
      id: "P3_EDU_LEVEL";
      kind: "singleChoice";
      text: string;
      options: Array<{ text: string; mapping: Record<string, unknown> }>;
    }
  | {
      id: "P3_EDU_INTEREST_MAJORS";
      kind: "majorSearch";
      text: string;
    }
  | {
      id: "P3_EDU_CEIL";
      kind: "singleChoice";
      text: string;
      options: Array<{ text: string; mapping: Record<string, unknown> }>;
    }
  | {
      id: "P3_QUALIFIED_NOW";
      kind: "singleChoice";
      text: string;
      options: Array<{ text: string; mapping: Record<string, unknown> }>;
    }
  | {
      id: "P3_EXPERIENCE";
      kind: "singleChoice";
      text: string;
      options: Array<{ text: string; mapping: Record<string, unknown> }>;
    }
  | {
      id: "P1_EDU_LEVEL";
      kind: "singleChoice";
      text: string;
      options: Array<{ text: string; mapping: Record<string, unknown> }>;
    }
  | {
      id: "P1_EDU_CEIL";
      kind: "singleChoice";
      text: string;
      options: Array<{ text: string; mapping: Record<string, unknown> }>;
    }
  | {
      id: "P1_EDU_INTEREST_MAJORS";
      kind: "majorSearch";
      text: string;
    }
  | {
      id: "P4_EDU_LEVEL";
      kind: "singleChoice";
      text: string;
      options: Array<{ text: string; mapping: Record<string, unknown> }>;
    }
  | {
      id: "P4_MAJOR";
      kind: "majorSearch";
      text: string;
    }
  | {
      id: "P4_EDU_INTEREST_MAJORS";
      kind: "majorSearch";
      text: string;
    }
  | {
      id: "P4_EDU_CEIL";
      kind: "singleChoice";
      text: string;
      options: Array<{ text: string; mapping: Record<string, unknown> }>;
    }
  | {
      id: "P5_EDU_LEVEL";
      kind: "singleChoice";
      text: string;
      options: Array<{ text: string; mapping: Record<string, unknown> }>;
    }
  | {
      id: "P5_MAJOR";
      kind: "majorSearch";
      text: string;
    }
  | {
      id: "P5_MAJOR_SCOPE";
      kind: "singleChoice";
      text: string;
      options: Array<{ text: string; mapping: Record<string, unknown> }>;
    }
  | {
      id: "P5_EDU_INTEREST_MAJORS";
      kind: "majorSearch";
      text: string;
    }
  | {
      id: "P5_EDU_CEIL";
      kind: "singleChoice";
      text: string;
      options: Array<{ text: string; mapping: Record<string, unknown> }>;
    }
  | (P1Question & { kind?: never })
  | (QuizData["hollandQuestions"][number] & { kind?: never; inputType?: never });

function getSocMajorGroup(soc: string): string {
  return String(soc || "").trim().slice(0, 2);
}

function getQuestion(qId: string, data: QuizData): P1Question | (QuizData["hollandQuestions"][number] & { inputType?: never }) | null {
  if (qId.startsWith("H")) return data.hollandQuestions.find((q) => q.id === qId) ?? null;
  return data.p1Questions.find((q) => q.id === qId) ?? null;
}

function stripHollandTag(s: string): string {
  return s.replace(/\s*\[[RIASEC]\]\s*$/, "");
}

/** Same ladder as legacy P4/P5 completed question; mapping uses `educationLevel` for scoring. */
const EDU_LEVEL_OPTIONS_STANDARD: Array<{ text: string; mapping: { educationLevel: string } }> = [
  { text: "Less than high school", mapping: { educationLevel: "lessthanhs" } },
  { text: "High school diploma or equivalent", mapping: { educationLevel: "highschool" } },
  { text: "Post-secondary certificate", mapping: { educationLevel: "certificate" } },
  { text: "Some college", mapping: { educationLevel: "somecollege" } },
  { text: "Associate degree", mapping: { educationLevel: "associate" } },
  { text: "Bachelor's degree", mapping: { educationLevel: "bachelor" } },
  { text: "Master's degree", mapping: { educationLevel: "master" } },
  { text: "Doctoral / professional degree", mapping: { educationLevel: "doctoral" } },
];

/** P1: adds in-progress HS; maps to existing keys (no new scoring enums). */
const EDU_LEVEL_OPTIONS_P1: Array<{ text: string; mapping: { educationLevel: string } }> = [
  { text: "Still in high school (in progress)", mapping: { educationLevel: "highschool" } },
  ...EDU_LEVEL_OPTIONS_STANDARD,
];

function readEducationLevelKey(answers: Answers, qId: string): string | undefined {
  const row = answers[qId as keyof Answers] as { mapping?: { educationLevel?: string; educationCompleted?: string } } | undefined;
  const m = row?.mapping;
  if (!m) return undefined;
  if (typeof m.educationLevel === "string") return m.educationLevel;
  if (typeof m.educationCompleted === "string") return m.educationCompleted;
  return undefined;
}

function shuffleCopy<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Order job search: exact / best alternative title matches before random file order (and before `.slice` truncates). */
function jobTitleSearchScore(c: { name?: string; alternativeJobTitles?: unknown }, queryRaw: string): number {
  const query = queryRaw.trim().toLowerCase();
  if (!query) return 0;
  const name = String(c.name || "").toLowerCase().trim();
  const alts = Array.isArray(c.alternativeJobTitles)
    ? (c.alternativeJobTitles as unknown[]).map((t) => String(t || "").toLowerCase().trim()).filter(Boolean)
    : [];
  const exactAlt = alts.some((t) => t === query);
  const altStarts = alts.some((t) => t.startsWith(query));
  const altHas = alts.some((t) => t.includes(query));
  if (name === query) return 1_000_000;
  if (exactAlt) return 900_000;
  if (name.startsWith(query)) return 800_000;
  if (altStarts) return 750_000;
  if (name.includes(query)) return 600_000;
  if (altHas) {
    const shortest = alts.filter((t) => t.includes(query)).sort((a, b) => a.length - b.length)[0] ?? "";
    return 400_000 - Math.min(80_000, Math.max(0, shortest.length - query.length) * 200);
  }
  return 0;
}

export default function CareerQuizPage() {
  const router = useRouter();
  const data = quizData as QuizData;

  const [mounted, setMounted] = useState(false);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [hollandAnswerOrder, setHollandAnswerOrder] = useState<Record<string, string[]>>({});
  const [jobQuery, setJobQuery] = useState("");
  const [majorQuery, setMajorQuery] = useState("");

  useEffect(() => {
    setMounted(true);
    try {
      const shouldReset = new URLSearchParams(window.location.search).get("reset") === "1";
      if (shouldReset) {
        localStorage.removeItem(QUIZ_STORAGE_KEY);
        setAnswers({});
        setIndex(0);
        router.replace("/career-quiz");
        return;
      }
      const raw = localStorage.getItem(QUIZ_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Answers;
        const savedPersona = (parsed.personaId as any)?.value as string | undefined;
        if (savedPersona && !["P1", "P3", "P4", "P5"].includes(savedPersona)) {
          // Stale persona from an old version — reset so the user starts fresh
          localStorage.removeItem(QUIZ_STORAGE_KEY);
        } else {
          setAnswers(parsed);
        }
      }
    } catch {
      // ignore storage errors in MVP
    }
  }, [router]);

  const personaId = (answers.personaId as any)?.value as PersonaId | undefined;

  const KNOWN_PERSONAS = ["P1", "P3", "P4", "P5"];

  const questionOrder: string[] = useMemo(() => {
    if (!personaId || !KNOWN_PERSONAS.includes(personaId)) return ["PERSONA"];
    if (personaId === "P1") {
      const p1Base = [
        "P1_EDU_LEVEL",
        "P1_EDU_INTEREST_MAJORS",
        ...(includeEduCeilAfterInterest(answers, "P1_EDU_INTEREST_MAJORS") ? ["P1_EDU_CEIL"] : []),
      ];
      return [...p1Base, ...(data.questionOrder || [])];
    }

    if (personaId === "P3") {
      const base = [
        "P3_MAJOR",
        "P3_MAJOR_SCOPE",
        "P3_EDU_LEVEL",
        "P3_EDU_INTEREST_MAJORS",
        ...(includeEduCeilAfterInterest(answers, "P3_EDU_INTEREST_MAJORS") ? ["P3_EDU_CEIL"] : []),
      ];
      const qualifiedNow = (answers.P3_QUALIFIED_NOW as any)?.mapping?.p3QualifiedNow as boolean | undefined;
      const experienceQ = qualifiedNow === true ? ["P3_EXPERIENCE"] : [];
      const shared = ["Q2", "Q3", "Q4", "Q5", "Q6", "Q7", "Q8", "Q9"];
      return [...base, "P3_QUALIFIED_NOW", ...experienceQ, ...INTEREST_QUESTION_IDS, ...shared];
    }

    if (personaId === "P4") {
      const eduLevel =
        readEducationLevelKey(answers, "P4_EDU_LEVEL") ??
        (answers.P4_EDU_COMPLETED as { mapping?: { educationCompleted?: string } } | undefined)?.mapping?.educationCompleted;
      const skipMajor =
        eduLevel === "lessthanhs" || eduLevel === "highschool" || eduLevel === "certificate" || eduLevel === "somecollege";
      const base = [
        "P4_JOB",
        "P4_EDU_LEVEL",
        ...(skipMajor ? [] : ["P4_MAJOR"]),
        "P4_EDU_INTEREST_MAJORS",
        ...(includeEduCeilAfterInterest(answers, "P4_EDU_INTEREST_MAJORS") ? ["P4_EDU_CEIL"] : []),
      ];
      const shared = ["Q2", "Q3", "Q4", "Q5", "Q6", "Q7", "Q8", "Q9"];
      return [...base, ...INTEREST_QUESTION_IDS, ...shared];
    }

    if (personaId === "P5") {
      const eduLevel =
        readEducationLevelKey(answers, "P5_EDU_LEVEL") ??
        (answers.P5_EDU_COMPLETED as { mapping?: { educationCompleted?: string } } | undefined)?.mapping?.educationCompleted;
      const skipMajor =
        eduLevel === "lessthanhs" ||
        eduLevel === "highschool" ||
        eduLevel === "certificate" ||
        eduLevel === "somecollege";
      const base = [
        "P5_EDU_LEVEL",
        ...(skipMajor ? [] : ["P5_MAJOR", "P5_MAJOR_SCOPE"]),
        "P5_EDU_INTEREST_MAJORS",
        ...(includeEduCeilAfterInterest(answers, "P5_EDU_INTEREST_MAJORS") ? ["P5_EDU_CEIL"] : []),
      ];
      const shared = ["Q2", "Q3", "Q4", "Q5", "Q6", "Q7", "Q8", "Q9"];
      return [...base, ...INTEREST_QUESTION_IDS, ...shared];
    }

    return [];
  }, [
    personaId,
    data.questionOrder,
    answers.P1_EDU_LEVEL,
    answers.P3_EDU_LEVEL,
    answers.P3_QUALIFIED_NOW,
    answers.P4_EDU_LEVEL,
    answers.P4_EDU_COMPLETED,
    answers.P5_EDU_LEVEL,
    answers.P5_EDU_COMPLETED,
    answers.P1_EDU_INTEREST_MAJORS,
    answers.P3_EDU_INTEREST_MAJORS,
    answers.P4_EDU_INTEREST_MAJORS,
    answers.P5_EDU_INTEREST_MAJORS,
  ]);

  // Jump to a specific question when navigating back from the results page
  useEffect(() => {
    if (!mounted || questionOrder.length === 0) return;
    try {
      const target = sessionStorage.getItem("quiz:jumpTo");
      if (!target) return;
      sessionStorage.removeItem("quiz:jumpTo");
      const idx = questionOrder.indexOf(target);
      if (idx >= 0) setIndex(idx);
    } catch { /* ignore */ }
  }, [mounted, questionOrder]);

  // If CEIL is removed from the flow (blank interest), keep index within bounds.
  useEffect(() => {
    if (questionOrder.length === 0) return;
    setIndex((i) => Math.min(i, questionOrder.length - 1));
  }, [questionOrder]);

  const qId = questionOrder[index] || "";

  const q: ClientQuestion | null = useMemo(() => {
    const interestIdx = interestIndexFromQuestionId(qId);
    if (interestIdx !== null) {
      const pair = hollandPairs[interestIdx];
      return {
        id: qId,
        kind: "hollandBinary",
        text: pair.prompt,
        pair,
        pairIndex: interestIdx,
      };
    }
    if (qId === "PERSONA") {
      return {
        id: "PERSONA",
        kind: "persona",
        text: "Which of these best describes you right now?",
        options: [
          {
            personaId: "P1",
            title: "I'm still in school",
            subtitle: "High school or early college — exploring what's next",
          },
          {
            personaId: "P3",
            title: "Recent graduate or about to graduate",
            subtitle: "Ready to put your education to work",
          },
          {
            personaId: "P4",
            title: "I want to move up",
            subtitle: "Grow or advance in your current line of work",
          },
          {
            personaId: "P5",
            title: "I want to change careers",
            subtitle: "Head toward a new field or path",
          },
        ],
      };
    }
    if (qId === "P4_JOB") return { id: "P4_JOB", kind: "jobSearch", text: "What is your current job title?" };
    if (qId === "P3_MAJOR") {
      return { id: "P3_MAJOR", kind: "majorSearch", text: "What did you study, or what are you currently studying?" };
    }
    if (qId === "P3_MAJOR_SCOPE") {
      return {
        id: "P3_MAJOR_SCOPE",
        kind: "singleChoice",
        text: "How would you like us to use your major when finding career matches?",
        options: [
          { text: "Show me careers directly related to what I studied", mapping: { p3MajorScope: "direct" } },
          { text: "Show me related fields too — I am open to adjacent paths", mapping: { p3MajorScope: "adjacent" } },
          { text: "My major is not limiting me — show me all options based on my interests", mapping: { p3MajorScope: "any" } },
        ],
      };
    }
    if (qId === "P3_EDU_LEVEL") {
      return {
        id: "P3_EDU_LEVEL",
        kind: "singleChoice",
        text: "What is the highest level of education you have completed?",
        options: EDU_LEVEL_OPTIONS_STANDARD,
      };
    }
    if (qId === "P3_EDU_INTEREST_MAJORS") {
      return {
        id: "P3_EDU_INTEREST_MAJORS",
        kind: "majorSearch",
        text: "If you would like to pursue more education, what would you be interested in studying?",
      };
    }
    if (qId === "P3_EDU_CEIL") {
      return {
        id: "P3_EDU_CEIL",
        kind: "singleChoice",
        text: "What is the highest level of education you would consider pursuing?",
        options: [
          { text: "Bachelor's degree", mapping: { educationCeiling: "bachelor" } },
          { text: "Master's degree or professional degree", mapping: { educationCeiling: "master" } },
          { text: "Doctoral or professional degree", mapping: { educationCeiling: "doctoral" } },
        ],
      };
    }
    if (qId === "P3_QUALIFIED_NOW") {
      return {
        id: "P3_QUALIFIED_NOW",
        kind: "singleChoice",
        text: "Do you want careers you are qualified for now or careers you could achieve with more experience?",
        options: [
          { text: "Careers I'm qualified for now", mapping: { p3QualifiedNow: true } },
          { text: "Careers I could achieve with more experience", mapping: { p3QualifiedNow: false } },
        ],
      };
    }
    if (qId === "P3_EXPERIENCE") {
      return {
        id: "P3_EXPERIENCE",
        kind: "singleChoice",
        text: "How much relevant work or internship experience do you have in your field of study?",
        options: [
          { text: "None — I am starting fresh", mapping: { p3ExperienceLevel: "none" } },
          { text: "A little — one or two internships or part-time roles", mapping: { p3ExperienceLevel: "little" } },
          { text: "Some — I have worked in a related role for less than 2 years", mapping: { p3ExperienceLevel: "some" } },
          { text: "Significant — I have more than 2 years of relevant experience", mapping: { p3ExperienceLevel: "significant" } },
        ],
      };
    }
    if (qId === "P1_EDU_LEVEL") {
      return {
        id: "P1_EDU_LEVEL",
        kind: "singleChoice",
        text: "What is the highest level of education you have completed?",
        options: EDU_LEVEL_OPTIONS_P1,
      };
    }
    if (qId === "P1_EDU_CEIL") {
      return {
        id: "P1_EDU_CEIL",
        kind: "singleChoice",
        text: "What is the highest level of education you would consider completing?",
        options: [
          { text: "High school diploma or equivalent", mapping: { educationCeiling: "highschool" } },
          { text: "Post-secondary certificate", mapping: { educationCeiling: "certificate" } },
          { text: "Associate degree", mapping: { educationCeiling: "associate" } },
          { text: "Bachelor's degree", mapping: { educationCeiling: "bachelor" } },
          { text: "Master's degree", mapping: { educationCeiling: "master" } },
          { text: "Doctoral / professional degree", mapping: { educationCeiling: "doctoral" } },
        ],
      };
    }
    if (qId === "P1_EDU_INTEREST_MAJORS") {
      return {
        id: "P1_EDU_INTEREST_MAJORS",
        kind: "majorSearch",
        text: "If you would like to pursue more education, what would you be interested in studying?",
      };
    }
    if (qId === "P4_EDU_LEVEL") {
      return {
        id: "P4_EDU_LEVEL",
        kind: "singleChoice",
        text: "What is the highest level of education you have completed?",
        options: EDU_LEVEL_OPTIONS_STANDARD,
      };
    }
    if (qId === "P4_MAJOR") {
      return { id: "P4_MAJOR", kind: "majorSearch", text: "What did you study, or what are you currently studying?" };
    }
    if (qId === "P4_EDU_INTEREST_MAJORS") {
      return {
        id: "P4_EDU_INTEREST_MAJORS",
        kind: "majorSearch",
        text: "If you would like to pursue more education, what would you be interested in studying?",
      };
    }
    if (qId === "P4_EDU_CEIL") {
      return {
        id: "P4_EDU_CEIL",
        kind: "singleChoice",
        text: "What is the highest level of education you would consider pursuing?",
        options: [
          { text: "Bachelor's degree", mapping: { educationCeiling: "bachelor" } },
          { text: "Master's degree or professional degree", mapping: { educationCeiling: "master" } },
          { text: "Doctoral or professional degree", mapping: { educationCeiling: "doctoral" } },
        ],
      };
    }
    if (qId === "P5_EDU_LEVEL") {
      return {
        id: "P5_EDU_LEVEL",
        kind: "singleChoice",
        text: "What is the highest level of education you have completed?",
        options: EDU_LEVEL_OPTIONS_STANDARD,
      };
    }
    if (qId === "P5_MAJOR") {
      return { id: "P5_MAJOR", kind: "majorSearch", text: "What did you study, or what background do you bring from past education?" };
    }
    if (qId === "P5_MAJOR_SCOPE") {
      return {
        id: "P5_MAJOR_SCOPE",
        kind: "singleChoice",
        text: "How should we use your background when suggesting career changes?",
        options: [
          { text: "Favor careers directly related to what I studied", mapping: { p5MajorScope: "direct" } },
          { text: "Include adjacent fields too — I'm open to related paths", mapping: { p5MajorScope: "adjacent" } },
          { text: "Don't lean on my major — match mainly to my interests and preferences", mapping: { p5MajorScope: "any" } },
        ],
      };
    }
    if (qId === "P5_EDU_INTEREST_MAJORS") {
      return {
        id: "P5_EDU_INTEREST_MAJORS",
        kind: "majorSearch",
        text: "If you would like to pursue more education, what would you be interested in studying?",
      };
    }
    if (qId === "P5_EDU_CEIL") {
      return {
        id: "P5_EDU_CEIL",
        kind: "singleChoice",
        text: "What is the highest level of education you would consider pursuing?",
        options: [
          { text: "Bachelor's degree", mapping: { educationCeiling: "bachelor" } },
          { text: "Master's degree or professional degree", mapping: { educationCeiling: "master" } },
          { text: "Doctoral or professional degree", mapping: { educationCeiling: "doctoral" } },
        ],
      };
    }
    return getQuestion(qId, data) as any;
  }, [qId, data]);

  useEffect(() => {
    if (!mounted) return;
    if (!q) return;
    if (!qId.startsWith("H")) return;
    if (hollandAnswerOrder[qId]) return;
    const texts: string[] = ((q as any).answers || []).map((a: any) => String(a.text));
    const shuffled: string[] = shuffleCopy<string>(texts);
    setHollandAnswerOrder((prev) => ({ ...prev, [qId]: shuffled }));
  }, [mounted, q, qId, hollandAnswerOrder]);

  const pct = questionOrder.length ? Math.round(((index + 1) / questionOrder.length) * 100) : 0;

  // Sidebar: answered question IDs in order
  const answeredSidebarItems: string[] = useMemo(() => {
    const items: string[] = [];
    if ((answers.personaId as any)?.value) items.push("PERSONA");
    for (const id of questionOrder.slice(0, index)) {
      if (answers[id] != null) items.push(id);
    }
    return items;
  }, [answers, questionOrder, index]);

  function persist(next: Answers) {
    setAnswers(next);
    try {
      localStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore storage errors in MVP
    }
  }

  function onPickOption(text: string, mapping: unknown) {
    persist({ ...answers, [qId]: { text, mapping: (mapping as any) ?? {} } });
  }

  function onPickState(value: string) {
    persist({ ...answers, [qId]: { value } });
  }

  function canContinue() {
    if (!q) return false;
    if ((q as any).kind === "persona") return Boolean((answers.personaId as any)?.value);
    if ((q as any).kind === "hollandBinary") {
      const ch = (answers[qId] as any)?.mapping?.choice;
      return ch === "A" || ch === "B";
    }
    if ((q as any).kind === "jobSearch") return Boolean((answers[qId] as any)?.mapping?.soc);
    if ((q as any).kind === "majorSearch") {
      if (isEduInterestMajorsQuestionId(qId)) return true;
      const row = answers[qId] as any;
      const m = row?.mapping?.primaryMajors as unknown;
      if (Array.isArray(m) && m.length > 0) return true;
      return Boolean(row?.mapping?.primaryMajor);
    }
    if ((q as any).inputType === "state") return Boolean((answers[qId] as any)?.value);
    if (qId === "Q3" || qId === "Q4") {
      const selected = ((answers[qId] as any)?.mapping?.selectedTexts as string[]) || [];
      return selected.length > 0;
    }
    return Boolean((answers[qId] as any)?.text);
  }

  function onPickHollandBinary(side: "A" | "B") {
    const idx = interestIndexFromQuestionId(qId);
    if (idx === null) return;
    const pair = hollandPairs[idx];
    const winLetter = side === "A" ? pair.A.type : pair.B.type;
    persist({
      ...answers,
      [qId]: {
        text: side,
        mapping: { choice: side, winLetter },
      },
    });
  }

  function goNext() {
    if (isEduInterestMajorsQuestionId(qId) && readPrimaryMajorsForQuestion(answers, qId as MultiMajorQuestionId).length === 0) {
      persist(persistEmptyEduInterest(answers, qId as MultiMajorQuestionId));
    }
    if (qId === "INTEREST_12") {
      const choices = INTEREST_QUESTION_IDS.map((id) => {
        const a = answers[id] as { mapping?: { choice?: string } } | undefined;
        return a?.mapping?.choice as "A" | "B" | undefined;
      });
      if (choices.every((c) => c === "A" || c === "B")) {
        const code = computeHollandCodeFromChoices(choices as ("A" | "B")[]);
        persist({ ...answers, hollandCode: code });
      }
    }
    if (index < questionOrder.length - 1) {
      setIndex(index + 1);
      return;
    }
    router.push("/results");
  }

  function goBack() {
    if (index > 0) setIndex(index - 1);
  }

  function jumpToQuestion(qId: string) {
    if (qId === "PERSONA") return;
    const idx = questionOrder.indexOf(qId);
    if (idx >= 0) {
      setIndex(idx);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  if (!mounted) {
    return (
      <div style={{ background: "var(--paper)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>Loading…</p>
      </div>
    );
  }

  if (!q) {
    return (
      <div style={{ background: "var(--paper)", minHeight: "100vh", padding: "2rem" }}>
        <p style={{ color: "var(--muted)" }}>Quiz data not found. Try rebuilding data/quiz-data.json.</p>
      </div>
    );
  }

  const saved = answers[qId] as any;

  return (
    <>
      <div className="quiz-wrapper" style={{ background: "var(--paper)", minHeight: "100vh" }}>
        <main className="quiz-main" style={{ maxWidth: 680, margin: "0 auto", padding: "2rem 2rem 6rem" }}>

          {/* Nav */}
          <div style={{ marginBottom: "2rem" }}>
            <Link href="/" style={{ textDecoration: "none" }}>
              <span className="logo">best<span className="logo-accent">career</span>for.me</span>
            </Link>
          </div>

          {/* Progress bar */}
          {questionOrder.length > 0 && (
            <div style={{ marginBottom: "2rem" }}>
              <div style={{ height: 4, width: "100%", borderRadius: 2, background: "var(--border)" }}>
                <div style={{
                  height: 4,
                  borderRadius: 2,
                  background: "var(--amber)",
                  width: `${pct}%`,
                  transition: "width 0.3s ease",
                }} />
              </div>
              <div style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "var(--muted)" }}>
                Question {index + 1} of {questionOrder.length}
              </div>
              {interestIndexFromQuestionId(qId) !== null && (
                <div style={{ marginTop: "0.35rem", fontSize: "0.72rem", color: "var(--muted)" }}>
                  Interest question {interestIndexFromQuestionId(qId)! + 1} of {HOLLAND_PAIR_COUNT}
                </div>
              )}
            </div>
          )}

          {/* Persona chip */}
          {personaId && PERSONA_META[personaId] && (() => {
            const { icon: Icon } = PERSONA_META[personaId];
            return (
              <div style={{ marginBottom: "1.5rem" }}>
                <div style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  background: "var(--cream)",
                  border: "1px solid var(--border)",
                  borderRadius: 100,
                  padding: "0.3rem 0.9rem",
                  fontSize: "0.8rem",
                  color: "var(--muted)",
                }}>
                  <Icon size={13} style={{ color: "var(--amber)" }} aria-hidden="true" />
                  {PERSONA_TITLES[personaId]}
                </div>
              </div>
            );
          })()}

          {/* Question card */}
          <div className="card">
            {(q as any).label && (
              <div style={{
                fontSize: "0.7rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--amber)",
                marginBottom: "0.75rem",
              }}>
                {(q as any).label}
              </div>
            )}

            <h1 style={{
              fontFamily: "var(--font-playfair), 'Playfair Display', serif",
              fontSize: "1.3rem",
              lineHeight: 1.4,
              marginBottom: "1.5rem",
              color: "var(--ink)",
            }}>
              {(q as any).text}
            </h1>

            {/* Persona selection grid */}
            {(q as any).kind === "persona" ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }} className="persona-grid">
                {(q as any).options.map((o: any) => {
                  const meta = PERSONA_META[o.personaId as PersonaId];
                  const Icon = meta?.icon;
                  return (
                    <button
                      key={o.personaId}
                      type="button"
                      onClick={() => {
                        persist({ ...answers, personaId: { value: o.personaId } });
                        setIndex(0);
                      }}
                      className="persona-card-btn"
                      style={{
                        background: "var(--paper)",
                        border: "1.5px solid var(--border)",
                        borderRadius: 12,
                        padding: "1.25rem",
                        textAlign: "left",
                        cursor: "pointer",
                      }}
                    >
                      {Icon && (
                        <div style={{ marginBottom: "0.75rem" }}>
                          <Icon size={28} style={{ color: "var(--amber)" }} aria-hidden="true" />
                        </div>
                      )}
                      <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--ink)", marginBottom: "0.35rem" }}>
                        {o.title}
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "var(--muted)", lineHeight: 1.5 }}>
                        {meta?.description || o.subtitle}
                      </div>
                    </button>
                  );
                })}
              </div>

            ) : (q as any).kind === "hollandBinary" ? (
              (() => {
                const hb = q as Extract<ClientQuestion, { kind: "hollandBinary" }>;
                const pair = hb.pair;
                const picked = (saved?.mapping?.choice as string | undefined) || "";
                const cardBase: CSSProperties = {
                  flex: 1,
                  minHeight: 120,
                  padding: "1.1rem 1rem",
                  textAlign: "left",
                  borderRadius: 12,
                  border: "1.5px solid var(--border)",
                  background: "var(--paper)",
                  cursor: "pointer",
                  fontSize: "0.92rem",
                  lineHeight: 1.45,
                  color: "var(--ink)",
                  transition: "border-color 0.15s, background 0.15s",
                };
                return (
                  <div>
                    <div
                      className="holland-binary-row"
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.75rem",
                        alignItems: "stretch",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => onPickHollandBinary("A")}
                        className={`holland-binary-card${picked === "A" ? " selected" : ""}`}
                        style={cardBase}
                      >
                        {pair.A.text}
                      </button>
                      <div
                        className="holland-binary-or"
                        style={{
                          textAlign: "center",
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          color: "var(--muted)",
                          letterSpacing: "0.06em",
                        }}
                      >
                        or
                      </div>
                      <button
                        type="button"
                        onClick={() => onPickHollandBinary("B")}
                        className={`holland-binary-card${picked === "B" ? " selected" : ""}`}
                        style={cardBase}
                      >
                        {pair.B.text}
                      </button>
                    </div>
                  </div>
                );
              })()

            ) : (q as any).kind === "jobSearch" ? (
              <div>
                <input
                  type="text"
                  value={jobQuery || (answers[qId] as any)?.text || ""}
                  onChange={(e) => setJobQuery(e.target.value)}
                  placeholder="Start typing a job title…"
                  style={{ marginBottom: "0.75rem" }}
                />
                <div style={{
                  maxHeight: 256,
                  overflowY: "auto",
                  border: "1.5px solid var(--border)",
                  borderRadius: 8,
                  background: "var(--paper)",
                }}>
                  {(() => {
                    const query = jobQuery.trim().toLowerCase();
                    if (query.length < 2) {
                      return <div style={{ padding: "0.75rem 1rem", fontSize: "0.85rem", color: "var(--muted)" }}>Type at least 2 characters to search.</div>;
                    }
                    const JOB_SEARCH_LIMIT = 100;
                    return ((careers as any[]) || [])
                      .filter((c) => {
                        const name = String(c.name || "").toLowerCase();
                        if (name.includes(query)) return true;
                        const alts = Array.isArray(c.alternativeJobTitles) ? c.alternativeJobTitles : [];
                        return alts.some((t: any) => String(t || "").toLowerCase().includes(query));
                      })
                      .map((c) => ({ c, score: jobTitleSearchScore(c, query) }))
                      .filter(({ score }) => score > 0)
                      .sort((a, b) => b.score - a.score || String(a.c.name).localeCompare(String(b.c.name)))
                      .slice(0, JOB_SEARCH_LIMIT)
                      .map(({ c }) => (
                        <button
                          key={c.soc}
                          type="button"
                          onClick={() => {
                            persist({
                              ...answers,
                              [qId]: {
                                text: String(c.name),
                                mapping: { soc: String(c.soc), socMajorGroup: getSocMajorGroup(String(c.soc)) },
                              },
                            });
                            setJobQuery(String(c.name));
                          }}
                          className="search-result-btn"
                          style={{
                            display: "block",
                            width: "100%",
                            textAlign: "left",
                            padding: "0.75rem 1rem",
                            background: "transparent",
                            border: "none",
                            borderBottom: "1px solid var(--border)",
                            cursor: "pointer",
                            fontSize: "0.88rem",
                            color: "var(--ink)",
                          }}
                        >
                          <div style={{ fontWeight: 500 }}>{c.name}</div>
                          {Array.isArray(c.alternativeJobTitles) && c.alternativeJobTitles.length ? (
                            <div style={{ marginTop: "0.15rem", fontSize: "0.78rem", color: "var(--muted)" }}>
                              Also: {c.alternativeJobTitles.slice(0, 3).join(", ")}
                              {c.alternativeJobTitles.length > 3 ? "…" : ""}
                            </div>
                          ) : null}
                        </button>
                      ));
                  })()}
                </div>
                {(answers[qId] as any)?.mapping?.soc ? (
                  <p style={{ marginTop: "0.5rem", fontSize: "0.85rem", color: "var(--muted)" }}>
                    Selected: <span style={{ fontWeight: 500, color: "var(--ink)" }}>{(answers[qId] as any)?.text}</span>
                  </p>
                ) : null}
              </div>

            ) : (q as any).kind === "majorSearch" ? (
              isMultiMajorQuestionId(qId) ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  <p style={{ fontSize: "0.85rem", color: "var(--muted)", lineHeight: 1.5 }}>{majorMultiHint(qId)}</p>
                  <input
                    type="text"
                    value={majorQuery}
                    onChange={(e) => setMajorQuery(e.target.value)}
                    placeholder="Search and add each major…"
                  />
                  {(() => {
                    const cur = readPrimaryMajorsForQuestion(answers, qId);
                    return cur.length > 0 ? (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                        {cur.map((m) => (
                          <span
                            key={m}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.35rem",
                              borderRadius: 100,
                              border: "1px solid var(--border)",
                              background: "var(--cream)",
                              padding: "0.25rem 0.75rem",
                              fontSize: "0.82rem",
                              color: "var(--ink)",
                            }}
                          >
                            {m}
                            <button
                              type="button"
                              aria-label={`Remove ${m}`}
                              onClick={() => {
                                const next = cur.filter((x) => x !== m);
                                const nextAnswers = { ...answers };
                                if (next.length > 0) {
                                  (nextAnswers as any)[qId] = {
                                    text: next.join(", "),
                                    mapping: { primaryMajors: next, primaryMajor: next[0] },
                                  };
                                } else if (isEduInterestMajorsQuestionId(qId)) {
                                  persist(persistEmptyEduInterest(answers, qId as MultiMajorQuestionId));
                                  return;
                                } else {
                                  delete (nextAnswers as any)[qId];
                                }
                                persist(nextAnswers as Answers);
                              }}
                              style={{
                                background: "transparent",
                                border: "none",
                                cursor: "pointer",
                                color: "var(--muted)",
                                fontSize: "1rem",
                                lineHeight: 1,
                                padding: "0 0.1rem",
                              }}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : null;
                  })()}
                  <div style={{
                    maxHeight: 256,
                    overflowY: "auto",
                    border: "1.5px solid var(--border)",
                    borderRadius: 8,
                    background: "var(--paper)",
                  }}>
                    {(() => {
                      const cur = readPrimaryMajorsForQuestion(answers, qId);
                      const qry = majorQuery.trim().toLowerCase();
                      if (qry.length < 2) {
                        return <div style={{ padding: "0.75rem 1rem", fontSize: "0.85rem", color: "var(--muted)" }}>Type at least 2 characters to search.</div>;
                      }
                      return (MAJORS || [])
                        .filter((m) => String(m || "").toLowerCase().includes(qry))
                        .slice(0, 50)
                        .map((m) => {
                          const alreadyAdded = cur.some((x) => x.toLowerCase() === String(m).toLowerCase());
                          const atMax = cur.length >= 4;
                          return (
                            <button
                              key={m}
                              type="button"
                              onClick={() => {
                                if (atMax || alreadyAdded) return;
                                const next = [...cur, String(m)];
                                persist({
                                  ...answers,
                                  [qId]: {
                                    text: next.join(", "),
                                    mapping: { primaryMajors: next, primaryMajor: next[0] },
                                  },
                                });
                                setMajorQuery("");
                              }}
                              className="search-result-btn"
                              disabled={atMax || alreadyAdded}
                              style={{
                                display: "block",
                                width: "100%",
                                textAlign: "left",
                                padding: "0.75rem 1rem",
                                background: "transparent",
                                border: "none",
                                borderBottom: "1px solid var(--border)",
                                cursor: atMax || alreadyAdded ? "not-allowed" : "pointer",
                                opacity: atMax || alreadyAdded ? 0.4 : 1,
                                fontSize: "0.88rem",
                                color: "var(--ink)",
                                fontWeight: 500,
                              }}
                            >
                              {m}
                            </button>
                          );
                        });
                    })()}
                  </div>
                </div>
              ) : null

            ) : null}

            {/* State dropdown */}
            {(q as any).inputType === "state" ? (
              <div>
                <select
                  value={saved?.value ?? ""}
                  onChange={(e) => onPickState(e.target.value)}
                >
                  <option value="">Select your state</option>
                  {(q as any).states?.map((s: any) => (
                    <option key={s.abbr} value={s.abbr}>{s.name}</option>
                  ))}
                </select>
              </div>
            ) : (q as any).kind === "persona" || (q as any).kind === "hollandBinary" || (q as any).kind === "jobSearch" || (q as any).kind === "majorSearch" ? null : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {(() => {
                  const isPeopleMulti = qId === "Q3";
                  const isPhysicalMulti = qId === "Q4";
                  const baseList = (((q as any).answers || (q as any).options) as Array<{ text: string; mapping?: any }>) || [];
                  const byText = new Map(baseList.map((a) => [a.text, a] as const));
                  const orderedTexts = qId.startsWith("H")
                    ? (hollandAnswerOrder[qId] || baseList.map((a) => a.text))
                    : baseList.map((a) => a.text);
                  const ordered = orderedTexts.map((t) => byText.get(t)).filter(Boolean) as typeof baseList;

                  return ordered.map((a) => {
                    const displayText = qId.startsWith("H") ? stripHollandTag(a.text) : a.text;

                    if (isPeopleMulti || isPhysicalMulti) {
                      const selectedTexts = (saved?.mapping?.selectedTexts as string[]) || [];
                      const isSelected = selectedTexts.includes(a.text);
                      return (
                        <button
                          key={a.text}
                          type="button"
                          onClick={() => {
                            const nextSelected = isSelected
                              ? selectedTexts.filter((t) => t !== a.text)
                              : [...selectedTexts, a.text];

                            if (isPeopleMulti) {
                              const ranges = nextSelected
                                .map((t) => (baseList.find((x) => x.text === t)?.mapping as any) || {})
                                .filter((m) => m.peopleContactMin != null && m.peopleContactMax != null)
                                .map((m) => ({ min: m.peopleContactMin, max: m.peopleContactMax }));
                              onPickOption("__multi__", { selectedTexts: nextSelected, peopleContactRanges: ranges });
                              return;
                            }

                            const levels = nextSelected
                              .map((t) => (baseList.find((x) => x.text === t)?.mapping as any) || {})
                              .filter((m) => m.physicalDemandLevel)
                              .map((m) => m.physicalDemandLevel);
                            onPickOption("__multi__", { selectedTexts: nextSelected, physicalDemandLevels: levels });
                          }}
                          className={`quiz-option${isSelected ? " selected" : ""}`}
                        >
                          <span
                            style={{
                              flexShrink: 0,
                              marginTop: 2,
                              width: 18,
                              height: 18,
                              borderRadius: 4,
                              border: isSelected ? "2px solid var(--amber)" : "1.5px solid var(--border)",
                              background: isSelected ? "var(--amber)" : "transparent",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "0.65rem",
                              color: isSelected ? "var(--ink)" : "transparent",
                            }}
                            aria-hidden="true"
                          >
                            ✓
                          </span>
                          <span style={{ flex: 1 }}>{displayText}</span>
                        </button>
                      );
                    }

                    const isSelected = saved?.text === a.text;
                    return (
                      <button
                        key={a.text}
                        type="button"
                        onClick={() => onPickOption(a.text, a.mapping)}
                        className={`quiz-option${isSelected ? " selected" : ""}`}
                      >
                        <span
                          style={{
                            flexShrink: 0,
                            marginTop: 2,
                            width: 18,
                            height: 18,
                            borderRadius: "50%",
                            border: isSelected ? "2px solid var(--amber)" : "1.5px solid var(--border)",
                            background: isSelected ? "var(--amber)" : "transparent",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.65rem",
                            color: isSelected ? "var(--ink)" : "transparent",
                          }}
                          aria-hidden="true"
                        >
                          ✓
                        </span>
                        <span style={{ flex: 1 }}>{displayText}</span>
                      </button>
                    );
                  });
                })()}
              </div>
            )}
          </div>

          {/* Nav buttons */}
          <div style={{ marginTop: "2rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
            <button
              type="button"
              onClick={goBack}
              disabled={index === 0}
              className="btn-secondary"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={goNext}
              disabled={!canContinue()}
              className="btn-primary"
            >
              {index === questionOrder.length - 1 ? "See results →" : "Next →"}
            </button>
          </div>
        </main>
      </div>

      <AnswersSidebar
        answers={answers}
        answeredIds={answeredSidebarItems}
        quizData={data}
        onJumpTo={jumpToQuestion}
      />

      <style>{`
        @media (max-width: 600px) {
          .persona-grid { grid-template-columns: 1fr !important; }
        }
        @media (min-width: 640px) {
          .holland-binary-row {
            flex-direction: row !important;
            align-items: stretch !important;
          }
          .holland-binary-or {
            align-self: center !important;
            flex-shrink: 0 !important;
            padding: 0 0.35rem !important;
          }
        }
        .persona-card-btn { transition: all 0.15s; }
        .persona-card-btn:hover { border-color: var(--amber) !important; background: var(--cream) !important; }
        .search-result-btn:hover:not(:disabled) { background: var(--cream) !important; }
        .holland-binary-card {
          font-family: var(--font-dm-sans), 'DM Sans', sans-serif;
        }
        .holland-binary-card:hover:not(.selected) { border-color: var(--amber) !important; background: var(--cream) !important; }
        .holland-binary-card.selected { border-color: var(--amber) !important; background: rgba(200, 132, 58, 0.1) !important; }
      `}</style>
    </>
  );
}
