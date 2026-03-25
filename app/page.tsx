import type { Metadata } from "next";
import { ArrowRight, MapPin, DollarSign, GraduationCap, Briefcase, Bot, TrendingUp } from "lucide-react";

export const metadata: Metadata = {
  title: "Free Career Quiz — Find the Right Career for You | bestjobfor.me",
  description:
    "Answer a few questions and discover careers matched to your interests, salary goals, work style, and life situation. Free data-driven career quiz — results in about 10 minutes.",
  openGraph: {
    title: "Free Career Quiz — Find the Right Career for You",
    description:
      "A career quiz that factors in salary, job demand, education, work experience, and AI risk — not just your interests.",
    url: "https://bestjobfor.me",
    siteName: "bestjobfor.me",
  },
};

export default function Home() {
  return (
    <>
      {/* NAV */}
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
        <a href="/" style={{ textDecoration: "none" }}>
          <span className="logo">best<span className="logo-accent">career</span>for.me</span>
        </a>

        <ul
          style={{ listStyle: "none", display: "flex", gap: "2rem", alignItems: "center" }}
          className="nav-links"
        >
          <li>
            <a
              href="#how-it-works"
              style={{ textDecoration: "none", color: "var(--muted)", fontSize: "0.9rem", fontWeight: 500 }}
            >
              How It Works
            </a>
          </li>
          <li>
            <a
              href="/about"
              style={{ textDecoration: "none", color: "var(--muted)", fontSize: "0.9rem", fontWeight: 500 }}
            >
              About
            </a>
          </li>
          <li>
            <a
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
            </a>
          </li>
        </ul>

        <style>{`
          @media (max-width: 768px) {
            .nav-links { display: none !important; }
          }
        `}</style>
      </nav>

      {/* HERO */}
      <section aria-label="Hero">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "4rem",
            padding: "5rem 3rem 4rem",
            maxWidth: 1200,
            margin: "0 auto",
            alignItems: "center",
          }}
          className="hero-grid"
        >
          {/* Left column */}
          <div>
            <div
              style={{
                fontSize: "0.75rem",
                fontWeight: 500,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "var(--amber)",
                marginBottom: "1rem",
                animation: "fadeUp 0.5s ease both",
                animationDelay: "0s",
              }}
            >
              DATA-DRIVEN CAREER MATCHING
            </div>

            <h1
              style={{
                fontFamily: "var(--font-playfair), 'Playfair Display', serif",
                fontSize: "clamp(2.5rem, 4vw, 3.8rem)",
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                marginBottom: "1.5rem",
                animation: "fadeUp 0.5s ease both",
                animationDelay: "0.1s",
              }}
            >
              Find the career that{" "}
              <em style={{ fontStyle: "italic", color: "var(--amber)" }}>fits your life</em>
            </h1>

            <p
              style={{
                fontSize: "1.05rem",
                lineHeight: 1.7,
                color: "var(--muted)",
                marginBottom: "2rem",
                maxWidth: "44ch",
                animation: "fadeUp 0.5s ease both",
                animationDelay: "0.2s",
              }}
            >
              Most career quizzes only look at your interests. This one goes further — matching you to careers based on
              real salary data, job demand in your area, your education and work experience, and how AI-resilient the
              field is. The result is practical career suggestions built around your actual life. Takes about 10 minutes.
            </p>

            <div
              style={{
                display: "flex",
                gap: "1rem",
                flexWrap: "wrap",
                animation: "fadeUp 0.5s ease both",
                animationDelay: "0.3s",
              }}
            >
              <a href="/career-quiz" className="btn-primary">
                Take the Career Quiz <ArrowRight size={16} aria-hidden="true" />
              </a>
              <a href="#how-it-works" className="btn-secondary">
                How It Works
              </a>
            </div>
          </div>

          {/* Right column — hero card */}
          <div
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              padding: "2rem",
              position: "relative",
              overflow: "hidden",
              animation: "fadeUp 0.5s ease both",
              animationDelay: "0.2s",
            }}
          >
            {/* Amber glow */}
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                width: 150,
                height: 150,
                background: "radial-gradient(circle, rgba(200,132,58,0.15) 0%, transparent 70%)",
                borderRadius: "50%",
                transform: "translate(30%, -30%)",
              }}
            />

            <div
              style={{
                fontSize: "0.7rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--muted)",
                marginBottom: "1.5rem",
              }}
            >
              SAMPLE MATCH RESULT
            </div>

            {/* Profile chip */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.8rem",
                background: "var(--cream)",
                border: "1px solid var(--border)",
                padding: "0.7rem 1rem",
                borderRadius: 100,
                marginBottom: "1.5rem",
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  background: "var(--amber)",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: "var(--ink)",
                  flexShrink: 0,
                }}
                aria-hidden="true"
              >
                JT
              </div>
              <div>
                <div style={{ fontSize: "0.85rem", fontWeight: 500 }}>Jordan T., 28</div>
                <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>Recent grad · Undecided</div>
              </div>
            </div>

            {/* Match card */}
            <div
              style={{
                background: "var(--paper)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "1.2rem",
                marginBottom: "1rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "0.8rem",
                }}
              >
                <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>Logistics Engineers</div>
                <div
                  style={{
                    background: "var(--amber)",
                    color: "var(--ink)",
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    padding: "0.2rem 0.6rem",
                    borderRadius: 100,
                  }}
                >
                  87% match
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", fontSize: "0.82rem", color: "var(--muted)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <DollarSign size={13} aria-hidden="true" />
                  $63,000 – $104,000
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <MapPin size={13} aria-hidden="true" />
                  High demand · Austin, TX
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--sage)" }}>
                  <Bot size={13} aria-hidden="true" />
                  Low automation risk
                </div>
              </div>
            </div>

            {/* Filter tags */}
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {["Bachelor's degree", "$60k+ salary", "Indoors"].map((tag) => (
                <span
                  key={tag}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 100,
                    padding: "0.25rem 0.75rem",
                    fontSize: "0.75rem",
                    color: "var(--muted)",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        <style>{`
          @media (max-width: 768px) {
            .hero-grid { grid-template-columns: 1fr !important; padding: 2rem 1.5rem !important; gap: 2rem !important; }
          }
        `}</style>
      </section>

      {/* HOW IT WORKS */}
      <section
        id="how-it-works"
        aria-label="How It Works"
        style={{ background: "var(--paper)", borderTop: "1px solid var(--border)" }}
      >
        <div
          style={{ maxWidth: 1200, margin: "0 auto", padding: "5rem 3rem" }}
          className="how-container"
        >
          <div style={{ marginBottom: "3rem" }}>
            <div
              style={{
                fontSize: "0.75rem",
                fontWeight: 500,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "var(--amber)",
                marginBottom: "0.75rem",
              }}
            >
              THE PROCESS
            </div>
            <h2
              style={{
                fontFamily: "var(--font-playfair), 'Playfair Display', serif",
                fontSize: "2.2rem",
                marginBottom: "0.5rem",
              }}
            >
              Three steps to a better career match
            </h2>
            <p style={{ color: "var(--muted)" }}>
              No fluff. No vague personality types. Just clear, data-backed suggestions you can act on.
            </p>
          </div>

          <div
            style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "2rem" }}
            className="how-grid"
          >
            {[
              {
                num: "01",
                heading: "Tell us about yourself",
                body: "Answer questions about your background, interests, work style, and goals. The quiz adapts based on where you are in your career — whether you're just starting out or ready for something new.",
              },
              {
                num: "02",
                heading: "We match you to real careers",
                body: "Your answers are scored against a database of 900+ occupations — filtered by salary, local job demand, education fit, and AI risk. Not just what sounds interesting, but what actually works for your life.",
              },
              {
                num: "03",
                heading: "Get results you can use",
                body: "See your top career matches with real salary ranges, demand levels in your state, education requirements, and a description of what the work actually looks like day to day.",
              },
            ].map((card) => (
              <div
                key={card.num}
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: "2rem",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-playfair), 'Playfair Display', serif",
                    fontSize: "3rem",
                    fontWeight: 700,
                    color: "var(--cream)",
                    marginBottom: "1rem",
                    lineHeight: 1,
                  }}
                  aria-hidden="true"
                >
                  {card.num}
                </div>
                <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.5rem" }}>{card.heading}</h3>
                <p style={{ fontSize: "0.88rem", color: "var(--muted)", lineHeight: 1.6 }}>{card.body}</p>
              </div>
            ))}
          </div>
        </div>

        <style>{`
          @media (max-width: 768px) {
            .how-grid { grid-template-columns: 1fr !important; }
            .how-container { padding: 3rem 1.5rem !important; }
          }
        `}</style>
      </section>

      {/* WHAT WE FACTOR IN */}
      <section
        aria-label="What We Factor In"
        style={{ background: "var(--ink)" }}
      >
        <div
          style={{ maxWidth: 1200, margin: "0 auto", padding: "5rem 3rem" }}
          className="features-container"
        >
          <div style={{ marginBottom: "3rem" }}>
            <div
              style={{
                fontSize: "0.75rem",
                fontWeight: 500,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "var(--amber)",
                marginBottom: "0.75rem",
              }}
            >
              WHY THIS QUIZ IS DIFFERENT
            </div>
            <h2
              style={{
                fontFamily: "var(--font-playfair), 'Playfair Display', serif",
                fontSize: "2.2rem",
                color: "var(--paper)",
                marginBottom: "0.5rem",
              }}
            >
              More than just a personality test
            </h2>
            <p style={{ color: "rgba(255,255,255,0.5)" }}>
              Most career quizzes stop at interests. We layer in the data that actually determines whether a career works
              for your life.
            </p>
          </div>

          <div
            style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.5rem" }}
            className="features-grid"
          >
            {[
              {
                icon: <DollarSign size={22} aria-hidden="true" style={{ color: "var(--amber)" }} />,
                heading: "Real salary data",
                body: "Every career shows actual salary ranges from BLS — low, median, and high — so you know what you're actually signing up for, not a ballpark guess.",
              },
              {
                icon: <MapPin size={22} aria-hidden="true" style={{ color: "var(--amber)" }} />,
                heading: "Job demand in your area",
                body: "We check whether careers are actually hiring in your state using BLS employment data. High demand near you rises in your results. Low demand doesn't disappear — it's just flagged.",
              },
              {
                icon: <GraduationCap size={22} aria-hidden="true" style={{ color: "var(--amber)" }} />,
                heading: "Education and experience aware",
                body: "Tell us what you've studied and how far you're willing to go. We filter out careers that don't fit your education level and surface ones that match where you are right now.",
              },
              {
                icon: <Bot size={22} aria-hidden="true" style={{ color: "var(--amber)" }} />,
                heading: "AI risk assessment",
                body: "Every career is scored for automation risk. You decide how much that matters to you — from \"I'll adapt to anything\" to \"I want a field AI won't touch.\"",
              },
              {
                icon: <Briefcase size={22} aria-hidden="true" style={{ color: "var(--amber)" }} />,
                heading: "Your work style",
                body: "Indoors or outdoors. Desk work or on your feet. Solo or people-facing. We match your physical and social preferences to careers that actually feel right day to day.",
              },
              {
                icon: <TrendingUp size={22} aria-hidden="true" style={{ color: "var(--amber)" }} />,
                heading: "Interest matching",
                body: "Holland Interest Codes give us a principled read on what kinds of problems and environments energize you — and we use it as the foundation, not the whole picture.",
              },
            ].map((card) => (
              <div
                key={card.heading}
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 12,
                  padding: "1.8rem",
                  transition: "background 0.2s",
                }}
                className="feature-card"
              >
                <div style={{ marginBottom: "1rem" }}>{card.icon}</div>
                <h3 style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--paper)", marginBottom: "0.5rem" }}>
                  {card.heading}
                </h3>
                <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>{card.body}</p>
              </div>
            ))}
          </div>
        </div>

        <style>{`
          @media (max-width: 1024px) {
            .features-grid { grid-template-columns: repeat(2, 1fr) !important; }
          }
          @media (max-width: 768px) {
            .features-grid { grid-template-columns: 1fr !important; }
            .features-container { padding: 3rem 1.5rem !important; }
          }
          .feature-card:hover { background: rgba(255,255,255,0.08) !important; }
        `}</style>
      </section>

      {/* FOOTER */}
      <footer
        style={{
          borderTop: "1px solid var(--border)",
          background: "var(--paper)",
          padding: "2rem 3rem",
          textAlign: "center",
          color: "var(--muted)",
          fontSize: "0.85rem",
        }}
      >
        © 2025 bestjobfor.me · A data-driven career quiz built for real life.
      </footer>
    </>
  );
}
