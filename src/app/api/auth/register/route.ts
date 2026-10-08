import { NextResponse } from "next/server";
import { hashPassword, publicAccount, recordAccess, startSession, updateStore, type AccountRole } from "@/lib/store";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { name?: string; email?: string; password?: string; role?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Dados do formulário inválidos." }, { status: 400 }); }
  const name = body.name?.trim() ?? "";
  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";
  const role = body.role;
  if (name.length < 2 || name.length > 48) return NextResponse.json({ error: "Informe um nome entre 2 e 48 caracteres." }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 });
  if (password.length < 4) return NextResponse.json({ error: "A senha precisa ter pelo menos 4 caracteres." }, { status: 400 });
  if (role !== "student" && role !== "teacher") return NextResponse.json({ error: "Selecione estudante ou professor." }, { status: 400 });
  const { salt, hash } = await hashPassword(password);
  const account = await updateStore((store) => {
    if (store.users.some((user) => user.email === email)) return null;
    const created: Parameters<typeof publicAccount>[0] = { id: randomUUID(), name, email, role: role as AccountRole, passwordSalt: salt, passwordHash: hash, createdAt: new Date().toISOString() };
    store.users.push(created);
    return created;
  });
  if (!account) return NextResponse.json({ error: "Já existe uma conta com esse e-mail." }, { status: 409 });
  await startSession(account);
  await recordAccess(account, role === "student" ? "Entrada na expedição" : "Painel docente", role === "student" ? "Conta de estudante criada" : "Conta de professor criada");
  return NextResponse.json({ user: publicAccount(account) }, { status: 201 });
}
