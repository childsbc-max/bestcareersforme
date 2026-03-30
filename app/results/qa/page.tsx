"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { extractAnswersFromFeedbackPayload, parseLooseJsonFromPaste } from "@/lib/feedback-import";

const QUIZ_STORAGE_KEY = "bestcareerfor.me:quiz_answers:v1";

export default function ResultsQaImportPage() {
  const router = useRouter();
  const [paste, setPaste] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function applyAndGo() {
    setError(null);
    setBusy(true);
    try {
      const parsed = parseLooseJsonFromPaste(paste);
      const answers = extractAnswersFromFeedbackPayload(parsed);
      if (!answers) {
        setError(
          "Could not find quiz answers. Paste either the full API body (with an \"answers\" field) or the raw answers JSON (with personaId / question keys)."
        );
        setBusy(false);
        return;
      }
      try {
        localStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify(answers));
      } catch {
        setError("Could not save to local storage (browser blocked?).");
        setBusy(false);
        return;
      }
      router.push("/results?debug=1");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid paste.");
      setBusy(false);
    }
  }

  return (
    <div style={{ background: "var(--paper)", minHeight: "100vh", padding: "2rem" }}>
      <main style={{ maxWidth: 640, margin: "0 auto" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <Link href="/results" style={{ textDecoration: "none", fontSize: "0.85rem", color: "var(--amber)" }}>
            ← Back to results
          </Link>
        </div>

        <h1
          style={{
            fontFamily: "var(--font-playfair), 'Playfair Display', serif",
            fontSize: "1.35rem",
            color: "var(--ink)",
            marginBottom: "0.5rem",
          }}
        >
          QA: Load results from feedback
        </h1>
        <p style={{ fontSize: "0.9rem", color: "var(--muted)", lineHeight: 1.6, marginBottom: "1.25rem" }}>
          Paste the JSON your feedback email stores: either the full object{" "}
          <code style={{ fontSize: "0.82em" }}>{`{ "feedback", "answers", "debug" }`}</code>, or only the{" "}
          <strong>answers</strong> object. Then open the results page with scoring debug on.
        </p>

        <textarea
          rows={14}
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          placeholder={`Example: paste from email after "ANSWERS:" or the whole POST body...`}
          style={{ width: "100%", fontSize: "0.82rem", fontFamily: "ui-monospace, monospace", marginBottom: "0.75rem" }}
        />

        {error && (
          <p style={{ fontSize: "0.85rem", color: "var(--rust)", marginBottom: "0.75rem" }} role="alert">
            {error}
          </p>
        )}

        <button type="button" className="btn-primary" disabled={busy || !paste.trim()} onClick={applyAndGo} style={{ fontSize: "0.9rem", padding: "0.65rem 1.25rem" }}>
          {busy ? "Opening…" : "Apply & view results (debug)"}
        </button>

        <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "1.25rem", lineHeight: 1.5 }}>
          Tip: If the email shows separate ANSWERS and DEBUG blocks, paste only the ANSWERS <code>{`{ ... }`}</code> object, or the
          combined structure your server logged.
        </p>
      </main>
    </div>
  );
}
