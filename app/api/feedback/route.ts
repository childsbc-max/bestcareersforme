import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { feedback, answers, debug } = body;

    await resend.emails.send({
      from: "bestcareerfor.me <onboarding@resend.dev>",
      to: "contact@brianchilds.me",
      subject: "New Quiz Feedback",
      text: [
        `FEEDBACK:\n${feedback}`,
        `\nANSWERS:\n${JSON.stringify(answers, null, 2)}`,
        `\nDEBUG:\n${JSON.stringify(debug, null, 2)}`,
      ].join("\n"),
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("FEEDBACK_ERROR", e);
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
