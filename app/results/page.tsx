"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import careers from "@/data/careers.json";
import stateDemand from "@/data/stateDemand.json";
import quizData from "@/data/quiz-data.json";
import { scoreAndRankCareersWithDebug } from "@/lib/scoring";
import type { Answers, CareerData, QuizData } from "@/lib/types";

const QUIZ_STORAGE_KEY = "bestcareerfor.me:quiz_answers:v1";

export default function ResultsPage() {
  const router = useRouter();
  const [answers, setAnswers] = useState<Answers | null>(null);
  const [feedback, setFeedback] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(QUIZ_STORAGE_KEY);
      setAnswers(raw ? (JSON.parse(raw) as Answers) : {});
    } catch {
      setAnswers({});
    }
  }, []);

  const results = useMemo(() => {
    if (!answers) return [];
    const qd = quizData as QuizData;
    const cd: CareerData = { careers: careers as any, stateDemand: stateDemand as any };
    return scoreAndRankCareersWithDebug(answers, qd, cd).results.slice(0, 8);
  }, [answers]);

  const debugInfo = useMemo(() => {
    if (!answers) return null;
    const qd = quizData as QuizData;
    const cd: CareerData = { careers: careers as any, stateDemand: stateDemand as any };
    const isDebug = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("debug") === "1";
    if (!isDebug) return null;
    return scoreAndRankCareersWithDebug(answers, qd, cd).debug;
  }, [answers]);

  const selectedState = ((answers as any)?.Q6 as any)?.value as string | undefined;
  const willingToRelocate = ((answers as any)?.Q7 as any)?.mapping?.willingToRelocate as boolean | undefined;
  const personaId = ((answers as any)?.personaId as any)?.value as string | undefined;

  function getDemandForCareerInState(soc: string): string | null {
    if (!selectedState) return null;
    const normSoc = soc.replace(/\.\d+$/, "");
    const row = (stateDemand as any[]).find(
      (r) => String(r.soc || "").trim() === normSoc && String(r.stateAbbr || "").trim() === selectedState
    );
    return row?.demandLevel ? String(row.demandLevel) : null;
  }

  async function submitFeedback() {
    if (!feedback.trim()) return;
    setFeedbackStatus("sending");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback, answers }),
      });
      if (!res.ok) throw new Error("bad status");
      setFeedbackStatus("sent");
    } catch {
      setFeedbackStatus("error");
    }
  }

  if (answers == null) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <h1 className="text-2xl font-semibold">Your results</h1>
        <p className="mt-4 text-sm text-zinc-600">Loading…</p>
      </main>
    );
  }

  function applyAnswerPatch(patch: Partial<Answers>) {
    const next = { ...(answers as Answers), ...(patch as any) } as Answers;
    setAnswers(next);
    try {
      localStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore storage errors in MVP
    }
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <div className="mb-4">
        <a
          href="/career-quiz?reset=1"
          className="text-sm font-semibold text-white underline underline-offset-4"
        >
          Best Career for Me
        </a>
      </div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Your career matches</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Showing top {results.length} matches from a small MVP dataset.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/career-quiz")}
          className="rounded border border-zinc-300 px-3 py-2 text-sm"
        >
          Edit answers
        </button>
      </div>

      {/* Feedback near the top */}
      <section className="mt-6 rounded border border-zinc-300 bg-white p-4">
        <h2 className="text-base font-semibold">Help us improve</h2>
        <p className="mt-1 text-sm text-zinc-600">
          This quiz is in beta. What worked, what didn’t, and what careers were you hoping to see?
        </p>
        <textarea
          className="mt-3 w-full rounded border border-zinc-300 p-3 text-sm"
          rows={4}
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Write your feedback here…"
        />
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={submitFeedback}
            disabled={feedbackStatus === "sending" || !feedback.trim()}
            className="rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {feedbackStatus === "sending" ? "Sending…" : feedbackStatus === "sent" ? "Sent" : "Submit feedback"}
          </button>
          {feedbackStatus === "sent" && <span className="text-sm text-green-700">Thank you!</span>}
          {feedbackStatus === "error" && (
            <span className="text-sm text-red-700">Could not send. Try again.</span>
          )}
        </div>
      </section>

      {debugInfo ? (
        <section className="mt-6 rounded border border-amber-300 bg-amber-50 p-4">
          <h2 className="text-base font-semibold">Debug (why zero results?)</h2>
          <p className="mt-1 text-sm text-zinc-700">
            You are viewing scoring debug mode because `?debug=1` is set in the URL.
          </p>
          <pre className="mt-3 overflow-auto rounded border border-amber-200 bg-white p-3 text-xs text-zinc-900">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </section>
      ) : null}

      <section className="mt-8 space-y-4">
        {results.length ? (
          results.map((c) => (
            <article key={c.soc} className="rounded border border-zinc-300 bg-white p-4">
              <h3 className="text-lg font-semibold text-zinc-950">{c.name}</h3>
              <div className="mt-1 text-sm text-zinc-600">
                Median salary: ${Math.round(c.medianSalary || 0).toLocaleString()} · Match: {c.hollandScore || 0}
              </div>

              <div className="mt-3 grid gap-1 text-sm text-zinc-800">
                <div>
                  <span className="font-medium">Job demand in your area:</span>{" "}
                  {selectedState ? (
                    <>
                      <span>{getDemandForCareerInState(c.soc) ?? "Unknown"}</span>
                    </>
                  ) : (
                    <span className="text-zinc-600">Unknown (no state selected)</span>
                  )}
                </div>
                <div>
                  <span className="font-medium">Education requirements:</span>{" "}
                  <span>{c.educationRequirements ? String(c.educationRequirements) : "Unknown"}</span>
                </div>
                <div>
                  <span className="font-medium">Experience requirements:</span>{" "}
                  <span>{(c as any).experienceRequirements ? String((c as any).experienceRequirements) : "Unknown"}</span>
                </div>
                <div>
                  <a
                    className="font-medium underline underline-offset-2"
                    href="https://willrobotstakemyjob.com/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Risk of AI disruption:
                  </a>{" "}
                  <span>{Number(c.aiReplacementRisk || 0).toFixed(1)}%</span>
                </div>
              </div>

              {c.jobDescription ? (
                <p className="mt-3 text-sm text-zinc-800">
                  {c.jobDescription.length > 320 ? c.jobDescription.slice(0, 320) + "…" : c.jobDescription}
                </p>
              ) : (
                <p className="mt-3 text-sm text-zinc-600">No job description available.</p>
              )}
            </article>
          ))
        ) : (
          <article className="rounded border border-zinc-300 bg-white p-4">
            <h3 className="text-lg font-semibold text-zinc-950">No matches found</h3>
            <p className="mt-1 text-sm text-zinc-600">
              Don’t worry — small tweaks usually unlock more options.
            </p>
          </article>
        )}
      </section>

      <section className="mt-6 rounded border border-zinc-300 bg-white p-4 text-zinc-900">
        <h2 className="text-base font-semibold">Want more options?</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Try any one of these and you should get more results back:
        </p>
        <div className="mt-4 grid gap-3">
          {personaId === "P2" ? (
            <button
              type="button"
              onClick={() =>
                applyAnswerPatch({
                  P2_DIRECTION: {
                    text: "I want to move into something completely different",
                    mapping: { p2Direction: "different" },
                  } as any,
                })
              }
              className="rounded border border-zinc-300 bg-white px-4 py-3 text-left text-sm text-zinc-900 hover:bg-zinc-50"
            >
              <div className="font-medium">Set career direction to “different”</div>
              <div className="mt-0.5 text-xs text-zinc-600">Shows jobs unrelated to your current job.</div>
            </button>
          ) : null}

          <button
            type="button"
            onClick={() =>
              applyAnswerPatch({
                Q5: { text: "Enough to cover my basics and have some freedom (avg $40k–$60k)", mapping: { salaryFloor: 40000 } } as any,
              })
            }
            className="rounded border border-zinc-300 bg-white px-4 py-3 text-left text-sm text-zinc-900 hover:bg-zinc-50"
          >
            <div className="font-medium">Lower salary floor</div>
            <div className="mt-0.5 text-xs text-zinc-600">Example: $40k–$60k.</div>
          </button>

          {personaId === "P2" ? (
            <button
              type="button"
              onClick={() =>
                applyAnswerPatch({
                  P2_EDU_OPEN: { text: "Yes", mapping: { openToMoreEducation: true } } as any,
                  P2_EDU_CEIL: { text: "Bachelor's degree", mapping: { educationCeiling: "bachelor" } } as any,
                })
              }
              className="rounded border border-zinc-300 bg-white px-4 py-3 text-left text-sm text-zinc-900 hover:bg-zinc-50"
            >
              <div className="font-medium">Raise education ceiling</div>
              <div className="mt-0.5 text-xs text-zinc-600">Example: bachelor.</div>
            </button>
          ) : null}

          <button
            type="button"
            onClick={() =>
              applyAnswerPatch({
                Q7: { text: "Yes, I can relocate", mapping: { willingToRelocate: true } } as any,
              })
            }
            className="rounded border border-zinc-300 bg-white px-4 py-3 text-left text-sm text-zinc-900 hover:bg-zinc-50"
          >
            <div className="font-medium">Set relocation to true</div>
            <div className="mt-0.5 text-xs text-zinc-600">If you’re willing to move or commute for work.</div>
          </button>
        </div>

        <div className="mt-4">
          <button
            type="button"
            onClick={() => router.push("/career-quiz")}
            className="text-sm font-medium underline underline-offset-4"
          >
            Or edit your answers
          </button>
        </div>
      </section>
    </main>
  );
}

