"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import type { Answers, QuizData } from "@/lib/types";

interface AnswersSidebarProps {
  answers: Answers;
  answeredIds: string[];
  quizData: QuizData;
  onJumpTo?: (qId: string) => void;
}

const QUESTION_LABELS: Record<string, string> = {
  PERSONA: "Who you are",
  P1_EDU_LEVEL: "Education level",
  P1_EDU_CEIL: "Education ceiling",
  P1_EDU_INTEREST_MAJORS: "Interest areas",
  P3_MAJOR: "Your major",
  P3_MAJOR_SCOPE: "Major scope",
  P3_EDU_LEVEL: "Education level",
  P3_EDU_INTEREST_MAJORS: "Interest areas",
  P3_EDU_CEIL: "Education ceiling",
  P3_QUALIFIED_NOW: "Qualified now?",
  P3_EXPERIENCE: "Experience level",
  P4_JOB: "Jobs you've held",
  P4_EDU_LEVEL: "Education level",
  P4_MAJOR: "Your major",
  P4_EDU_INTEREST_MAJORS: "Interest areas",
  P4_EDU_CEIL: "Education ceiling",
  P5_EDU_LEVEL: "Education level",
  P5_MAJOR: "Your major",
  P5_MAJOR_SCOPE: "Major scope",
  P5_EDU_INTEREST_MAJORS: "Interest areas",
  P5_EDU_CEIL: "Education ceiling",
  // Legacy IDs (older saved sessions)
  P1_EDU_OPEN: "Open to more school?",
  P3_EDU_OPEN: "Open to more school?",
  P4_EDU_COMPLETED: "Education completed",
  P4_EDU_OPEN: "Open to more school?",
  P5_EDU_COMPLETED: "Education completed",
  P5_EDU_OPEN: "Open to more school?",
};

const PERSONA_TITLES: Record<string, string> = {
  P1: "I'm still in school",
  P3: "Recent graduate or about to graduate",
  P4: "I want to move up",
  P5: "I want to change careers",
};

function getLabel(qId: string, quizData: QuizData): string {
  if (QUESTION_LABELS[qId]) return QUESTION_LABELS[qId];
  const interest = /^INTEREST_(\d+)$/.exec(qId);
  if (interest) return `Interest ${interest[1]}`;
  const p1q = quizData.p1Questions.find((q) => q.id === qId);
  if (p1q) return p1q.label;
  const hq = quizData.hollandQuestions.find((q) => q.id === qId);
  if (hq) return `Interest ${hq.questionNumber}`;
  return qId;
}

type SidebarItem = { qId: string; label: string; value: string };

function AnswersSidebarContent({
  items,
  onJumpTo,
}: {
  items: SidebarItem[];
  onJumpTo?: (qId: string) => void;
}) {
  return (
    <div>
      <div
        style={{
          padding: "1rem 1rem 0.75rem",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div
          style={{
            fontSize: "0.65rem",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--muted)",
            marginBottom: "0.2rem",
          }}
        >
          Your Answers
        </div>
        <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
          {items.length} answered
        </div>
      </div>
      <div>
        {items.map((item) => {
          const clickable = onJumpTo && item.qId !== "PERSONA";
          return (
            <button
              key={item.qId}
              type="button"
              onClick={() => clickable && onJumpTo(item.qId)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "0.6rem 1rem",
                background: "transparent",
                border: "none",
                borderBottom: "1px solid var(--border)",
                cursor: clickable ? "pointer" : "default",
              }}
              className={clickable ? "sidebar-item" : ""}
            >
              <div
                style={{
                  fontSize: "0.65rem",
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: "0.15rem",
                }}
              >
                {item.label}
              </div>
              <div
                style={{
                  fontSize: "0.82rem",
                  color: "var(--ink)",
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {item.value}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function getDisplayValue(qId: string, answers: Answers): string {
  if (qId === "PERSONA") {
    const val = (answers.personaId as any)?.value as string | undefined;
    return PERSONA_TITLES[val || ""] || "—";
  }
  const ans = answers[qId] as any;
  if (!ans) return "—";
  if (/^INTEREST_\d+$/.test(qId)) {
    const ch = ans.mapping?.choice;
    if (ch === "A" || ch === "B") return ch === "A" ? "Option A" : "Option B";
  }
  if (typeof ans === "string") return ans;
  if (ans.value) return ans.value;
  if (ans.text === "__multi__") {
    const texts = (ans.mapping?.selectedTexts as string[]) || [];
    return texts.join(", ") || "—";
  }
  if (ans.text) return ans.text.replace(/\s*\[[RIASEC]\]\s*$/, "");
  return "—";
}

export function AnswersSidebar({ answers, answeredIds, quizData, onJumpTo }: AnswersSidebarProps) {
  const [open, setOpen] = useState(false);

  const items: SidebarItem[] = answeredIds
    .map((qId) => ({
      qId,
      label: getLabel(qId, quizData),
      value: getDisplayValue(qId, answers),
    }))
    .filter((item) => item.value !== "—");

  if (items.length === 0) return null;

  return (
    <>
      {/* Desktop sidebar */}
      <div
        className="answers-sidebar-desktop"
        style={{
          position: "fixed",
          right: 0,
          top: 0,
          bottom: 0,
          width: 260,
          background: "var(--card)",
          borderLeft: "1px solid var(--border)",
          zIndex: 50,
          overflowY: "auto",
        }}
      >
        <AnswersSidebarContent items={items} onJumpTo={onJumpTo} />
      </div>

      {/* Mobile bottom sheet */}
      <div className="answers-sidebar-mobile">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            background: "var(--card)",
            borderTop: "1px solid var(--border)",
            padding: "0.8rem 1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: "pointer",
            zIndex: 60,
          }}
        >
          <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--ink)" }}>
            Review answers ({items.length} answered)
          </span>
          {open ? (
            <ChevronDown size={16} style={{ color: "var(--muted)" }} />
          ) : (
            <ChevronUp size={16} style={{ color: "var(--muted)" }} />
          )}
        </button>

        {open && (
          <div
            style={{
              position: "fixed",
              bottom: 52,
              left: 0,
              right: 0,
              height: "55vh",
              background: "var(--card)",
              borderTop: "1px solid var(--border)",
              zIndex: 55,
              overflowY: "auto",
            }}
          >
            <AnswersSidebarContent items={items} onJumpTo={onJumpTo} />
          </div>
        )}
      </div>

      <style>{`
        .answers-sidebar-desktop { display: none !important; }
        .answers-sidebar-mobile { display: block; }
        @media (min-width: 900px) {
          .answers-sidebar-desktop { display: block !important; }
          .answers-sidebar-mobile { display: none !important; }
        }
        .sidebar-item:hover { background: var(--cream) !important; }
      `}</style>
    </>
  );
}
