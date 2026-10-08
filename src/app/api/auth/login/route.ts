import { NextResponse } from "next/server";
import { getStore, passwordMatches, publicAccount, recordAccess, startSession } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { email?: string; password?: string; role?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Dados do formulário inválidos." }, { status: 400 }); }
  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";
  const account = (await getStore()).users.find((user) => user.email === email);
  if (!account || !(await passwordMatches(password, account.passwordSalt, account.passwordHash))) return NextResponse.json({ error: "E-mail ou senha incorretos." }, { status: 401 });
  if (body.role && body.role !== account.role) return NextResponse.json({ error: "Esta conta pertence a outro perfil." }, { status: 403 });
  await startSession(account);
  await recordAccess(account, account.role === "student" ? "Entrada na expedição" : "Painel docente", "Login realizado");
  return NextResponse.json({ user: publicAccount(account) });
}
