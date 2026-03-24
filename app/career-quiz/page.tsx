"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import careers from "@/data/careers.json";
import majorsData from "@/data/majors.json";
import quizData from "@/data/quiz-data.json";
import type { Answers, P1Question, QuizData } from "@/lib/types";
import { readPrimaryMajorsForQuestion, type MultiMajorQuestionId } from "@/lib/scoring";

const QUIZ_STORAGE_KEY = "bestcareerfor.me:quiz_answers:v1";

type PersonaId = "P1" | "P3" | "P4" | "P5";

const MAJORS = majorsData as string[];

function isMultiMajorQuestionId(qId: string): qId is MultiMajorQuestionId {
  return qId === "P3_MAJOR" || qId === "P4_MAJOR" || qId === "P5_MAJOR";
}

function majorMultiHint(qId: MultiMajorQuestionId): string {
  if (qId === "P3_MAJOR") {
    return "Add up to four majors or fields of study (what you studied or are studying). Matches use any of your selections; careers that align with more than one rank higher.";
  }
  if (qId === "P4_MAJOR") {
    return "Add up to four majors or fields of study from your background. Matches use any of your selections; careers that align with more than one rank higher.";
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
        // Clean up URL without reset param
        router.replace("/career-quiz");
        return;
      }
      const raw = localStorage.getItem(QUIZ_STORAGE_KEY);
      if (raw) setAnswers(JSON.parse(raw) as Answers);
    } catch {
      // ignore storage errors in MVP
    }
  }, [router]);

  const personaId = (answers.personaId as any)?.value as PersonaId | undefined;

  const questionOrder: string[] = useMemo(() => {
    if (!personaId) return ["PERSONA"];
    if (personaId === "P1") {
      const p1Base = ["P1_EDU_OPEN"];
      const p1Open = (answers.P1_EDU_OPEN as any)?.mapping?.openToMoreEducation as boolean | undefined;
      const p1Ceil = p1Open === true ? ["P1_EDU_CEIL"] : [];
      return [...p1Base, ...p1Ceil, ...(data.questionOrder || [])];
    }

    if (personaId === "P3") {
      const base = ["P3_MAJOR", "P3_MAJOR_SCOPE", "P3_EDU_OPEN"];
      const p3Open = (answers.P3_EDU_OPEN as any)?.mapping?.openToMoreEducation as boolean | undefined;
      const p3Ceil = p3Open === true ? ["P3_EDU_CEIL"] : [];
      const qualifiedNow = (answers.P3_QUALIFIED_NOW as any)?.mapping?.p3QualifiedNow as boolean | undefined;
      const experienceQ = qualifiedNow === true ? ["P3_EXPERIENCE"] : [];
      const holland = Array.from({ length: 7 }, (_, i) => `H${i + 1}`);
      const shared = ["Q2", "Q3", "Q4", "Q5", "Q6", "Q7", "Q8", "Q9"];
      return [...base, ...p3Ceil, "P3_QUALIFIED_NOW", ...experienceQ, ...holland, ...shared];
    }

    // Persona 4: current job, education completed, major (skip if high school or certificate), education ceiling, holland, shared
    if (personaId === "P4") {
      const eduCompleted = (answers.P4_EDU_COMPLETED as any)?.mapping?.educationCompleted as string | undefined;
      const skipMajor = eduCompleted === "highschool" || eduCompleted === "certificate";
      const base = ["P4_JOB", "P4_EDU_COMPLETED", ...(skipMajor ? [] : ["P4_MAJOR"]), "P4_EDU_OPEN"];
      const eduOpen = (answers.P4_EDU_OPEN as any)?.mapping?.openToMoreEducation as boolean | undefined;
      const eduCeil = eduOpen === true ? ["P4_EDU_CEIL"] : [];
      const holland = Array.from({ length: 7 }, (_, i) => `H${i + 1}`);
      const shared = ["Q2", "Q3", "Q4", "Q5", "Q6", "Q7", "Q8", "Q9"];
      return [...base, ...eduCeil, ...holland, ...shared];
    }

    // Persona 5: career change — education, background major + scope, no current-job filter
    if (personaId === "P5") {
      const eduCompleted = (answers.P5_EDU_COMPLETED as any)?.mapping?.educationCompleted as string | undefined;
      const skipMajor = eduCompleted === "highschool" || eduCompleted === "certificate";
      const base = ["P5_EDU_COMPLETED", ...(skipMajor ? [] : ["P5_MAJOR", "P5_MAJOR_SCOPE"]), "P5_EDU_OPEN"];
      const eduOpen = (answers.P5_EDU_OPEN as any)?.mapping?.openToMoreEducation as boolean | undefined;
      const eduCeil = eduOpen === true ? ["P5_EDU_CEIL"] : [];
      const holland = Array.from({ length: 7 }, (_, i) => `H${i + 1}`);
      const shared = ["Q2", "Q3", "Q4", "Q5", "Q6", "Q7", "Q8", "Q9"];
      return [...base, ...eduCeil, ...holland, ...shared];
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
            title: "Working Right Now, Looking to Advance",
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
      return {
        id: "P3_MAJOR",
        kind: "majorSearch",
        text: "What did you study, or what are you currently studying?",
      };
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
          { text: "No — I want options that don’t require more school", mapping: { openToMoreEducation: false } },
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
      return {
        id: "P4_MAJOR",
        kind: "majorSearch",
        text: "What did you study, or what are you currently studying?",
      };
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
      return {
        id: "P5_MAJOR",
        kind: "majorSearch",
        text: "What did you study, or what background do you bring from past education?",
      };
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

  if (!q) {
    return (
      <main className="mx-auto max-w-xl p-6">
        <h1 className="text-2xl font-semibold">Career quiz</h1>
        <p className="mt-4 text-sm text-zinc-600">
          Quiz data not found or question missing. Try rebuilding `data/quiz-data.json`.
        </p>
      </main>
    );
  }

  const saved = answers[qId] as any;

  if (!mounted) {
    return (
      <main className="mx-auto max-w-xl p-6">
        <h1 className="text-2xl font-semibold">Career quiz</h1>
        <p className="mt-4 text-sm text-zinc-600">Loading…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl p-6">
      <div className="mb-6">
        <a
          href="/career-quiz?reset=1"
          className="text-sm font-semibold text-white underline underline-offset-4"
        >
          Best Career for Me
        </a>
      </div>
      <div className="mb-6">
        <div className="h-2 w-full rounded bg-zinc-200">
          <div className="h-2 rounded bg-zinc-900" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-2 text-xs text-zinc-600">
          Question {index + 1} of {questionOrder.length}
        </div>
      </div>

      <h1 className="text-2xl font-semibold leading-snug">{(q as any).text}</h1>

      {(q as any).kind === "persona" ? (
        <div className="mt-6 space-y-3">
          {(q as any).options.map((o: any) => (
            <button
              key={o.personaId}
              type="button"
              onClick={() => {
                persist({ ...answers, personaId: { value: o.personaId } });
                setIndex(0);
              }}
              className="w-full rounded border border-zinc-300 bg-white p-4 text-left text-zinc-900 hover:bg-zinc-50"
            >
              <div className="font-semibold">{o.title}</div>
              <div className="mt-1 text-sm text-zinc-600">{o.subtitle}</div>
            </button>
          ))}
        </div>
      ) : (q as any).kind === "jobSearch" ? (
        <div className="mt-6">
          <input
            className="w-full rounded border border-zinc-300 bg-white p-3 text-zinc-900"
            value={jobQuery || (answers[qId] as any)?.text || ""}
            onChange={(e) => setJobQuery(e.target.value)}
            placeholder="Start typing a job title…"
          />
          <div className="mt-3 max-h-64 overflow-auto rounded border border-zinc-300 bg-white">
            {(() => {
              const q = jobQuery.trim().toLowerCase();
              const jobKey = qId as "P4_JOB";
              if (q.length < 2) {
                return <div className="p-3 text-sm text-zinc-600">Type at least 2 characters to search.</div>;
              }
              return ((careers as any[]) || [])
                .filter((c) => {
                  const name = String(c.name || "").toLowerCase();
                  if (name.includes(q)) return true;
                  const alts = Array.isArray(c.alternativeJobTitles) ? c.alternativeJobTitles : [];
                  return alts.some((t: any) => String(t || "").toLowerCase().includes(q));
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
                    className="block w-full border-b border-zinc-200 p-3 text-left text-sm text-zinc-900 hover:bg-zinc-50"
                  >
                    <div className="font-medium">{c.name}</div>
                    {Array.isArray(c.alternativeJobTitles) && c.alternativeJobTitles.length ? (
                      <div className="mt-0.5 text-xs text-zinc-600">
                        Also known as: {c.alternativeJobTitles.slice(0, 3).join(", ")}
                        {c.alternativeJobTitles.length > 3 ? "…" : ""}
                      </div>
                    ) : null}
                  </button>
                ));
            })()}
          </div>
          {(answers[qId] as any)?.mapping?.soc ? (
            <p className="mt-2 text-sm text-zinc-600">
              Selected: <span className="font-medium text-zinc-900">{(answers[qId] as any)?.text}</span>
            </p>
          ) : null}
        </div>
      ) : (q as any).kind === "majorSearch" ? (
        isMultiMajorQuestionId(qId) ? (
          <div className="mt-6 space-y-3">
            <p className="text-sm text-zinc-600">{majorMultiHint(qId)}</p>
            <input
              className="w-full rounded border border-zinc-300 bg-white p-3 text-zinc-900"
              value={majorQuery}
              onChange={(e) => setMajorQuery(e.target.value)}
              placeholder="Search and add each major…"
            />
            {(() => {
              const cur = readPrimaryMajorsForQuestion(answers, qId);
              return cur.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {cur.map((m) => (
                    <span
                      key={m}
                      className="inline-flex items-center gap-1 rounded-full border border-zinc-300 bg-zinc-50 px-3 py-1 text-sm text-zinc-900"
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
                        className="ml-0.5 rounded px-1 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              ) : null;
            })()}
            <div className="max-h-64 overflow-auto rounded border border-zinc-300 bg-white">
              {(() => {
                const cur = readPrimaryMajorsForQuestion(answers, qId);
                const qry = majorQuery.trim().toLowerCase();
                if (qry.length < 2) {
                  return <div className="p-3 text-sm text-zinc-600">Type at least 2 characters to search.</div>;
                }
                return (MAJORS || [])
                  .filter((m) => String(m || "").toLowerCase().includes(qry))
                  .slice(0, 50)
                  .map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        if (cur.length >= 4) return;
                        if (cur.some((x) => x.toLowerCase() === String(m).toLowerCase())) return;
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
                      className="block w-full border-b border-zinc-200 p-3 text-left text-sm text-zinc-900 hover:bg-zinc-50 disabled:opacity-40"
                      disabled={cur.length >= 4 || cur.some((x) => x.toLowerCase() === String(m).toLowerCase())}
                    >
                      <div className="font-medium">{m}</div>
                    </button>
                  ));
              })()}
            </div>
          </div>
        ) : null
      ) : null}

      {(q as any).inputType === "state" ? (
        <div className="mt-6">
          <select
            className="w-full rounded border border-zinc-300 bg-white p-3 text-zinc-900"
            value={saved?.value ?? ""}
            onChange={(e) => onPickState(e.target.value)}
          >
            <option value="">Select your state</option>
            {(q as any).states?.map((s: any) => (
              <option key={s.abbr} value={s.abbr}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      ) : (q as any).kind === "persona" || (q as any).kind === "jobSearch" || (q as any).kind === "majorSearch" ? null : (
        <div className="mt-6 space-y-3">
          {(() => {
            const isPeopleMulti = qId === "Q3";
            const isPhysicalMulti = qId === "Q4";

            const baseList =
              (((q as any).answers || (q as any).options) as Array<{ text: string; mapping?: any }>) || [];
            const answersList = baseList;

            const byText = new Map(answersList.map((a) => [a.text, a] as const));
            const orderedTexts = qId.startsWith("H") ? (hollandAnswerOrder[qId] || answersList.map((a) => a.text)) : answersList.map((a) => a.text);
            const ordered = orderedTexts.map((t) => byText.get(t)).filter(Boolean) as typeof answersList;

            return ordered.map((a) => {
              const displayText = qId.startsWith("H") ? stripHollandTag(a.text) : a.text;

              if (isPeopleMulti || isPhysicalMulti) {
                const selectedTexts = (saved?.mapping?.selectedTexts as string[]) || [];
                const selected = selectedTexts.includes(a.text);
                return (
                  <button
                    key={a.text}
                    type="button"
                    onClick={() => {
                      const nextSelected = selected
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
                    className={[
                      "flex w-full items-start gap-3 rounded border p-4 text-left text-zinc-900 transition",
                      selected
                        ? "border-zinc-900 bg-zinc-50 ring-2 ring-zinc-900/10"
                        : "border-zinc-300 bg-white hover:bg-zinc-50",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded border text-xs",
                        selected
                          ? "border-zinc-900 bg-zinc-900 text-white"
                          : "border-zinc-300 bg-white text-transparent",
                      ].join(" ")}
                      aria-hidden="true"
                    >
                      ✓
                    </span>
                    <span className="flex-1">{displayText}</span>
                  </button>
                );
              }

              const selected = saved?.text === a.text;
              return (
                <button
                  key={a.text}
                  type="button"
                  onClick={() => onPickOption(a.text, a.mapping)}
                  className={[
                    "flex w-full items-start gap-3 rounded border p-4 text-left text-zinc-900 transition",
                    selected
                      ? "border-zinc-900 bg-zinc-50 ring-2 ring-zinc-900/10"
                      : "border-zinc-300 bg-white hover:bg-zinc-50",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full border text-xs",
                      selected
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-zinc-300 bg-white text-transparent",
                    ].join(" ")}
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                  <span className="flex-1">{displayText}</span>
                </button>
              );
            });
          })()}
        </div>
      )}

      <div className="mt-8 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={goBack}
          disabled={index === 0}
          className="rounded border border-zinc-300 px-4 py-2 text-sm disabled:opacity-50"
        >
          Back
        </button>
        <button
          type="button"
          onClick={goNext}
          disabled={!canContinue()}
          className="rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {index === questionOrder.length - 1 ? "See results" : "Next"}
        </button>
      </div>
    </main>
  );
}

