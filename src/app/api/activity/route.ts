import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentAccount, getStore, saveActivity, type Activity } from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  const account = await getCurrentAccount();
  if (!account) return NextResponse.json({ error: "Entre na sua conta para continuar." }, { status: 401 });
  const store = await getStore();
  const activities = store.activities.filter((activity) => account.role === "teacher" || activity.userId === account.id);
  return NextResponse.json({ activities });
}

export async function POST(request: Request) {
  const account = await getCurrentAccount();
  if (!account) return NextResponse.json({ error: "Entre na sua conta para continuar." }, { status: 401 });
  if (account.role !== "student") return NextResponse.json({ error: "Somente contas de estudante podem registrar respostas." }, { status: 403 });
  let body: { phase?: string; answer?: string; correct?: boolean };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Resposta inválida." }, { status: 400 }); }
  const phase = body.phase?.trim() ?? "";
  const answer = body.answer?.trim() ?? "";
  if (!phase || phase.length > 100 || !answer || answer.length > 100 || typeof body.correct !== "boolean") return NextResponse.json({ error: "Informe etapa, resposta e resultado." }, { status: 400 });
  const activity: Activity = { id: randomUUID(), userId: account.id, name: account.name, phase, answer, correct: body.correct, kind: "answer", at: new Date().toISOString() };
  try {
    await saveActivity(activity);
  } catch (error) {
    console.error("Erro ao registrar resposta:", error);
    const message = error instanceof Error ? error.message : "Não foi possível registrar a resposta.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
  return NextResponse.json({ activity }, { status: 201 });
}
