export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-start justify-center gap-6 p-6">
      <h1 className="text-3xl font-semibold">Career quiz (MVP)</h1>
      <p className="text-sm text-zinc-600">
        This is a P1-only prototype for collecting feedback. Results include job descriptions.
      </p>
      <a
        href="/career-quiz"
        className="rounded bg-zinc-900 px-4 py-2 text-sm text-white"
      >
        Start the quiz
      </a>
    </main>
  );
}
