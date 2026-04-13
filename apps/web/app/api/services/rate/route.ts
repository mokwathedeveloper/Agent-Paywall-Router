import { NextResponse } from "next/server";
import { rateService } from "@/lib/db";

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { id, rating } = body;

    if (!id || typeof rating !== "number" || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Valid service ID and rating (1-5) required" }, { status: 400 });
    }

    const updatedService = await rateService(id, rating);
    
    if (!updatedService) {
      return NextResponse.json({ error: "Service not found or update failed" }, { status: 404 });
    }

    return NextResponse.json(updatedService, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
