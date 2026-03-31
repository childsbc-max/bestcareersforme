import type { Metadata } from "next";
import { Playfair_Display, DM_Sans } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "700"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

export const metadata: Metadata = {
  title: "bestcareerfor.me — Find Your Career Match",
  description: "Answer a few questions and discover careers matched to your interests, goals, and life situation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${playfair.variable} ${dmSans.variable} antialiased`}>
        {children}
        <footer
          style={{
            borderTop: "1px solid var(--border)",
            background: "var(--paper)",
            padding: "2.25rem 1.5rem",
          }}
        >
          <div
            style={{
              maxWidth: 1100,
              margin: "0 auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1rem",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
              <Link href="/" style={{ textDecoration: "none" }}>
                <span className="logo" style={{ fontSize: "1.1rem" }}>
                  best<span className="logo-accent">career</span>for.me
                </span>
              </Link>
              <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
                Career matches that fit your life—not just your interests.
              </span>
            </div>

            <nav aria-label="Footer" style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              <Link href="/#how-it-works" style={{ color: "var(--muted)", textDecoration: "none", fontWeight: 500, fontSize: "0.9rem" }}>
                How it works
              </Link>
              <Link href="/methodology" style={{ color: "var(--muted)", textDecoration: "none", fontWeight: 500, fontSize: "0.9rem" }}>
                Methodology
              </Link>
              <Link href="/about" style={{ color: "var(--muted)", textDecoration: "none", fontWeight: 500, fontSize: "0.9rem" }}>
                About
              </Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
