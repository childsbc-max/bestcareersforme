import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // MVP: just log feedback. In production we can email/store it.
    console.log("FEEDBACK_SUBMISSION", JSON.stringify(body)?.slice(0, 10_000));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}

