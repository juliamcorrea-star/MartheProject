import { NextResponse } from "next/server";
import { endSession } from "@/lib/store";

export const runtime = "nodejs";

export async function POST() {
  await endSession();
  return NextResponse.json({ success: true });
}
