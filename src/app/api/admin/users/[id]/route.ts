import { NextResponse } from "next/server";
import { getCurrentAccount, hashPassword, publicAccount, updateStore } from "@/lib/store";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const requester = await getCurrentAccount();
  if (!requester) return NextResponse.json({ error: "Entre na sua conta para continuar." }, { status: 401 });
  if (requester.role !== "teacher") return NextResponse.json({ error: "Acesso exclusivo para professores." }, { status: 403 });

  const { id } = await context.params;
  let body: { name?: string; email?: string; role?: string; password?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Dados da conta inválidos." }, { status: 400 }); }
  const name = body.name?.trim() ?? "";
  const email = body.email?.trim().toLowerCase() ?? "";
  const role = body.role;
  const password = body.password?.trim() ?? "";
  if (name.length < 2 || name.length > 48) return NextResponse.json({ error: "O nome deve ter entre 2 e 48 caracteres." }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 });
  if (role !== "student" && role !== "teacher") return NextResponse.json({ error: "Perfil inválido." }, { status: 400 });
  if (password && (password.length < 4 || password.length > 128)) return NextResponse.json({ error: "A nova senha deve ter entre 4 e 128 caracteres." }, { status: 400 });
  if (id === requester.id && role !== requester.role) return NextResponse.json({ error: "Não é possível alterar o próprio perfil." }, { status: 403 });

  const passwordHash = password ? await hashPassword(password) : null;
  const result = await updateStore((store) => {
    const target = store.users.find((user) => user.id === id);
    if (!target) return { error: "Conta não encontrada.", status: 404 as const };
    if (store.users.some((user) => user.id !== id && user.email === email)) return { error: "Já existe uma conta com esse e-mail.", status: 409 as const };
    if (target.role === "teacher" && role === "student" && store.users.filter((user) => user.role === "teacher").length <= 1) return { error: "Não é possível rebaixar o último professor." , status: 409 as const };
    target.name = name;
    target.email = email;
    target.role = role;
    if (passwordHash) {
      target.passwordSalt = passwordHash.salt;
      target.passwordHash = passwordHash.hash;
      if (id !== requester.id) store.sessions = store.sessions.filter((session) => session.userId !== id);
    }
    if (role === "teacher") delete store.progress[id];
    store.activities.forEach((activity) => { if (activity.userId === id) activity.name = name; });
    return { user: publicAccount(target) };
  });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ user: result.user });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const requester = await getCurrentAccount();
  if (!requester) return NextResponse.json({ error: "Entre na sua conta para continuar." }, { status: 401 });
  if (requester.role !== "teacher") return NextResponse.json({ error: "Acesso exclusivo para professores." }, { status: 403 });

  const { id } = await context.params;
  if (id === requester.id) return NextResponse.json({ error: "Não é possível excluir a própria conta enquanto estiver administrando." }, { status: 409 });
  const result = await updateStore((store) => {
    const index = store.users.findIndex((user) => user.id === id);
    if (index < 0) return { error: "Conta não encontrada.", status: 404 as const };
    const target = store.users[index];
    if (target.role === "teacher" && store.users.filter((user) => user.role === "teacher").length <= 1) return { error: "Não é possível excluir o último professor." , status: 409 as const };
    store.users.splice(index, 1);
    store.sessions = store.sessions.filter((session) => session.userId !== id);
    store.activities = store.activities.filter((activity) => activity.userId !== id);
    delete store.progress[id];
    return { success: true };
  });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ success: true });
}
