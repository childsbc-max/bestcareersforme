import type { HollandLetter } from "@/lib/types";
import { hollandPairs, type HollandPair } from "@/lib/holland-pairs";

const RIASEC_ORDER: HollandLetter[] = ["R", "I", "A", "S", "E", "C"];

function riasecRank(letter: HollandLetter): number {
  return RIASEC_ORDER.indexOf(letter);
}

/**
 * 12 binary choices: each entry is which side won ('A' or 'B') for that pair in order.
 * Winner gets 1 point. Top 3 letters by score form the code in order.
 * Ties: higher score first; if tied, earlier pair index where the type earned a point wins;
 * if still tied, RIASEC order (R, I, A, S, E, C).
 */
export function computeHollandCodeFromChoices(choices: ("A" | "B")[], pairs: readonly HollandPair[] = hollandPairs): string {
  if (choices.length !== pairs.length) {
    throw new Error(`Expected ${pairs.length} choices, got ${choices.length}`);
  }

  const scores: Record<HollandLetter, number> = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
  /** Earliest pair index (0-based) where this letter received a point; Infinity if never. */
  const firstWinAt: Record<HollandLetter, number> = {
    R: Infinity,
    I: Infinity,
    A: Infinity,
    S: Infinity,
    E: Infinity,
    C: Infinity,
  };

  for (let i = 0; i < pairs.length; i++) {
    const p = pairs[i];
    const c = choices[i];
    if (c !== "A" && c !== "B") {
      throw new Error(`Invalid choice at index ${i}: ${String(c)}`);
    }
    const winner = c === "A" ? p.A.type : p.B.type;
    scores[winner]++;
    if (i < firstWinAt[winner]) firstWinAt[winner] = i;
  }

  const letters = [...RIASEC_ORDER];
  letters.sort((a, b) => {
    const sa = scores[a];
    const sb = scores[b];
    if (sb !== sa) return sb - sa;
    const fa = firstWinAt[a];
    const fb = firstWinAt[b];
    if (fa !== fb) return fa - fb;
    return riasecRank(a) - riasecRank(b);
  });

  return letters[0] + letters[1] + letters[2];
}

/** Parse stored `hollandCode` string into three Holland letters (invalid input returns []). */
export function parseHollandCodeString(code: string | undefined | null): HollandLetter[] {
  if (!code || typeof code !== "string") return [];
  const s = code.trim().toUpperCase();
  if (s.length !== 3) return [];
  const out: HollandLetter[] = [];
  for (let i = 0; i < 3; i++) {
    const ch = s[i] as HollandLetter;
    if (!RIASEC_ORDER.includes(ch)) return [];
    out.push(ch);
  }
  return out;
}
