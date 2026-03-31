import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Methodology — bestcareerfor.me",
  description:
    "How BestCareerFor.Me turns your answers into career matches: interests, education, experience, salary needs, demand, work style, and AI risk.",
  openGraph: {
    title: "Methodology — bestcareerfor.me",
    description:
      "A plain-English explanation of how BestCareerFor.Me scores and ranks careers.",
    url: "https://bestcareerfor.me/methodology",
    siteName: "bestcareerfor.me",
  },
};

export default function MethodologyPage() {
  return (
    <>
      <nav
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "1.2rem 3rem",
          borderBottom: "1px solid var(--border)",
          background: "var(--paper)",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <Link href="/" style={{ textDecoration: "none" }}>
          <span className="logo">
            best<span className="logo-accent">career</span>for.me
          </span>
        </Link>

        <ul
          style={{ listStyle: "none", display: "flex", gap: "2rem", alignItems: "center" }}
          className="nav-links"
        >
          <li className="nav-dropdown">
            <Link
              href="/#how-it-works"
              style={{
                textDecoration: "none",
                color: "var(--muted)",
                fontSize: "0.9rem",
                fontWeight: 500,
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
              }}
            >
              How It Works <span aria-hidden="true" style={{ fontSize: "0.8rem" }}>▾</span>
            </Link>
            <div className="nav-dropdown-menu" role="menu" aria-label="How it works menu">
              <Link className="nav-dropdown-item" href="/#how-it-works" role="menuitem">
                Overview
              </Link>
              <Link className="nav-dropdown-item" href="/methodology" role="menuitem">
                Methodology
              </Link>
            </div>
          </li>
          <li>
            <Link
              href="/about"
              style={{ textDecoration: "none", color: "var(--muted)", fontSize: "0.9rem", fontWeight: 500 }}
            >
              About
            </Link>
          </li>
          <li>
            <Link
              href="/career-quiz"
              style={{
                textDecoration: "none",
                background: "var(--ink)",
                color: "var(--paper)",
                padding: "0.5rem 1.2rem",
                borderRadius: "100px",
                fontSize: "0.9rem",
                fontWeight: 500,
              }}
            >
              Take the Quiz
            </Link>
          </li>
        </ul>

        <style>{`
          @media (max-width: 768px) {
            .nav-links { display: none !important; }
          }
          .nav-dropdown { position: relative; }
          .nav-dropdown-menu {
            display: none;
            position: absolute;
            top: calc(100% + 0.65rem);
            left: 0;
            min-width: 220px;
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 0.35rem;
            box-shadow: 0 14px 40px rgba(15,14,12,0.12);
            z-index: 200;
          }
          .nav-dropdown:hover .nav-dropdown-menu { display: block; }
          .nav-dropdown-item {
            display: block;
            padding: 0.6rem 0.75rem;
            border-radius: 10px;
            text-decoration: none;
            color: var(--ink);
            font-size: 0.9rem;
            font-weight: 500;
          }
          .nav-dropdown-item:hover { background: var(--cream); }
        `}</style>
      </nav>

      <article
        style={{
          maxWidth: 780,
          margin: "0 auto",
          padding: "clamp(2.5rem, 5vw, 4rem) clamp(1.25rem, 4vw, 3rem) 4rem",
        }}
      >
        <p
          style={{
            fontSize: "0.75rem",
            fontWeight: 500,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "var(--amber)",
            marginBottom: "1rem",
          }}
        >
          Methodology
        </p>

        <h1
          style={{
            fontFamily: "var(--font-playfair), 'Playfair Display', serif",
            fontSize: "clamp(2rem, 4vw, 2.75rem)",
            lineHeight: 1.15,
            letterSpacing: "-0.02em",
            marginBottom: "1.25rem",
          }}
        >
          How BestCareerFor.Me works
        </h1>

        <p style={{ fontSize: "1.05rem", lineHeight: 1.75, color: "var(--muted)", margin: "0 0 2rem" }}>
          This page explains, in plain English, how BestCareerFor.Me turns your answers into career suggestions.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "2.25rem" }}>
          <section>
            <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--ink)", marginBottom: "0.5rem" }}>
              What this quiz is (and isn’t)
            </h2>
            <p style={{ margin: 0, fontSize: "1.02rem", lineHeight: 1.75, color: "var(--muted)" }}>
              BestCareerFor.Me is designed to help you discover practical career matches—careers that fit your interests
              and make sense for your real-life constraints. It isn’t a promise that you will love (or qualify for)
              every suggested career. Think of it as a starting point for exploration, not a final decision.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--ink)", marginBottom: "0.5rem" }}>
              The big idea: interests + real-world fit
            </h2>
            <p style={{ margin: "0 0 0.75rem", fontSize: "1.02rem", lineHeight: 1.75, color: "var(--muted)" }}>
              Many career quizzes mainly match you based on interests or personality. BestCareerFor.Me still uses that
              approach—but it adds several reality checks:
            </p>
            <ul style={{ margin: 0, paddingLeft: "1.1rem", color: "var(--muted)", lineHeight: 1.75 }}>
              <li><strong style={{ color: "var(--ink)" }}>Education</strong>: what you’ve studied and how far you’d consider going</li>
              <li><strong style={{ color: "var(--ink)" }}>Experience</strong>: whether you want careers you can pursue now vs. careers that may need more experience</li>
              <li><strong style={{ color: "var(--ink)" }}>Income goals</strong>: a minimum salary you’re aiming for (while still keeping higher-paying careers)</li>
              <li><strong style={{ color: "var(--ink)" }}>Job availability</strong>: whether strong demand is important to you</li>
              <li><strong style={{ color: "var(--ink)" }}>Work setting & work style</strong>: where you prefer to work, how physical you want work to be, and how much you want people interaction</li>
              <li><strong style={{ color: "var(--ink)" }}>AI disruption risk</strong>: how comfortable you are with careers that are more likely to be automated</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--ink)", marginBottom: "0.5rem" }}>
              Step 1: Your interest match (Holland Code)
            </h2>
            <p style={{ margin: "0 0 0.75rem", fontSize: "1.02rem", lineHeight: 1.75, color: "var(--muted)" }}>
              The quiz uses the Holland Code (also called RIASEC) framework to understand the kind of work you tend to enjoy.
            </p>
            <ul style={{ margin: 0, paddingLeft: "1.1rem", color: "var(--muted)", lineHeight: 1.75 }}>
              <li><strong style={{ color: "var(--ink)" }}>R — Realistic</strong>: hands-on, practical, working with tools, machines, the outdoors</li>
              <li><strong style={{ color: "var(--ink)" }}>I — Investigative</strong>: analytical, scientific, problem-solving, research</li>
              <li><strong style={{ color: "var(--ink)" }}>A — Artistic</strong>: creative, expressive, design, writing, performance</li>
              <li><strong style={{ color: "var(--ink)" }}>S — Social</strong>: teaching, helping, coaching, supporting others</li>
              <li><strong style={{ color: "var(--ink)" }}>E — Enterprising</strong>: leading, persuading, selling, building initiatives</li>
              <li><strong style={{ color: "var(--ink)" }}>C — Conventional</strong>: organizing, systems, detail-oriented work, structured tasks</li>
            </ul>
            <p style={{ margin: "0.75rem 0 0", fontSize: "1.02rem", lineHeight: 1.75, color: "var(--muted)" }}>
              Your results include a 3-letter code showing your top interest areas in order.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--ink)", marginBottom: "0.5rem" }}>
              Step 2: Filters and “soft” preferences
            </h2>
            <p style={{ margin: "0 0 0.75rem", fontSize: "1.02rem", lineHeight: 1.75, color: "var(--muted)" }}>
              Some answers act like filters (removing careers that don’t meet a must-have). Others act like preferences
              (ranking careers higher or lower).
            </p>
            <div style={{ display: "grid", gap: "0.9rem" }}>
              {[
                {
                  title: "Salary (income goal)",
                  body:
                    "If you choose a salary target, the quiz treats it as a minimum: careers below your minimum are removed, and higher-paying careers still stay in the mix.",
                },
                {
                  title: "Education and experience",
                  body:
                    "Your education and experience answers help prioritize careers that are more realistic fits. Depending on which persona you choose, the quiz may also use your job history and fields of study to focus the search toward careers in or near your current field and/or related to what you’ve studied or want to study.",
                },
                {
                  title: "Job availability (demand)",
                  body:
                    "When job availability is very important, careers that appear to have low or unclear demand can be penalized or removed.",
                },
                {
                  title: "AI disruption risk",
                  body:
                    "If you indicate low tolerance for AI disruption, the quiz penalizes careers with higher estimated automation risk.",
                },
                {
                  title: "Work style preferences",
                  body:
                    "Preferences like work setting (indoors/outdoors), physical activity level, and people interaction can boost or penalize careers depending on how closely they match what you want.",
                },
              ].map((row) => (
                <div key={row.title} style={{ border: "1px solid var(--border)", background: "var(--card)", borderRadius: 14, padding: "1rem 1.1rem" }}>
                  <div style={{ fontWeight: 700, color: "var(--ink)", marginBottom: "0.25rem" }}>{row.title}</div>
                  <div style={{ color: "var(--muted)", lineHeight: 1.7 }}>{row.body}</div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--ink)", marginBottom: "0.5rem" }}>
              Step 3: Ranking careers
            </h2>
            <p style={{ margin: 0, fontSize: "1.02rem", lineHeight: 1.75, color: "var(--muted)" }}>
              After applying any must-have filters, the quiz scores and ranks remaining careers using interest match
              (Holland Code), education and experience alignment, and your life constraints and preferences (salary,
              demand, work style, AI risk, etc.). The goal is to put careers near the top that fit your interests and are
              more likely to be workable options.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--ink)", marginBottom: "0.5rem" }}>
              How we score (simple numbers)
            </h2>
            <p style={{ margin: "0 0 0.75rem", fontSize: "1.02rem", lineHeight: 1.75, color: "var(--muted)" }}>
              You don’t need to do math to use the quiz—but if you’re curious, here’s a simplified view of how the scoring works.
            </p>
            <ol style={{ margin: 0, paddingLeft: "1.1rem", color: "var(--muted)", lineHeight: 1.75, display: "grid", gap: "0.4rem" }}>
              <li><strong style={{ color: "var(--ink)" }}>Start with a pool of careers.</strong></li>
              <li><strong style={{ color: "var(--ink)" }}>Apply must-have filters.</strong> Some answers remove careers entirely (for example: salary minimum, education ceiling, “qualified now”).</li>
              <li><strong style={{ color: "var(--ink)" }}>Add small nudges.</strong> Preferences add penalty points—typically +10 to +40 depending on what’s mismatched.</li>
              <li><strong style={{ color: "var(--ink)" }}>Add strong penalties for big priorities.</strong> Some priorities can add +40 to +100.</li>
              <li><strong style={{ color: "var(--ink)" }}>Cut off careers that are too far off.</strong> Careers with a total penalty of 100+ usually won’t show up.</li>
              <li><strong style={{ color: "var(--ink)" }}>Use interest match to help rank what remains.</strong> Holland interest match is scored on a 0–6 scale.</li>
            </ol>
            <div style={{ marginTop: "0.9rem", borderRadius: 14, border: "1px solid var(--border)", background: "var(--cream)", padding: "1rem 1.1rem" }}>
              <div style={{ fontWeight: 700, color: "var(--ink)", marginBottom: "0.35rem" }}>Typical point ranges</div>
              <ul style={{ margin: 0, paddingLeft: "1.1rem", color: "var(--muted)", lineHeight: 1.75 }}>
                <li><strong style={{ color: "var(--ink)" }}>Small nudge</strong>: +10 (education fit) to +30 (experience mismatch)</li>
                <li><strong style={{ color: "var(--ink)" }}>Preference mismatch</strong>: ~+20 (people/physical) or ~+25 (work setting)</li>
                <li><strong style={{ color: "var(--ink)" }}>Field/major mismatch</strong>: ~+15 to +40 (depends on persona and how narrowly you want to match)</li>
                <li><strong style={{ color: "var(--ink)" }}>Strong penalty</strong>: +100 (usually removes a career)</li>
                <li><strong style={{ color: "var(--ink)" }}>Interest match</strong>: 0–6 scale</li>
              </ul>
              <div style={{ marginTop: "0.6rem", fontSize: "0.92rem", color: "var(--muted)", lineHeight: 1.6 }}>
                These numbers are intentionally approximate and may evolve as the quiz improves, but the overall idea stays the same.
              </div>
            </div>
          </section>

          <section>
            <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--ink)", marginBottom: "0.5rem" }}>
              A note on data and limitations
            </h2>
            <p style={{ margin: 0, fontSize: "1.02rem", lineHeight: 1.75, color: "var(--muted)" }}>
              Career data is imperfect. Titles and requirements can vary across employers, industries, and regions. This quiz is built to be helpful,
              transparent, and continuously improved—but it cannot account for every factor in a real job search (like networking, portfolio strength,
              credentials, or local employer specifics).
            </p>
          </section>
        </div>
      </article>
    </>
  );
}

