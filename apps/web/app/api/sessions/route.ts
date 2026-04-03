import { NextRequest, NextResponse } from "next/server";
import { createSession, getAllSessions, getSession, getSpendingSummary } from "@/lib/db";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const session = await createSession(body.spendingLimit || 5.0);
  return NextResponse.json(session, { status: 201 });
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");

  if (id) {
    const session = await getSession(id);
    if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const summary = await getSpendingSummary(id);
    return NextResponse.json({ ...session, summary });
  }

  const sessions = await getAllSessions();
  return NextResponse.json(sessions);
}
