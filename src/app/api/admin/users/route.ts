import { NextResponse } from "next/server";
import { getCurrentAccount, getStore, publicAccount } from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  const requester = await getCurrentAccount();
  if (!requester) return NextResponse.json({ error: "Entre na sua conta para continuar." }, { status: 401 });
  if (requester.role !== "teacher") return NextResponse.json({ error: "Acesso exclusivo para professores." }, { status: 403 });

  const store = await getStore();
  const users = store.users.map((account) => {
    const activities = store.activities.filter((activity) => activity.userId === account.id);
    const answers = activities.filter((activity) => activity.kind === "answer");
    const progress = account.role === "student" ? store.progress[account.id] ?? null : null;
    return {
      ...publicAccount(account),
      createdAt: account.createdAt,
      lastActivityAt: activities[0]?.at ?? null,
      accessCount: activities.filter((activity) => activity.kind === "access").length,
      correctCount: answers.filter((activity) => activity.correct).length,
      incorrectCount: answers.filter((activity) => !activity.correct).length,
      progress: progress ? {
        started: progress.started,
        builtCount: progress.builtModules.length,
        finalStep: progress.finalStep,
        complete: progress.campaignComplete,
        showEpilogue: progress.showEpilogue ?? false,
        resources: progress.resources,
        day: progress.day,
      } : null,
    };
  });
  const activities = store.activities.slice(0, 300);
  return NextResponse.json({ users, activities, currentUserId: requester.id });
}
