import type { Answers } from "@/lib/types";

/** Body shape posted to /api/feedback */
export type FeedbackApiBody = {
  feedback?: string;
  answers?: Answers;
  debug?: unknown;
};

/**
 * Accepts the API payload `{ feedback, answers, debug }`, or `{ answers }`, or a raw Answers object.
 */
export function extractAnswersFromFeedbackPayload(parsed: unknown): Answers | null {
  if (!parsed || typeof parsed !== "object") return null;
  const o = parsed as Record<string, unknown>;
  if (o.answers && typeof o.answers === "object" && o.answers !== null) {
    return o.answers as Answers;
  }
  if ("personaId" in o || "Q2" in o || "H1" in o || "P4_JOB" in o || "P5_EDU_COMPLETED" in o || "P5_EDU_LEVEL" in o) {
    return o as Answers;
  }
  return null;
}

/**
 * Parse pasted text from email or clipboard: strict JSON, or substring from first `{` to last `}`.
 */
export function parseLooseJsonFromPaste(text: string): unknown {
  const t = text.trim();
  if (!t) throw new Error("Paste is empty.");
  try {
    return JSON.parse(t);
  } catch {
    const start = t.indexOf("{");
    const end = t.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(t.slice(start, end + 1));
    }
  }
  throw new Error("Could not parse JSON. Paste the full object from the feedback email, or valid JSON only.");
}
