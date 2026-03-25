import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { feedback, answers, debug } = body;

    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data, error } = await resend.emails.send({
      from: "bestcareerfor.me <onboarding@resend.dev>",
      to: "contact@brianchilds.me",
      subject: "New Quiz Feedback",
      text: [
        `FEEDBACK:\n${feedback}`,
        `\nANSWERS:\n${JSON.stringify(answers, null, 2)}`,
        `\nDEBUG:\n${JSON.stringify(debug, null, 2)}`,
      ].join("\n"),
    });

    if (error) {
      console.error("RESEND_ERROR", JSON.stringify(error));
      return NextResponse.json({ ok: false, error }, { status: 400 });
    }

    console.log("RESEND_SUCCESS", data?.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("FEEDBACK_ERROR", e);
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
