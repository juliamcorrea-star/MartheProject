import { NextResponse } from "next/server";
import { getCurrentAccount, publicAccount } from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  const account = await getCurrentAccount();
  if (!account) return NextResponse.json({ user: null });
  return NextResponse.json({ user: publicAccount(account) });
}
