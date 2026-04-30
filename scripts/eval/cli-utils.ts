/** Minimal argv parser for evaluation CLIs (no extra deps). */

export function parseArgs(argv: string[]): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next == null || next.startsWith("--")) {
      out[key] = true;
    } else {
      out[key] = next;
      i++;
    }
  }
  return out;
}

export function getString(args: Record<string, string | boolean>, key: string, fallback: string): string {
  const v = args[key];
  if (v === true || v === undefined) return fallback;
  return String(v);
}

export function getInt(args: Record<string, string | boolean>, key: string, fallback: number): number {
  const v = args[key];
  if (v === true || v === undefined) return fallback;
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) ? n : fallback;
}

/** Safe basename fragment for `*.scoring.json` (spaces and punctuation → `_`). */
export function takerFilePrefix(takerId: string): string {
  return takerId.replace(/[^a-zA-Z0-9_-]/g, "_");
}

/** Resolved id for one spec row: explicit `takerId`, else `taker-NNN` from line number. */
export function resolveTakerId(spec: { takerId?: string }, lineIndex1Based: number): string {
  const t = spec.takerId?.trim();
  if (t) return t;
  return `taker-${String(lineIndex1Based).padStart(3, "0")}`;
}
