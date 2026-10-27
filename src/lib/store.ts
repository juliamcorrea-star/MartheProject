import { createHash, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { createServiceClient } from "./supabase/server";

const scrypt = promisify(scryptCallback);
const sessionCookie = "marthe_session";
const sessionLifetime = 1000 * 60 * 60 * 24 * 30;

export type AccountRole = "student" | "teacher";
export type Account = {
  id: string;
  name: string;
  email: string;
  role: AccountRole;
  passwordSalt: string;
  passwordHash: string;
  createdAt: string;
};
export type PublicAccount = Pick<Account, "id" | "name" | "email" | "role">;
export type Activity = {
  id: string;
  userId: string;
  name: string;
  phase: string;
  answer: string;
  correct: boolean;
  kind: "access" | "answer";
  at: string;
};
export type Session = { tokenHash: string; userId: string; expiresAt: string };
export type CampaignProgress = {
  started: boolean;
  resources: Record<string, number>;
  builtModules: string[];
  day: number;
  finalStep: number;
  campaignComplete: boolean;
  showEpilogue?: boolean;
};
export type Store = {
  users: Account[];
  sessions: Session[];
  activities: Activity[];
  progress: Record<string, CampaignProgress>;
};

function throwDatabaseError(operation: string, error: { message: string } | null) {
  if (!error) return;
  console.error(`Supabase error while ${operation}:`, error);
  throw new Error(`Supabase error while ${operation}: ${error.message}`);
}

export function publicAccount(account: Account): PublicAccount {
  return { id: account.id, name: account.name, email: account.email, role: account.role };
}

export async function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
  const hash = (await scrypt(password, salt, 64)) as Buffer;
  return { salt, hash: hash.toString("hex") };
}

export async function passwordMatches(password: string, salt: string, expectedHash: string) {
  const { hash } = await hashPassword(password, salt);
  const actual = Buffer.from(hash, "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function getStore(): Promise<Store> {
  const supabase = createServiceClient();

  const [usersRes, sessionsRes, activitiesRes, progressRes] = await Promise.all([
    supabase.from("users").select("*"),
    supabase.from("sessions").select("*"),
    supabase.from("activities").select("*").order("at", { ascending: false }),
    supabase.from("progress").select("*"),
  ]);

  throwDatabaseError("loading users", usersRes.error);
  throwDatabaseError("loading sessions", sessionsRes.error);
  throwDatabaseError("loading activities", activitiesRes.error);
  throwDatabaseError("loading progress", progressRes.error);

  const users: Account[] = (usersRes.data ?? []).map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role as AccountRole,
    passwordSalt: u.password_salt,
    passwordHash: u.password_hash,
    createdAt: u.created_at,
  }));

  const sessions: Session[] = (sessionsRes.data ?? []).map((s) => ({
    tokenHash: s.token_hash,
    userId: s.user_id,
    expiresAt: s.expires_at,
  }));

  const activities: Activity[] = (activitiesRes.data ?? []).map((a) => ({
    id: a.id,
    userId: a.user_id,
    name: a.name,
    phase: a.phase,
    answer: a.answer,
    correct: a.correct,
    kind: a.kind as "access" | "answer",
    at: a.at,
  }));

  const progressMap: Record<string, CampaignProgress> = {};
  (progressRes.data ?? []).forEach((p) => {
    progressMap[p.user_id] = {
      started: p.started,
      resources: p.resources,
      builtModules: p.built_modules ?? [],
      day: p.day,
      finalStep: p.final_step,
      campaignComplete: p.campaign_complete,
      showEpilogue: p.show_epilogue,
    };
  });

  return { users, sessions, activities, progress: progressMap };
}

export async function getUserProgress(userId: string): Promise<CampaignProgress | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("progress")
    .select("started, resources, built_modules, day, final_step, campaign_complete, show_epilogue")
    .eq("user_id", userId)
    .maybeSingle();

  throwDatabaseError("loading user progress", error);
  if (!data) return null;

  return {
    started: data.started,
    resources: data.resources,
    builtModules: data.built_modules ?? [],
    day: data.day,
    finalStep: data.final_step,
    campaignComplete: data.campaign_complete,
    showEpilogue: data.show_epilogue ?? false,
  };
}

export async function saveUserProgress(userId: string, progress: CampaignProgress): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.from("progress").upsert({
    user_id: userId,
    started: progress.started,
    resources: progress.resources,
    built_modules: progress.builtModules,
    day: progress.day,
    final_step: progress.finalStep,
    campaign_complete: progress.campaignComplete,
    show_epilogue: progress.showEpilogue ?? false,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });

  throwDatabaseError("saving user progress", error);
}

export async function updateStore<T>(update: (store: Store) => T | Promise<T>): Promise<T> {
  const store = await getStore();
  const result = await update(store);
  const supabase = createServiceClient();

  for (const u of store.users) {
    const { error } = await supabase.from("users").upsert({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      password_salt: u.passwordSalt,
      password_hash: u.passwordHash,
      created_at: u.createdAt,
    });
    throwDatabaseError("saving user", error);
  }

  for (const s of store.sessions) {
    const { error } = await supabase.from("sessions").upsert({
      token_hash: s.tokenHash,
      user_id: s.userId,
      expires_at: s.expiresAt,
    });
    throwDatabaseError("saving session", error);
  }

  for (const a of store.activities) {
    const { error } = await supabase.from("activities").upsert({
      id: a.id,
      user_id: a.userId,
      name: a.name,
      phase: a.phase,
      answer: a.answer,
      correct: a.correct,
      kind: a.kind,
      at: a.at,
    });
    throwDatabaseError("saving activity", error);
  }

  for (const [userId, prog] of Object.entries(store.progress)) {
    const { error } = await supabase.from("progress").upsert({
      user_id: userId,
      started: prog.started,
      resources: prog.resources,
      built_modules: prog.builtModules,
      day: prog.day,
      final_step: prog.finalStep,
      campaign_complete: prog.campaignComplete,
      show_epilogue: prog.showEpilogue ?? false,
      updated_at: new Date().toISOString(),
    });
    throwDatabaseError("saving progress", error);
  }

  return result;
}

export async function startSession(account: Account) {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + sessionLifetime).toISOString();

  const supabase = createServiceClient();

  const { error: cleanupError } = await supabase.from("sessions").delete().lt("expires_at", new Date().toISOString());
  throwDatabaseError("cleaning up expired sessions", cleanupError);

  const { error } = await supabase.from("sessions").insert({
    token_hash: tokenHash,
    user_id: account.id,
    expires_at: expiresAt,
  });
  throwDatabaseError("creating session", error);

  const cookieStore = await cookies();
  cookieStore.set(sessionCookie, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionLifetime / 1000,
  });
}

export async function endSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookie)?.value;

  if (token) {
    const tokenHash = hashSessionToken(token);
    const supabase = createServiceClient();
    const { error } = await supabase.from("sessions").delete().eq("token_hash", tokenHash);
    throwDatabaseError("ending session", error);
  }

  cookieStore.delete(sessionCookie);
}

export async function getCurrentAccount(): Promise<Account | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookie)?.value;
  if (!token) return null;

  const tokenHash = hashSessionToken(token);
  const supabase = createServiceClient();

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("user_id, expires_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  throwDatabaseError("validating session", sessionError);

  if (!session || new Date(session.expires_at).getTime() <= Date.now()) {
    return null;
  }

  const { data: user, error: userError } = await supabase
    .from("users")
    .select("*")
    .eq("id", session.user_id)
    .maybeSingle();
  throwDatabaseError("loading account for session", userError);

  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as AccountRole,
    passwordSalt: user.password_salt,
    passwordHash: user.password_hash,
    createdAt: user.created_at,
  };
}

export async function recordAccess(account: Account, phase: string, answer: string) {
  const activity: Activity = {
    id: randomUUID(),
    userId: account.id,
    name: account.name,
    phase,
    answer,
    correct: true,
    kind: "access",
    at: new Date().toISOString(),
  };

  const supabase = createServiceClient();

  const { error } = await supabase.from("activities").insert({
    id: activity.id,
    user_id: activity.userId,
    name: activity.name,
    phase: activity.phase,
    answer: activity.answer,
    correct: activity.correct,
    kind: activity.kind,
    at: activity.at,
  });
  throwDatabaseError("recording account access", error);

  return activity;
}

export async function saveActivity(activity: Activity): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.from("activities").insert({
    id: activity.id,
    user_id: activity.userId,
    name: activity.name,
    phase: activity.phase,
    answer: activity.answer,
    correct: activity.correct,
    kind: activity.kind,
    at: activity.at,
  });
  throwDatabaseError("saving activity", error);
}