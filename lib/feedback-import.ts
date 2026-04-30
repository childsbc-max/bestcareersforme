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
  if ("personaId" in o || "Q2" in o || "H1" in o || "P4_JOB" in o || "P4_MAJOR_SCOPE" in o || "P4_EDU_COMPLETED" in o) {
    return o as Answers;
  }
  return null;
}

/**
 * Strip BOM, optional markdown fence, and common email labels so `{` search works.
 */
function preprocessFeedbackPaste(text: string): string {
  let t = text.trim().replace(/^\uFEFF/, "");
  const fence = /^```(?:json)?\s*\r?\n?([\s\S]*?)\r?\n?```/im.exec(t);
  if (fence) t = fence[1].trim();
  t = t.replace(/^\s*ANSWERS:\s*$/gim, "");
  t = t.replace(/^\s*DEBUG:\s*$/gim, "");
  return t.trim();
}

/**
 * Extract the first top-level `{ ... }` using brace depth (handles strings and escapes).
 * Fixes pastes that include two objects (e.g. ANSWERS block + DEBUG block), where
 * slice(first `{`, last `}`) would concatenate both and break JSON.parse.
 */
function extractFirstBalancedJsonObject(text: string): string | null {
  const s = text;
  const start = s.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let j = start; j < s.length; j++) {
    const c = s[j];
    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (c === "\\") {
        escape = true;
        continue;
      }
      if (c === '"') inString = false;
      continue;
    }
    if (c === '"') {
      inString = true;
      continue;
    }
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return s.slice(start, j + 1);
    }
  }
  return null;
}

/**
 * Parse pasted text from email or clipboard: full JSON, or balanced `{...}` blocks.
 * If multiple objects are pasted (e.g. DEBUG then ANSWERS), returns the first object
 * that contains extractable quiz answers.
 */
export function parseLooseJsonFromPaste(text: string): unknown {
  const pre = preprocessFeedbackPaste(text);
  if (!pre) throw new Error("Paste is empty.");

  try {
    const whole = JSON.parse(pre);
    if (extractAnswersFromFeedbackPayload(whole) != null) return whole;
  } catch {
    /* fall through — e.g. trailing second object */
  }

  let search = pre;
  while (search.length > 0) {
    const slice = extractFirstBalancedJsonObject(search);
    if (!slice) break;
    const relStart = search.indexOf("{");
    try {
      const parsed = JSON.parse(slice);
      if (extractAnswersFromFeedbackPayload(parsed) != null) return parsed;
    } catch {
      /* try next segment */
    }
    if (relStart < 0) break;
    search = search.slice(relStart + slice.length).trimStart();
  }

  throw new Error(
    "Could not parse JSON or find quiz answers. Paste the ANSWERS { ... } object, " +
      "or the full feedback payload with an \"answers\" field. If you paste both ANSWERS and DEBUG, order does not matter."
  );
}
