"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GraduationCap, BookOpen, Briefcase, Compass, Bot, MapPin, Activity, Users, Copy, Check, RotateCcw, ChevronDown, ChevronUp, Plus } from "lucide-react";

import careers from "@/data/careers.json";
import stateDemand from "@/data/stateDemand.json";
import quizData from "@/data/quiz-data.json";
import relatedOccupations from "@/data/relatedOccupations.json";
import { parseHollandCodeString } from "@/lib/holland-binary";
import { INTEREST_QUESTION_IDS } from "@/lib/holland-pairs";
import { scoreAndRankCareersWithDebug, educationRankFromRequirement, experienceRankFromRequirement, effectiveMajorsForPersona, countSuggestedMajorMatches } from "@/lib/scoring";
import type { Answers, CareerData, QuizData } from "@/lib/types";
import { AnswersSidebar } from "@/app/components/AnswersSidebar";

const QUIZ_STORAGE_KEY = "bestcareerfor.me:quiz_answers:v1";

const PERSONA_META: Record<string, { icon: any; title: string }> = {
  P1: { icon: GraduationCap, title: "I'm still in school" },
  P3: { icon: BookOpen,      title: "Recent graduate or about to graduate" },
  P4: { icon: Briefcase,     title: "I want to move up" },
  P5: { icon: Compass,       title: "I want to change careers" },
};

export default function ResultsPage() {
  const router = useRouter();
  const [answers, setAnswers] = useState<Answers | null>(null);
  const [feedback, setFeedback] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [sortBy, setSortBy] = useState<string>("default");
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  // addedCareers: list of {afterSoc, career} — inserted immediately after the card with matching soc
  const [addedCareers, setAddedCareers] = useState<{ afterSoc: string; career: typeof allResults[0] }[]>([]);

  useEffect(() => {
    try {
      // Support shareable ?q= links
      const params = new URLSearchParams(window.location.search);
      const encoded = params.get("q");
      if (encoded) {
        const parsed = JSON.parse(decodeURIComponent(atob(encoded)));
        setAnswers(parsed as Answers);
        return;
      }
      const raw = localStorage.getItem(QUIZ_STORAGE_KEY);
      setAnswers(raw ? (JSON.parse(raw) as Answers) : {});
    } catch {
      setAnswers({});
    }
  }, []);

  const allResults = useMemo(() => {
    if (!answers) return [];
    const qd = quizData as QuizData;
    const cd: CareerData = { careers: careers as any, stateDemand: stateDemand as any };
    return scoreAndRankCareersWithDebug(answers, qd, cd).results;
  }, [answers]);

  // Lookup map for adding related careers (soc → Career with hollandScore 0)
  const careerBySOC = useMemo(() => {
    const map = new Map<string, typeof allResults[0]>();
    for (const c of careers as any[]) map.set(c.soc as string, { ...c, hollandScore: 0 });
    return map;
  }, []);

  function addRelatedCareer(afterSoc: string, relatedSoc: string) {
    const career = careerBySOC.get(relatedSoc);
    if (!career) return;
    setAddedCareers((prev) => {
      if (prev.some((a) => a.career.soc === relatedSoc)) return prev;
      return [...prev, { afterSoc, career }];
    });
  }

  const selectedState = ((answers as any)?.Q6 as any)?.value as string | undefined;

  function getDemandForCareerInState(soc: string): string | null {
    if (!selectedState) return null;
    const normSoc = soc.replace(/\.\d+$/, "");
    const row = (stateDemand as any[]).find(
      (r) => String(r.soc || "").trim() === normSoc && String(r.stateAbbr || "").trim() === selectedState
    );
    return row?.demandLevel ? String(row.demandLevel) : null;
  }

  const demandRank = (level: string | null): number => {
    if (!level) return 0;
    const l = level.toLowerCase();
    if (l.includes("high")) return 4;
    if (l.includes("average") && !l.includes("below")) return 3;
    if (l.includes("below")) return 2;
    if (l.includes("low")) return 1;
    return 0;
  };

  const results = useMemo(() => {
    const sorted = [...allResults];
    if (sortBy === "salary-desc") {
      sorted.sort((a, b) => (b.medianSalary ?? 0) - (a.medianSalary ?? 0));
    } else if (sortBy === "demand") {
      sorted.sort((a, b) => {
        const da = demandRank(getDemandForCareerInState(a.soc));
        const db = demandRank(getDemandForCareerInState(b.soc));
        return db - da;
      });
    } else if (sortBy === "edu-most") {
      sorted.sort((a, b) => {
        const ra = educationRankFromRequirement(a.educationRequirements || "") ?? -1;
        const rb = educationRankFromRequirement(b.educationRequirements || "") ?? -1;
        return rb - ra;
      });
    } else if (sortBy === "edu-least") {
      sorted.sort((a, b) => {
        const ra = educationRankFromRequirement(a.educationRequirements || "") ?? 999;
        const rb = educationRankFromRequirement(b.educationRequirements || "") ?? 999;
        return ra - rb;
      });
    } else if (sortBy === "exp-most") {
      sorted.sort((a, b) => {
        const ra = experienceRankFromRequirement((a as any).experienceRequirements || "") ?? -1;
        const rb = experienceRankFromRequirement((b as any).experienceRequirements || "") ?? -1;
        return rb - ra;
      });
    } else if (sortBy === "exp-least") {
      sorted.sort((a, b) => {
        const ra = experienceRankFromRequirement((a as any).experienceRequirements || "") ?? 999;
        const rb = experienceRankFromRequirement((b as any).experienceRequirements || "") ?? 999;
        return ra - rb;
      });
    } else if (sortBy === "ai-risk") {
      sorted.sort((a, b) => (b.aiReplacementRisk ?? 0) - (a.aiReplacementRisk ?? 0));
    }
    return sorted.slice(0, 8);
  }, [allResults, sortBy, selectedState]);

  const debugInfo = useMemo(() => {
    if (!answers) return null;
    const qd = quizData as QuizData;
    const cd: CareerData = { careers: careers as any, stateDemand: stateDemand as any };
    const isDebug = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("debug") === "1";
    if (!isDebug) return null;
    return scoreAndRankCareersWithDebug(answers, qd, cd).debug;
  }, [answers]);

  const _willingToRelocate = ((answers as any)?.Q7 as any)?.mapping?.willingToRelocate as boolean | undefined;
  const personaId = ((answers as any)?.personaId as any)?.value as string | undefined;

  const userMajors = useMemo(
    () => (answers ? effectiveMajorsForPersona(answers, personaId) : []),
    [answers, personaId]
  );

  // Prefer stored binary-quiz code; else legacy H1–H7 vote counts
  const hollandCode = useMemo(() => {
    if (!answers) return "";
    const stored = (answers as any).hollandCode as string | undefined;
    if (typeof stored === "string" && parseHollandCodeString(stored).length === 3) {
      return stored.trim().toUpperCase();
    }
    const qd = quizData as QuizData;
    const counts: Record<string, number> = {};
    for (let i = 1; i <= 7; i++) {
      const hId = `H${i}`;
      const ans = answers[hId] as any;
      if (!ans?.text) continue;
      const hq = qd.hollandQuestions.find((q) => q.id === hId);
      if (!hq) continue;
      const option = hq.answers.find((a) => a.text === ans.text);
      if (!option) continue;
      counts[option.hollandType] = (counts[option.hollandType] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([l]) => l)
      .join("");
  }, [answers]);

  // Build filter summary sentence
  const filterSummary = useMemo(() => {
    if (!answers) return "";
    const parts: string[] = [];
    const workSelectedTexts = (answers.Q2 as any)?.mapping?.selectedTexts as string[] | undefined;
    const workText = (answers.Q2 as any)?.text as string | undefined;
    if (workSelectedTexts?.length) {
      const workLabels = workSelectedTexts.map((t) => {
        const tl = t.toLowerCase();
        return tl.includes("indoor") || tl.includes("office") ? "Indoors" : tl.includes("outdoor") ? "Outdoors" : "Mixed setting";
      });
      parts.push([...new Set(workLabels)].join(" / "));
    } else if (workText) {
      const wl = workText.toLowerCase();
      parts.push(wl.includes("indoor") || wl.includes("office") ? "Indoors" : wl.includes("outdoor") ? "Outdoors" : "Mixed setting");
    }
    const salaryMin = (answers.Q5 as any)?.mapping?.salaryMin as number | undefined;
    const salaryMax = (answers.Q5 as any)?.mapping?.salaryMax as number | undefined;
    if (salaryMin != null) {
      const salaryLabel =
        salaryMax != null
          ? `$${Math.round(salaryMin / 1000)}k+ salary (target range was $${Math.round(salaryMin / 1000)}k\u2013$${Math.round(salaryMax / 1000)}k)`
          : `$${Math.round(salaryMin / 1000)}k+ salary`;
      parts.push(salaryLabel);
    }
    const jobMarketText = (answers.Q8 as any)?.text as string | undefined;
    if (jobMarketText) {
      const jl = jobMarketText.toLowerCase();
      const priority = jl.includes("high") ? "High" : jl.includes("medium") ? "Medium" : "Low";
      parts.push(`${priority} demand priority`);
    }
    const state = (answers.Q6 as any)?.value as string | undefined;
    if (state) parts.push(`in ${state}`);
    return parts.length ? `Matched to ${parts.join(", ")}` : "";
  }, [answers]);

  // All answered question IDs for sidebar
  const answeredSidebarIds = useMemo(() => {
    if (!answers) return [];
    const ids: string[] = [];
    if ((answers.personaId as any)?.value) ids.push("PERSONA");
    const qd = quizData as QuizData;
    const allKnownIds = [
      "P4_JOB", "P4_EDU_LEVEL", "P4_EDU_COMPLETED", "P4_MAJOR", "P4_EDU_OPEN", "P4_EDU_INTEREST_MAJORS", "P4_EDU_CEIL",
      "P1_EDU_LEVEL", "P1_EDU_OPEN", "P1_EDU_INTEREST_MAJORS", "P1_EDU_CEIL",
      "P3_MAJOR", "P3_MAJOR_SCOPE", "P3_EDU_LEVEL", "P3_EDU_OPEN", "P3_EDU_INTEREST_MAJORS", "P3_EDU_CEIL", "P3_QUALIFIED_NOW", "P3_EXPERIENCE",
      "P5_EDU_LEVEL", "P5_EDU_COMPLETED", "P5_MAJOR", "P5_MAJOR_SCOPE", "P5_EDU_OPEN", "P5_EDU_INTEREST_MAJORS", "P5_EDU_CEIL",
      ...Array.from({ length: 7 }, (_, i) => `H${i + 1}`),
      ...INTEREST_QUESTION_IDS,
      ...qd.p1Questions.map((q) => q.id),
    ];
    for (const id of allKnownIds) {
      if (answers[id] != null) ids.push(id);
    }
    return ids;
  }, [answers]);

  async function submitFeedback() {
    if (!feedback.trim()) return;
    setFeedbackStatus("sending");
    try {
      const qd = quizData as QuizData;
      const cd: CareerData = { careers: careers as any, stateDemand: stateDemand as any };
      const { debug } = scoreAndRankCareersWithDebug(answers as Answers, qd, cd);
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback, answers, debug }),
      });
      if (!res.ok) throw new Error("bad status");
      setFeedbackStatus("sent");
    } catch {
      setFeedbackStatus("error");
    }
  }

  async function copyResultsLink() {
    if (!answers) return;
    try {
      const encoded = btoa(encodeURIComponent(JSON.stringify(answers)));
      const url = `${window.location.origin}/results?q=${encoded}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: do nothing
    }
  }

  function startOver() {
    try { localStorage.removeItem(QUIZ_STORAGE_KEY); } catch { }
    router.push("/career-quiz?reset=1");
  }

  function toggleDescription(soc: string) {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(soc)) next.delete(soc);
      else next.add(soc);
      return next;
    });
  }

  function applyAnswerPatch(patch: Partial<Answers>) {
    const next = { ...(answers as Answers), ...(patch as any) } as Answers;
    setAnswers(next);
    try { localStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify(next)); } catch { }
  }

  if (answers == null) {
    return (
      <div style={{ background: "var(--paper)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--muted)" }}>Loading…</p>
      </div>
    );
  }

  const personaMeta = personaId ? PERSONA_META[personaId] : null;

  return (
    <>
      <div className="results-wrapper" style={{ background: "var(--paper)", minHeight: "100vh" }}>
        <main className="results-main" style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 2rem 6rem" }}>

          {/* Nav */}
          <div style={{ marginBottom: "2rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
            <Link href="/" style={{ textDecoration: "none" }}>
              <span className="logo">best<span className="logo-accent">career</span>for.me</span>
            </Link>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
              <button type="button" onClick={copyResultsLink} className="btn-secondary" style={{ fontSize: "0.82rem", padding: "0.5rem 1rem" }}>
                {copied
                  ? <><Check size={13} aria-hidden="true" /> Copied!</>
                  : <><Copy size={13} aria-hidden="true" /> Copy results link</>
                }
              </button>
              <Link
                href="/results/qa"
                className="btn-secondary"
                style={{ fontSize: "0.82rem", padding: "0.5rem 1rem", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
              >
                QA from feedback
              </Link>
              <button type="button" onClick={startOver} className="btn-secondary" style={{ fontSize: "0.82rem", padding: "0.5rem 1rem" }}>
                <RotateCcw size={13} aria-hidden="true" /> Start over
              </button>
            </div>
          </div>

          {/* Personalized header */}
          {personaMeta && (
            <section
              aria-label="Your results summary"
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 16,
                padding: "1.5rem",
                marginBottom: "1.5rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                <div style={{
                  width: 48, height: 48,
                  background: "var(--cream)",
                  border: "1px solid var(--border)",
                  borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <personaMeta.icon size={22} style={{ color: "var(--amber)" }} aria-hidden="true" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.72rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.2rem" }}>
                    Your results
                  </div>
                  <div style={{ fontSize: "1rem", fontWeight: 600, color: "var(--ink)" }}>
                    {personaMeta.title}
                  </div>
                </div>
                {hollandCode && (
                  <div style={{ textAlign: "center" }}>
                    <div style={{
                      background: "var(--ink)",
                      color: "var(--paper)",
                      borderRadius: 8,
                      padding: "0.4rem 0.85rem",
                      fontSize: "1rem",
                      fontWeight: 700,
                      letterSpacing: "0.12em",
                      fontFamily: "var(--font-playfair), 'Playfair Display', serif",
                    }}>
                      {hollandCode}
                    </div>
                    <div style={{ fontSize: "0.62rem", color: "var(--muted)", marginTop: "0.25rem" }}>Holland Code</div>
                  </div>
                )}
              </div>
              {filterSummary && (
                <p style={{ marginTop: "1rem", fontSize: "0.85rem", color: "var(--muted)", lineHeight: 1.6, borderTop: "1px solid var(--border)", paddingTop: "0.75rem" }}>
                  {filterSummary}
                </p>
              )}
            </section>
          )}

          {/* Sort + count */}
          {allResults.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
              <div style={{ fontSize: "0.85rem", color: "var(--muted)", flex: 1 }}>
                Showing {results.length} career matches
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <label htmlFor="sort-by" style={{ fontSize: "0.82rem", color: "var(--muted)", whiteSpace: "nowrap" }}>Sort by:</label>
                <select
                  id="sort-by"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={{ fontSize: "0.82rem", padding: "0.4rem 0.75rem", width: "auto" }}
                >
                  <option value="default">Best match</option>
                  <option value="salary-desc">Salary (high to low)</option>
                  <option value="demand">Demand level</option>
                  <option value="edu-most">Education (most)</option>
                  <option value="edu-least">Education (least)</option>
                  <option value="exp-most">Experience (most)</option>
                  <option value="exp-least">Experience (least)</option>
                  <option value="ai-risk">AI risk (highest)</option>
                </select>
              </div>
            </div>
          )}

          {/* Debug panel */}
          {debugInfo && (
            <section style={{ marginBottom: "1.5rem" }}>
              <div style={{ borderRadius: 12, border: "1px solid #fcd34d", background: "#fffbeb", padding: "1rem", marginBottom: "0.75rem" }}>
                <h2 style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "0.5rem" }}>Scoring debug</h2>
                <p style={{ fontSize: "0.78rem", color: "#78716c", marginBottom: "0.5rem" }}>?debug=1 is set in the URL</p>
                <pre style={{ fontSize: "0.7rem", overflow: "auto", whiteSpace: "pre-wrap", background: "white", padding: "0.75rem", borderRadius: 8, border: "1px solid #fde68a" }}>
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </div>
              <div style={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)", padding: "1rem" }}>
                <h2 style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "0.5rem" }}>Answers debug</h2>
                <pre style={{ fontSize: "0.7rem", overflow: "auto", whiteSpace: "pre-wrap", background: "var(--paper)", padding: "0.75rem", borderRadius: 8, border: "1px solid var(--border)" }}>
                  {JSON.stringify({
                    personaId: (answers.personaId as any)?.value,
                    hollandCode: (answers as any)?.hollandCode ?? null,
                    interestPairChoices: Object.fromEntries(
                      INTEREST_QUESTION_IDS.map((id) => {
                        const ans = answers[id] as any;
                        return [id, ans?.mapping?.choice ?? null];
                      })
                    ),
                    hollandAnswers: Object.fromEntries(
                      Array.from({ length: 7 }, (_, i) => {
                        const hId = `H${i + 1}`;
                        const ans = answers[hId] as any;
                        const qd = quizData as QuizData;
                        const hq = qd.hollandQuestions.find((q) => q.id === hId);
                        const option = hq?.answers.find((a) => a.text === ans?.text);
                        return [hId, { answer: ans?.text?.replace(/\s*\[[RIASEC]\]\s*$/, ""), hollandType: option?.hollandType ?? null }];
                      })
                    ),
                    P4_JOB: answers.P4_JOB
                      ? {
                          titles: (answers.P4_JOB as any)?.text,
                          jobs: (answers.P4_JOB as any)?.mapping?.jobs,
                          soc: (answers.P4_JOB as any)?.mapping?.soc,
                        }
                      : undefined,
                    P3_MAJOR: (answers.P3_MAJOR as any)?.mapping?.primaryMajors,
                    P4_MAJOR: (answers.P4_MAJOR as any)?.mapping?.primaryMajors,
                    P5_MAJOR: (answers.P5_MAJOR as any)?.mapping?.primaryMajors,
                    suggestedMajorsTopResults: results.slice(0, 4).map((c) => ({
                      career: c.name,
                      soc: c.soc,
                      suggestedMajors: c.suggestedMajors,
                    })),
                    allAnswers: answers,
                  }, null, 2)}
                </pre>
              </div>
            </section>
          )}

          {/* Career cards */}
          <section aria-label="Career matches" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {results.length ? (
              results.map((c) => {
                const demandLevel = selectedState ? getDemandForCareerInState(c.soc) : (c.currentDemand || null);
                const expanded = expandedCards.has(c.soc);
                const hollandForBar = c.hollandScore || 0;
                const matchPct = Math.min(100, Math.round((hollandForBar / 6) * 100));
                const aiRisk = Number(c.aiReplacementRisk || 0);
                const aiLabel = aiRisk < 40 ? "Low AI risk" : aiRisk < 70 ? "Moderate AI risk" : "High AI risk";
                const aiColor = aiRisk < 40 ? "var(--sage)" : aiRisk < 70 ? "var(--amber)" : "var(--rust)";

                const demandStyle = demandLevel
                  ? demandLevel.toLowerCase().includes("high")
                    ? { background: "rgba(90,122,106,0.15)", color: "var(--sage)" }
                    : demandLevel.toLowerCase().includes("average") && !demandLevel.toLowerCase().includes("below")
                      ? { background: "rgba(200,132,58,0.15)", color: "var(--amber)" }
                      : { background: "var(--cream)", color: "var(--muted)" }
                  : null;

                const desc = c.jobDescription || "";
                const shortDesc = desc.length > 200 ? desc.slice(0, 200) + "…" : desc;

                // Education match pill
                const majorMatchCount = userMajors.length > 0 ? countSuggestedMajorMatches(c.suggestedMajors, userMajors) : 0;
                const majorMatchLabel = majorMatchCount >= 2 ? "Field match" : majorMatchCount === 1 ? "Related field" : null;

                // Work setting pills
                const workPills: { label: string; icon: any }[] = [];
                if (c.workSetting) {
                  const ws = String(c.workSetting).toLowerCase();
                  const label = ws.includes("indoor") || ws.includes("office") ? "Indoors" : ws.includes("outdoor") ? "Outdoors" : "Mixed setting";
                  workPills.push({ label, icon: MapPin });
                }
                if (c.physicalDemandLevel) {
                  workPills.push({ label: String(c.physicalDemandLevel), icon: Activity });
                }
                const peopleScore = c.peopleContactScore ?? null;
                if (peopleScore !== null) {
                  const label = peopleScore >= 3 ? "High people contact" : peopleScore >= 1 ? "Moderate contact" : "Low contact";
                  workPills.push({ label, icon: Users });
                }

                // Salary bar (scale: $0–$250k)
                const SALARY_MAX = 250000;
                const salaryTop = c.salaryHigh || c.medianSalary || 0;
                const salaryLowPct = Math.min(98, Math.round(((c.salaryLow || 0) / SALARY_MAX) * 100));
                const salaryRangePct = Math.min(98 - salaryLowPct, Math.round(((salaryTop - (c.salaryLow || 0)) / SALARY_MAX) * 100));

                // Build sets of already-shown SOCs so related strip can filter them
                const shownSocs = new Set([
                  ...results.map((r) => r.soc),
                  ...addedCareers.map((a) => a.career.soc),
                ]);

                const relatedForCard = ((relatedOccupations as Record<string, { soc: string; title: string }[]>)[c.soc] || [])
                  .filter((r) => !shownSocs.has(r.soc) && careerBySOC.has(r.soc));

                // Gather added careers that belong after this card
                const addedAfterThis = addedCareers.filter((a) => a.afterSoc === c.soc);

                return (
                  <React.Fragment key={c.soc}>
                  <article
                    style={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 16,
                      overflow: "hidden",
                    }}
                  >
                    {/* Card header */}
                    <div style={{ padding: "1.5rem 1.5rem 1rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem", marginBottom: "1rem" }}>
                        <h3 style={{
                          fontFamily: "var(--font-playfair), 'Playfair Display', serif",
                          fontSize: "1.15rem",
                          color: "var(--ink)",
                          lineHeight: 1.3,
                          margin: 0,
                        }}>
                          {c.name}
                        </h3>
                        {demandStyle && demandLevel && (
                          <span style={{
                            ...demandStyle,
                            borderRadius: 100,
                            padding: "0.25rem 0.75rem",
                            fontSize: "0.73rem",
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                            flexShrink: 0,
                          }}>
                            {demandLevel}
                          </span>
                        )}
                      </div>

                      {/* Interest match bar */}
                      <div style={{ marginBottom: "0.85rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                          <span style={{ fontSize: "0.68rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Interest match</span>
                          <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--ink)" }}>
                            {(() => {
                              const h = hollandForBar;
                              const r = Math.round(h * 10) / 10;
                              return Number.isInteger(r) ? `${r}` : r.toFixed(1);
                            })()}{" "}
                            / 6
                          </span>
                        </div>
                        <div style={{ height: 6, borderRadius: 3, background: "var(--border)" }}>
                          <div style={{ height: 6, borderRadius: 3, background: "var(--amber)", width: `${matchPct}%`, transition: "width 0.3s" }} />
                        </div>
                      </div>

                      {/* Salary range bar */}
                      <div style={{ marginBottom: "0.85rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                          <span style={{ fontSize: "0.68rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Salary range</span>
                          <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--ink)" }}>
                            ${Math.round((c.salaryLow || 0) / 1000)}k – ${Math.round(salaryTop / 1000)}k
                          </span>
                        </div>
                        <div style={{ position: "relative", height: 6, borderRadius: 3, background: "var(--border)" }}>
                          <div style={{
                            position: "absolute",
                            left: `${salaryLowPct}%`,
                            width: `${salaryRangePct}%`,
                            height: "100%",
                            borderRadius: 3,
                            background: "var(--sage)",
                          }} />
                        </div>
                      </div>

                      {/* Badges row */}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", alignItems: "center" }}>
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: "0.3rem",
                          fontSize: "0.72rem", color: aiColor,
                          border: `1px solid ${aiColor}`, borderRadius: 100,
                          padding: "0.22rem 0.6rem",
                        }}>
                          <Bot size={11} aria-hidden="true" /> {aiLabel}
                        </span>
                        {workPills.map(({ label, icon: Icon }) => (
                          <span key={label} style={{
                            display: "inline-flex", alignItems: "center", gap: "0.3rem",
                            fontSize: "0.72rem", color: "var(--muted)",
                            border: "1px solid var(--border)", borderRadius: 100,
                            padding: "0.22rem 0.6rem",
                          }}>
                            <Icon size={11} aria-hidden="true" /> {label}
                          </span>
                        ))}
                        {majorMatchLabel && (
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: "0.3rem",
                            fontSize: "0.72rem", color: "var(--muted)",
                            border: "1px solid var(--border)", borderRadius: 100,
                            padding: "0.22rem 0.6rem",
                          }}>
                            <GraduationCap size={11} aria-hidden="true" /> {majorMatchLabel}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Education / experience row */}
                    {(c.educationRequirements || (c as any).experienceRequirements) && (
                      <div style={{
                        borderTop: "1px solid var(--border)",
                        padding: "0.65rem 1.5rem",
                        display: "flex", flexWrap: "wrap", gap: "1rem",
                        fontSize: "0.8rem", color: "var(--muted)",
                      }}>
                        {c.educationRequirements && (
                          <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                            <GraduationCap size={13} aria-hidden="true" />
                            {String(c.educationRequirements)}
                          </span>
                        )}
                        {(c as any).experienceRequirements && (
                          <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                            <Briefcase size={13} aria-hidden="true" />
                            {String((c as any).experienceRequirements)}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Collapsible description */}
                    {desc && (
                      <div style={{ borderTop: "1px solid var(--border)", padding: "0.75rem 1.5rem" }}>
                        <p style={{ fontSize: "0.84rem", color: "var(--muted)", lineHeight: 1.7, margin: 0 }}>
                          {expanded ? desc : shortDesc}
                        </p>
                        {desc.length > 200 && (
                          <button
                            type="button"
                            onClick={() => toggleDescription(c.soc)}
                            style={{
                              background: "transparent", border: "none", cursor: "pointer",
                              fontSize: "0.8rem", color: "var(--amber)", fontWeight: 500,
                              padding: "0.3rem 0", marginTop: "0.25rem",
                              display: "flex", alignItems: "center", gap: "0.25rem",
                            }}
                          >
                            {expanded
                              ? <><ChevronUp size={13} aria-hidden="true" /> Read less</>
                              : <><ChevronDown size={13} aria-hidden="true" /> Read more</>
                            }
                          </button>
                        )}
                      </div>
                    )}
                  </article>

                  {/* Related careers strip */}
                  {relatedForCard.length > 0 && (
                    <div style={{
                      background: "var(--paper)", border: "1px solid var(--border)", borderRadius: 12,
                      padding: "0.75rem 1rem", marginTop: "-0.25rem",
                    }}>
                      <p style={{ fontSize: "0.7rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 0.5rem" }}>
                        Related careers
                      </p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                        {relatedForCard.map((r) => (
                          <button
                            key={r.soc}
                            type="button"
                            onClick={() => addRelatedCareer(c.soc, r.soc)}
                            style={{
                              display: "inline-flex", alignItems: "center", gap: "0.3rem",
                              fontSize: "0.78rem", color: "var(--ink)",
                              background: "var(--card)", border: "1px solid var(--border)",
                              borderRadius: 100, padding: "0.3rem 0.7rem", cursor: "pointer",
                            }}
                          >
                            <Plus size={11} aria-hidden="true" style={{ color: "var(--amber)" }} />
                            {r.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Added careers inserted after this card */}
                  {addedAfterThis.map((added) => {
                    const ac = added.career;
                    const acExpanded = expandedCards.has(ac.soc);
                    const acDesc = ac.jobDescription || "";
                    const acShortDesc = acDesc.length > 200 ? acDesc.slice(0, 200) + "…" : acDesc;
                    const acAiRisk = Number(ac.aiReplacementRisk || 0);
                    const acAiLabel = acAiRisk < 40 ? "Low AI risk" : acAiRisk < 70 ? "Moderate AI risk" : "High AI risk";
                    const acAiColor = acAiRisk < 40 ? "var(--sage)" : acAiRisk < 70 ? "var(--amber)" : "var(--rust)";
                    const acDemandLevel = selectedState ? getDemandForCareerInState(ac.soc) : (ac.currentDemand || null);
                    const acDemandStyle = acDemandLevel
                      ? acDemandLevel.toLowerCase().includes("high")
                        ? { background: "rgba(90,122,106,0.15)", color: "var(--sage)" }
                        : acDemandLevel.toLowerCase().includes("average") && !acDemandLevel.toLowerCase().includes("below")
                          ? { background: "rgba(200,132,58,0.15)", color: "var(--amber)" }
                          : { background: "var(--cream)", color: "var(--muted)" }
                      : null;
                    const acMajorMatchCount = userMajors.length > 0 ? countSuggestedMajorMatches(ac.suggestedMajors, userMajors) : 0;
                    const acMajorMatchLabel = acMajorMatchCount >= 2 ? "Field match" : acMajorMatchCount === 1 ? "Related field" : null;
                    const acWorkPills: { label: string; icon: any }[] = [];
                    if (ac.workSetting) {
                      const ws = String(ac.workSetting).toLowerCase();
                      acWorkPills.push({ label: ws.includes("indoor") || ws.includes("office") ? "Indoors" : ws.includes("outdoor") ? "Outdoors" : "Mixed setting", icon: MapPin });
                    }
                    if (ac.physicalDemandLevel) acWorkPills.push({ label: String(ac.physicalDemandLevel), icon: Activity });
                    const acPeopleScore = ac.peopleContactScore ?? null;
                    if (acPeopleScore !== null) acWorkPills.push({ label: acPeopleScore >= 3 ? "High people contact" : acPeopleScore >= 1 ? "Moderate contact" : "Low contact", icon: Users });

                    const acRelated = ((relatedOccupations as Record<string, { soc: string; title: string }[]>)[ac.soc] || [])
                      .filter((r) => !shownSocs.has(r.soc) && r.soc !== ac.soc && careerBySOC.has(r.soc));

                    return (
                      <React.Fragment key={ac.soc}>
                        <article style={{
                          background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden",
                          borderLeft: "3px solid var(--amber)",
                        }}>
                          <div style={{ padding: "1.5rem 1.5rem 1rem" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem", marginBottom: "0.5rem" }}>
                              <h3 style={{ fontFamily: "var(--font-playfair), 'Playfair Display', serif", fontSize: "1.15rem", color: "var(--ink)", lineHeight: 1.3, margin: 0 }}>
                                {ac.name}
                              </h3>
                              {acDemandStyle && acDemandLevel && (
                                <span style={{ ...acDemandStyle, fontSize: "0.72rem", fontWeight: 600, padding: "0.2rem 0.6rem", borderRadius: 100, whiteSpace: "nowrap" }}>
                                  {acDemandLevel}
                                </span>
                              )}
                            </div>
                            <p style={{ fontSize: "0.72rem", color: "var(--muted)", margin: "0 0 0.75rem", fontStyle: "italic" }}>Added from related careers</p>
                            {/* Salary */}
                            {(ac.salaryLow || ac.medianSalary) && (() => {
                              const acSalaryMax = 250000;
                              const acSalaryTop = ac.salaryHigh || ac.medianSalary || 0;
                              const acLowPct = Math.min(98, Math.round(((ac.salaryLow || 0) / acSalaryMax) * 100));
                              const acRangePct = Math.min(98 - acLowPct, Math.round(((acSalaryTop - (ac.salaryLow || 0)) / acSalaryMax) * 100));
                              return (
                                <div style={{ marginBottom: "0.75rem" }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                                    <span style={{ fontSize: "0.68rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Salary range</span>
                                    <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--ink)" }}>${Math.round((ac.salaryLow || 0) / 1000)}k – ${Math.round(acSalaryTop / 1000)}k</span>
                                  </div>
                                  <div style={{ position: "relative", height: 6, borderRadius: 3, background: "var(--border)" }}>
                                    <div style={{ position: "absolute", left: `${acLowPct}%`, width: `${acRangePct}%`, height: "100%", borderRadius: 3, background: "var(--sage)" }} />
                                  </div>
                                </div>
                              );
                            })()}
                            {/* Badges */}
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", alignItems: "center" }}>
                              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.72rem", color: acAiColor, border: `1px solid ${acAiColor}`, borderRadius: 100, padding: "0.22rem 0.6rem" }}>
                                <Bot size={11} aria-hidden="true" /> {acAiLabel}
                              </span>
                              {acWorkPills.map(({ label, icon: Icon }) => (
                                <span key={label} style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.72rem", color: "var(--muted)", border: "1px solid var(--border)", borderRadius: 100, padding: "0.22rem 0.6rem" }}>
                                  <Icon size={11} aria-hidden="true" /> {label}
                                </span>
                              ))}
                              {acMajorMatchLabel && (
                                <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.72rem", color: "var(--muted)", border: "1px solid var(--border)", borderRadius: 100, padding: "0.22rem 0.6rem" }}>
                                  <GraduationCap size={11} aria-hidden="true" /> {acMajorMatchLabel}
                                </span>
                              )}
                            </div>
                          </div>
                          {acDesc && (
                            <div style={{ borderTop: "1px solid var(--border)", padding: "0.75rem 1.5rem" }}>
                              <p style={{ fontSize: "0.84rem", color: "var(--muted)", lineHeight: 1.7, margin: 0 }}>
                                {acExpanded ? acDesc : acShortDesc}
                              </p>
                              {acDesc.length > 200 && (
                                <button type="button" onClick={() => toggleDescription(ac.soc)} style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: "0.8rem", color: "var(--amber)", fontWeight: 500, padding: "0.3rem 0", marginTop: "0.25rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                                  {acExpanded ? <><ChevronUp size={13} aria-hidden="true" /> Read less</> : <><ChevronDown size={13} aria-hidden="true" /> Read more</>}
                                </button>
                              )}
                            </div>
                          )}
                        </article>
                        {acRelated.length > 0 && (
                          <div style={{ background: "var(--paper)", border: "1px solid var(--border)", borderRadius: 12, padding: "0.75rem 1rem", marginTop: "-0.25rem" }}>
                            <p style={{ fontSize: "0.7rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 0.5rem" }}>Related careers</p>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                              {acRelated.map((r) => (
                                <button key={r.soc} type="button" onClick={() => addRelatedCareer(ac.soc, r.soc)} style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.78rem", color: "var(--ink)", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 100, padding: "0.3rem 0.7rem", cursor: "pointer" }}>
                                  <Plus size={11} aria-hidden="true" style={{ color: "var(--amber)" }} /> {r.title}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}

                  </React.Fragment>
                );
              })
            ) : (
              <article style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, padding: "2rem" }}>
                <h3 style={{ fontFamily: "var(--font-playfair), 'Playfair Display', serif", fontSize: "1.2rem", marginBottom: "0.5rem" }}>
                  No matches found
                </h3>
                <p style={{ fontSize: "0.88rem", color: "var(--muted)" }}>
                  Don't worry — small tweaks usually unlock more options.
                </p>
              </article>
            )}
          </section>

          {/* Want more options */}
          <section style={{ marginTop: "1.5rem", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, padding: "1.5rem" }}>
            <h2 style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--ink)", marginBottom: "0.35rem" }}>Want more options?</h2>
            <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: "1rem" }}>
              Try any of these to expand your results:
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <button
                type="button"
                onClick={() =>
                  applyAnswerPatch({
                    Q5: { text: "$50,000\u2013$80,000", mapping: { salaryMin: 50000 } } as any,
                  })
                }
                style={{
                  background: "var(--paper)", border: "1px solid var(--border)", borderRadius: 10,
                  padding: "0.85rem 1rem", textAlign: "left", cursor: "pointer",
                }}
                className="want-more-btn"
              >
                <div style={{ fontWeight: 500, fontSize: "0.88rem", color: "var(--ink)" }}>Lower salary minimum</div>
                <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "0.15rem" }}>
                  Set minimum salary to $50k (keeps higher-paying jobs too).
                </div>
              </button>

              {(personaId === "P4" || personaId === "P5") && (
                <button
                  type="button"
                  onClick={() =>
                    applyAnswerPatch(
                      personaId === "P4"
                        ? ({
                            P4_EDU_CEIL: { text: "Master's degree or professional degree", mapping: { educationCeiling: "master" } } as any,
                          } as Partial<Answers>)
                        : ({
                            P5_EDU_CEIL: { text: "Master's degree or professional degree", mapping: { educationCeiling: "master" } } as any,
                          } as Partial<Answers>)
                    )
                  }
                  style={{
                    background: "var(--paper)", border: "1px solid var(--border)", borderRadius: 10,
                    padding: "0.85rem 1rem", textAlign: "left", cursor: "pointer",
                  }}
                  className="want-more-btn"
                >
                  <div style={{ fontWeight: 500, fontSize: "0.88rem", color: "var(--ink)" }}>Raise education ceiling</div>
                  <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "0.15rem" }}>Open up to bachelor or master's programs.</div>
                </button>
              )}

              <button
                type="button"
                onClick={() =>
                  applyAnswerPatch({
                    Q7: { text: "Yes, I can relocate", mapping: { willingToRelocate: true } } as any,
                  })
                }
                style={{
                  background: "var(--paper)", border: "1px solid var(--border)", borderRadius: 10,
                  padding: "0.85rem 1rem", textAlign: "left", cursor: "pointer",
                }}
                className="want-more-btn"
              >
                <div style={{ fontWeight: 500, fontSize: "0.88rem", color: "var(--ink)" }}>Set relocation to open</div>
                <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "0.15rem" }}>If you're willing to move or commute for work.</div>
              </button>
            </div>
            <button
              type="button"
              onClick={() => router.push("/career-quiz")}
              style={{
                marginTop: "1rem", background: "transparent", border: "none", cursor: "pointer",
                fontSize: "0.85rem", fontWeight: 500, color: "var(--amber)", padding: 0,
              }}
            >
              Or edit all your answers →
            </button>
          </section>

        </main>
      </div>

      <AnswersSidebar
        answers={answers}
        answeredIds={answeredSidebarIds}
        quizData={quizData as QuizData}
        onJumpTo={(qId) => {
          try { sessionStorage.setItem("quiz:jumpTo", qId); } catch { /* ignore */ }
          router.push("/career-quiz");
        }}
      />

      {/* Floating feedback widget */}
      <div style={{ position: "fixed", bottom: "1.5rem", right: "1.5rem", zIndex: 50, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.5rem" }}>
        {feedbackOpen && (
          <div style={{
            background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16,
            padding: "1.25rem", width: 300, boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <h2 style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--ink)", margin: 0 }}>Help us improve</h2>
              <button
                type="button"
                onClick={() => setFeedbackOpen(false)}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: "1.1rem", lineHeight: 1, padding: "0.1rem 0.25rem" }}
                aria-label="Close feedback"
              >
                ✕
              </button>
            </div>
            <p style={{ fontSize: "0.82rem", color: "var(--muted)", marginBottom: "0.75rem" }}>
              This quiz is in beta. What worked, what didn't, and what careers were you hoping to see?
            </p>
            <textarea
              rows={4}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Write your feedback here…"
              style={{ width: "100%", boxSizing: "border-box" }}
            />
            <div style={{ marginTop: "0.75rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <button
                type="button"
                onClick={submitFeedback}
                disabled={feedbackStatus === "sending" || !feedback.trim()}
                className="btn-primary"
                style={{ fontSize: "0.85rem", padding: "0.55rem 1.25rem" }}
              >
                {feedbackStatus === "sending" ? "Sending…" : feedbackStatus === "sent" ? "Sent ✓" : "Submit"}
              </button>
              {feedbackStatus === "sent" && <span style={{ fontSize: "0.82rem", color: "var(--sage)" }}>Thank you!</span>}
              {feedbackStatus === "error" && <span style={{ fontSize: "0.82rem", color: "var(--rust)" }}>Could not send.</span>}
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={() => setFeedbackOpen((o) => !o)}
          className="btn-primary"
          style={{ fontSize: "0.85rem", padding: "0.6rem 1.1rem", borderRadius: 100, boxShadow: "0 4px 16px rgba(0,0,0,0.15)" }}
        >
          Feedback
        </button>
      </div>

      <style>{`
        .want-more-btn:hover { border-color: var(--amber) !important; background: var(--cream) !important; }
      `}</style>
    </>
  );
}
