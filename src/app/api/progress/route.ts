import { NextResponse } from "next/server";
import { getCurrentAccount, getStore, updateStore } from "@/lib/store";

export const runtime = "nodejs";

const moduleIds = ["habitat", "greenhouse", "extractor", "laboratory"];
const resourceIds = ["water", "food", "alloy", "power"];

function isValidProgress(value: unknown): value is { started: boolean; resources: Record<string, number>; builtModules: string[]; day: number; finalStep: number; campaignComplete: boolean; showEpilogue?: boolean } {
  if (!value || typeof value !== "object") return false;
  const progress = value as Record<string, unknown>;
  if (typeof progress.started !== "boolean" || typeof progress.campaignComplete !== "boolean") return false;
  if (progress.showEpilogue !== undefined && typeof progress.showEpilogue !== "boolean") return false;
  if (!Number.isInteger(progress.day) || Number(progress.day) < 1 || Number(progress.day) > 10000) return false;
  if (!Number.isInteger(progress.finalStep) || Number(progress.finalStep) < 0 || Number(progress.finalStep) > 4) return false;
  if (!Array.isArray(progress.builtModules) || progress.builtModules.some((id) => typeof id !== "string" || !moduleIds.includes(id))) return false;
  if (new Set(progress.builtModules).size !== progress.builtModules.length) return false;
  if (!progress.resources || typeof progress.resources !== "object") return false;
  const resources = progress.resources as Record<string, unknown>;
  return resourceIds.every((id) => typeof resources[id] === "number" && Number.isFinite(resources[id]) && resources[id] >= 0 && resources[id] <= 100000);
}

export async function GET() {
  const account = await getCurrentAccount();
  if (!account) return NextResponse.json({ error: "Entre na sua conta para continuar." }, { status: 401 });
  if (account.role !== "student") return NextResponse.json({ error: "O progresso de missão pertence a contas de estudante." }, { status: 403 });
  const store = await getStore();
  return NextResponse.json({ progress: store.progress?.[account.id] ?? null });
}

export async function PUT(request: Request) {
  const account = await getCurrentAccount();
  if (!account) return NextResponse.json({ error: "Entre na sua conta para continuar." }, { status: 401 });
  if (account.role !== "student") return NextResponse.json({ error: "O progresso de missão pertence a contas de estudante." }, { status: 403 });
  let progress: unknown;
  try { progress = await request.json(); } catch { return NextResponse.json({ error: "Dados de progresso inválidos." }, { status: 400 }); }
  if (!isValidProgress(progress)) return NextResponse.json({ error: "Os dados de progresso não são válidos." }, { status: 400 });
  await updateStore((store) => {
    store.progress ??= {};
    store.progress[account.id] = progress;
  });
  return NextResponse.json({ success: true });
}
