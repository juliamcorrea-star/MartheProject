import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { hashPassword, publicAccount, recordAccess, startSession, type Account } from "@/lib/store";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Dados do formulário inválidos." }, { status: 400 });
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Dados do formulário inválidos." }, { status: 400 });
    }

    const formData = body as Record<string, unknown>;
    const name = typeof formData.name === "string" ? formData.name.trim() : "";
    const email = typeof formData.email === "string" ? formData.email.trim().toLowerCase() : "";
    const password = typeof formData.password === "string" ? formData.password : "";
    const role = formData.role;

    if (name.length < 2 || name.length > 48) return NextResponse.json({ error: "Informe um nome entre 2 e 48 caracteres." }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 });
    if (password.length < 4) return NextResponse.json({ error: "A senha precisa ter pelo menos 4 caracteres." }, { status: 400 });
    if (role !== "student" && role !== "teacher") return NextResponse.json({ error: "Selecione estudante ou professor." }, { status: 400 });

    const { salt, hash } = await hashPassword(password);
    const account: Account = {
      id: randomUUID(),
      name,
      email,
      role,
      passwordSalt: salt,
      passwordHash: hash,
      createdAt: new Date().toISOString(),
    };
    const supabase = createServiceClient();
    const { error } = await supabase.from("users").insert({
      id: account.id,
      name: account.name,
      email: account.email,
      role: account.role,
      password_salt: account.passwordSalt,
      password_hash: account.passwordHash,
      created_at: account.createdAt,
    });

    if (error) {
      console.error("Erro ao inserir usuário no Supabase:", error);
      const status = error.code === "23505" ? 409 : error.code === "42501" ? 403 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }

    await startSession(account);
    await recordAccess(account, role === "student" ? "Entrada na expedição" : "Painel docente", role === "student" ? "Conta de estudante criada" : "Conta de professor criada");
    return NextResponse.json({ user: publicAccount(account) }, { status: 201 });
  } catch (error) {
    console.error("Erro ao registrar conta:", error);
    const message = error instanceof Error ? error.message : "Não foi possível criar a conta.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
