"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, BookOpen, Briefcase, Compass } from "lucide-react";

import careers from "@/data/careers.json";
import majorsData from "@/data/majors.json";
import quizData from "@/data/quiz-data.json";
import type { Answers, P1Question, QuizData } from "@/lib/types";
import { readPrimaryMajorsForQuestion, type MultiMajorQuestionId } from "@/lib/scoring";
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
  P1: "Still in school",
  P3: "In college / recent grad",
  P4: "Working, looking to advance",
  P5: "Exploring a career change",
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

function majorMultiHint(qId: MultiMajorQuestionId): string {
  if (qId === "P3_MAJOR") {
    return "Add up to four majors or fields of study (what you studied or are studying). Matches use any of your selections; careers that align with more than one rank higher.";
  }
  if (qId === "P4_MAJOR") {
    return "Add up to four majors or fields of study from your background. Matches use any of your selections; careers that align with more than one rank higher.";
  }
  if (qId === "P1_EDU_INTEREST_MAJORS") {
    return "Add up to four areas you'd be interested in studying. We'll use these to broaden your matches toward careers that align with what you'd want to learn.";
  }
  if (qId === "P3_EDU_INTEREST_MAJORS") {
    return "Add up to four areas you'd be interested in studying next. We'll use these to broaden your matches toward careers that align with what you'd want to learn.";
  }
  if (qId === "P4_EDU_INTEREST_MAJORS") {
    return "Add up to four areas you'd be interested in studying. We'll use these to include advancement paths that require learning new skills.";
  }
  if (qId === "P5_EDU_INTEREST_MAJORS") {
    return "Add up to four areas you'd be interested in studying. We'll use these to surface career-change paths that align with what you'd want to learn.";
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
      id: "P3_EDU_OPEN";
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
      id: "P1_EDU_OPEN";
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
      id: "P4_EDU_COMPLETED";
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
      id: "P4_EDU_OPEN";
      kind: "singleChoice";
      text: string;
      options: Array<{ text: string; mapping: Record<string, unknown> }>;
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
      id: "P5_EDU_COMPLETED";
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
      id: "P5_EDU_OPEN";
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

function shuffleCopy<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
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
      const p1Base = ["P1_EDU_OPEN"];
      const p1Open = (answers.P1_EDU_OPEN as any)?.mapping?.openToMoreEducation as boolean | undefined;
      const p1Interest = p1Open === true ? ["P1_EDU_INTEREST_MAJORS"] : [];
      const p1Ceil = p1Open === true ? ["P1_EDU_CEIL"] : [];
      return [...p1Base, ...p1Interest, ...p1Ceil, ...(data.questionOrder || [])];
    }

    if (personaId === "P3") {
      const base = ["P3_MAJOR", "P3_MAJOR_SCOPE", "P3_EDU_OPEN"];
      const p3Open = (answers.P3_EDU_OPEN as any)?.mapping?.openToMoreEducation as boolean | undefined;
      const p3Interest = p3Open === true ? ["P3_EDU_INTEREST_MAJORS"] : [];
      const p3Ceil = p3Open === true ? ["P3_EDU_CEIL"] : [];
      const qualifiedNow = (answers.P3_QUALIFIED_NOW as any)?.mapping?.p3QualifiedNow as boolean | undefined;
      const experienceQ = qualifiedNow === true ? ["P3_EXPERIENCE"] : [];
      const holland = Array.from({ length: 7 }, (_, i) => `H${i + 1}`);
      const shared = ["Q2", "Q3", "Q4", "Q5", "Q6", "Q7", "Q8", "Q9"];
      return [...base, ...p3Interest, ...p3Ceil, "P3_QUALIFIED_NOW", ...experienceQ, ...holland, ...shared];
    }

    if (personaId === "P4") {
      const eduCompleted = (answers.P4_EDU_COMPLETED as any)?.mapping?.educationCompleted as string | undefined;
      const skipMajor = eduCompleted === "highschool" || eduCompleted === "certificate";
      const base = ["P4_JOB", "P4_EDU_COMPLETED", ...(skipMajor ? [] : ["P4_MAJOR"]), "P4_EDU_OPEN"];
      const eduOpen = (answers.P4_EDU_OPEN as any)?.mapping?.openToMoreEducation as boolean | undefined;
      const eduInterest = eduOpen === true ? ["P4_EDU_INTEREST_MAJORS"] : [];
      const eduCeil = eduOpen === true ? ["P4_EDU_CEIL"] : [];
      const holland = Array.from({ length: 7 }, (_, i) => `H${i + 1}`);
      const shared = ["Q2", "Q3", "Q4", "Q5", "Q6", "Q7", "Q8", "Q9"];
      return [...base, ...eduInterest, ...eduCeil, ...holland, ...shared];
    }

    if (personaId === "P5") {
      const eduCompleted = (answers.P5_EDU_COMPLETED as any)?.mapping?.educationCompleted as string | undefined;
      const skipMajor = eduCompleted === "highschool" || eduCompleted === "certificate";
      const base = ["P5_EDU_COMPLETED", ...(skipMajor ? [] : ["P5_MAJOR", "P5_MAJOR_SCOPE"]), "P5_EDU_OPEN"];
      const eduOpen = (answers.P5_EDU_OPEN as any)?.mapping?.openToMoreEducation as boolean | undefined;
      const eduInterest = eduOpen === true ? ["P5_EDU_INTEREST_MAJORS"] : [];
      const eduCeil = eduOpen === true ? ["P5_EDU_CEIL"] : [];
      const holland = Array.from({ length: 7 }, (_, i) => `H${i + 1}`);
      const shared = ["Q2", "Q3", "Q4", "Q5", "Q6", "Q7", "Q8", "Q9"];
      return [...base, ...eduInterest, ...eduCeil, ...holland, ...shared];
    }

    return [];
  }, [personaId, data.questionOrder, answers.P1_EDU_OPEN, answers.P3_EDU_OPEN, answers.P3_QUALIFIED_NOW, answers.P4_EDU_OPEN, answers.P4_EDU_COMPLETED, answers.P5_EDU_OPEN, answers.P5_EDU_COMPLETED]);

  const qId = questionOrder[index] || "";

  const q: ClientQuestion | null = useMemo(() => {
    if (qId === "PERSONA") {
      return {
        id: "PERSONA",
        kind: "persona",
        text: "Which of these best describes you right now?",
        options: [
          {
            personaId: "P1",
            title: "Still in school",
            subtitle: "High school / early college — figuring out what to study",
          },
          {
            personaId: "P3",
            title: "In college / recent grad",
            subtitle: "College student or recent graduate — deciding what to do with your degree",
          },
          {
            personaId: "P4",
            title: "Working, looking to advance",
            subtitle: "Currently working — want to grow or move within your current line of work",
          },
          {
            personaId: "P5",
            title: "Exploring a career change",
            subtitle: "Considering a new field or path — not tied to your current line of work",
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
    if (qId === "P3_EDU_OPEN") {
      return {
        id: "P3_EDU_OPEN",
        kind: "singleChoice",
        text: "Are you open to pursuing additional education or training to advance your career?",
        options: [
          { text: "Yes", mapping: { openToMoreEducation: true } },
          { text: "No — I want options based on what I already have", mapping: { openToMoreEducation: false } },
        ],
      };
    }
    if (qId === "P3_EDU_INTEREST_MAJORS") {
      return { id: "P3_EDU_INTEREST_MAJORS", kind: "majorSearch", text: "If you pursued more education, what would you be interested in studying?" };
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
    if (qId === "P1_EDU_OPEN") {
      return {
        id: "P1_EDU_OPEN",
        kind: "singleChoice",
        text: "Are you open to pursuing additional education or training for your future career?",
        options: [
          { text: "Yes", mapping: { openToMoreEducation: true } },
          { text: "No — I want options that don't require more school", mapping: { openToMoreEducation: false } },
        ],
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
      return { id: "P1_EDU_INTEREST_MAJORS", kind: "majorSearch", text: "If you pursued more education, what would you be interested in studying?" };
    }
    if (qId === "P4_EDU_COMPLETED") {
      return {
        id: "P4_EDU_COMPLETED",
        kind: "singleChoice",
        text: "What is the highest level of education you have completed?",
        options: [
          { text: "High school diploma or equivalent", mapping: { educationCompleted: "highschool" } },
          { text: "Post-secondary certificate", mapping: { educationCompleted: "certificate" } },
          { text: "Associate degree", mapping: { educationCompleted: "associate" } },
          { text: "Bachelor's degree", mapping: { educationCompleted: "bachelor" } },
          { text: "Master's degree", mapping: { educationCompleted: "master" } },
          { text: "Doctoral / professional degree", mapping: { educationCompleted: "doctoral" } },
        ],
      };
    }
    if (qId === "P4_MAJOR") {
      return { id: "P4_MAJOR", kind: "majorSearch", text: "What did you study, or what are you currently studying?" };
    }
    if (qId === "P4_EDU_OPEN") {
      return {
        id: "P4_EDU_OPEN",
        kind: "singleChoice",
        text: "Are you open to pursuing additional education or training to advance your career?",
        options: [
          { text: "Yes", mapping: { openToMoreEducation: true } },
          { text: "No — I want options based on what I already have", mapping: { openToMoreEducation: false } },
        ],
      };
    }
    if (qId === "P4_EDU_INTEREST_MAJORS") {
      return { id: "P4_EDU_INTEREST_MAJORS", kind: "majorSearch", text: "If you pursued more education, what would you be interested in studying?" };
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
    if (qId === "P5_EDU_COMPLETED") {
      return {
        id: "P5_EDU_COMPLETED",
        kind: "singleChoice",
        text: "What is the highest level of education you have completed?",
        options: [
          { text: "High school diploma or equivalent", mapping: { educationCompleted: "highschool" } },
          { text: "Post-secondary certificate", mapping: { educationCompleted: "certificate" } },
          { text: "Associate degree", mapping: { educationCompleted: "associate" } },
          { text: "Bachelor's degree", mapping: { educationCompleted: "bachelor" } },
          { text: "Master's degree", mapping: { educationCompleted: "master" } },
          { text: "Doctoral / professional degree", mapping: { educationCompleted: "doctoral" } },
        ],
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
    if (qId === "P5_EDU_OPEN") {
      return {
        id: "P5_EDU_OPEN",
        kind: "singleChoice",
        text: "Are you open to pursuing additional education or training for a new career direction?",
        options: [
          { text: "Yes", mapping: { openToMoreEducation: true } },
          { text: "No — I want options based on what I already have", mapping: { openToMoreEducation: false } },
        ],
      };
    }
    if (qId === "P5_EDU_INTEREST_MAJORS") {
      return { id: "P5_EDU_INTEREST_MAJORS", kind: "majorSearch", text: "If you pursued more education, what would you be interested in studying?" };
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
    if ((q as any).kind === "jobSearch") return Boolean((answers[qId] as any)?.mapping?.soc);
    if ((q as any).kind === "majorSearch") {
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

  function goNext() {
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
    if (idx >= 0) setIndex(idx);
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
      <div style={{ background: "var(--paper)", minHeight: "100vh" }}>
        <main className="quiz-main" style={{ maxWidth: 680, margin: "0 auto", padding: "2rem 2rem 6rem" }}>

          {/* Nav */}
          <div style={{ marginBottom: "2rem" }}>
            <a href="/" style={{ textDecoration: "none" }}>
              <span className="logo">best<span className="logo-accent">career</span>for.me</span>
            </a>
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
                    const jobKey = qId as "P4_JOB";
                    if (query.length < 2) {
                      return <div style={{ padding: "0.75rem 1rem", fontSize: "0.85rem", color: "var(--muted)" }}>Type at least 2 characters to search.</div>;
                    }
                    return ((careers as any[]) || [])
                      .filter((c) => {
                        const name = String(c.name || "").toLowerCase();
                        if (name.includes(query)) return true;
                        const alts = Array.isArray(c.alternativeJobTitles) ? c.alternativeJobTitles : [];
                        return alts.some((t: any) => String(t || "").toLowerCase().includes(query));
                      })
                      .slice(0, 50)
                      .map((c) => (
                        <button
                          key={c.soc}
                          type="button"
                          onClick={() => {
                            persist({
                              ...answers,
                              [jobKey]: {
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
            ) : (q as any).kind === "persona" || (q as any).kind === "jobSearch" || (q as any).kind === "majorSearch" ? null : (
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
        @media (min-width: 900px) {
          .quiz-main { padding-right: calc(2rem + 260px) !important; }
        }
        @media (max-width: 600px) {
          .persona-grid { grid-template-columns: 1fr !important; }
        }
        .persona-card-btn { transition: all 0.15s; }
        .persona-card-btn:hover { border-color: var(--amber) !important; background: var(--cream) !important; }
        .search-result-btn:hover:not(:disabled) { background: var(--cream) !important; }
      `}</style>
    </>
  );
}
