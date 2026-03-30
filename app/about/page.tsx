import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "About — bestcareerfor.me",
  description:
    "Why bestcareerfor.me exists: a career quiz that factors education, experience, salary, job demand, and more — not just interests.",
  openGraph: {
    title: "About — bestcareerfor.me",
    description:
      "The story behind a career quiz built to match your whole life, not just your personality.",
    url: "https://bestcareerfor.me/about",
    siteName: "bestcareerfor.me",
  },
};

export default function AboutPage() {
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
          <li>
            <Link
              href="/#how-it-works"
              style={{ textDecoration: "none", color: "var(--muted)", fontSize: "0.9rem", fontWeight: 500 }}
            >
              How It Works
            </Link>
          </li>
          <li>
            <span style={{ color: "var(--ink)", fontSize: "0.9rem", fontWeight: 600 }}>About</span>
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
        `}</style>
      </nav>

      <article
        style={{
          maxWidth: 720,
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
          About
        </p>

        <h1
          style={{
            fontFamily: "var(--font-playfair), 'Playfair Display', serif",
            fontSize: "clamp(2rem, 4vw, 2.75rem)",
            lineHeight: 1.15,
            letterSpacing: "-0.02em",
            marginBottom: "2rem",
          }}
        >
          Why this quiz exists
        </h1>

        <div
          className="about-intro-grid"
          style={{
            display: "grid",
            gap: "2rem",
            marginBottom: "2.5rem",
            alignItems: "start",
          }}
        >
          <div
            style={{
              position: "relative",
              width: "100%",
              maxWidth: 196,
              aspectRatio: "3 / 4",
              borderRadius: 16,
              overflow: "hidden",
              border: "1px solid var(--border)",
              boxShadow: "0 12px 40px rgba(15, 14, 12, 0.08)",
              margin: "0 auto",
            }}
          >
            <Image
              src="/brian-about.png"
              alt="Professional headshot of Brian, creator of bestcareerfor.me"
              fill
              sizes="(max-width: 900px) 196px, 196px"
              priority
              style={{ objectFit: "cover", objectPosition: "50% 28%" }}
            />
          </div>

          <div
            className="about-prose"
            style={{
              fontSize: "1.05rem",
              lineHeight: 1.75,
              color: "var(--ink)",
            }}
          >
            <p style={{ margin: "0 0 1.25rem", color: "var(--muted)" }}>
              After 15 years in SEO and two master&apos;s degrees — one in Journalism, one in Business with a focus on
              data analytics — I decided to take a career quiz for inspiration.
            </p>
            <p style={{ margin: "0 0 1.25rem", color: "var(--ink)", fontWeight: 600 }}>
              My top result? Zoo educator.
            </p>
            <p style={{ margin: "0 0 1.25rem", color: "var(--muted)" }}>
              To be fair, I would genuinely love being a zoo educator. But it wasn&apos;t exactly what I had in mind,
              and my résumé wasn&apos;t going to get me there anytime soon.
            </p>
          </div>
        </div>

        <div style={{ fontSize: "1.05rem", lineHeight: 1.75, color: "var(--muted)" }}>
          <p style={{ margin: "0 0 1.25rem" }}>
            The experience stuck with me, though — not because the result was wrong, but because the quiz didn&apos;t
            know enough about me to be right. It had no idea what I&apos;d studied, what I earned, where I lived, or
            whether the field was even hiring. It matched my personality and called it a day.
          </p>
          <p style={{ margin: "0 0 1.25rem" }}>
            I felt like there had to be a better way. So I built BestCareerFor.Me.
          </p>
          <p style={{ margin: "0 0 1.25rem" }}>
            Like most career tools, it uses the Holland Code interest framework to understand what kind of work
            energizes you. But it also factors in your education, your experience, your salary needs, local job demand,
            how much you want to work with people, and the risk of AI disruption in your field — because a career that
            fits your personality but not your life isn&apos;t really a fit at all.
          </p>
          <p style={{ margin: "0 0 2rem" }}>
            I hope you find it useful. And whether you do or you don&apos;t, I&apos;d love to hear about it — I&apos;m
            working to make it better all the time.
          </p>
          <p
            style={{
              margin: 0,
              fontFamily: "var(--font-playfair), 'Playfair Display', serif",
              fontStyle: "italic",
              fontSize: "1.15rem",
              color: "var(--ink)",
            }}
          >
            — Brian
          </p>
        </div>

        <div style={{ marginTop: "3rem", display: "flex", flexWrap: "wrap", gap: "1rem" }}>
          <Link href="/career-quiz" className="btn-primary">
            Take the Career Quiz <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link href="/" className="btn-secondary">
            Back to home
          </Link>
        </div>
      </article>

      <style>{`
        @media (min-width: 900px) {
          .about-intro-grid {
            grid-template-columns: minmax(154px, 196px) 1fr;
            gap: 2.5rem;
          }
          .about-intro-grid > div:first-child {
            margin: 0;
          }
        }
      `}</style>
    </>
  );
}
