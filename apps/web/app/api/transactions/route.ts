import { NextRequest, NextResponse } from "next/server";
import { getTransactions } from "@/lib/db";

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId") || undefined;
  const txs = await getTransactions(sessionId);

  return NextResponse.json({
    transactions: txs,
    total: txs.length,
    totalSpent: txs
      .filter((t) => t.status === "success")
      .reduce((sum, t) => sum + t.amount, 0),
  });
}
