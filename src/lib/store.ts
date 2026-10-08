import { createHash, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { cookies } from "next/headers";

const scrypt = promisify(scryptCallback);
const storePath = path.join(process.cwd(), "data", "marthe-store.json");
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
type Session = { tokenHash: string; userId: string; expiresAt: string };
type CampaignProgress = { started: boolean; resources: Record<string, number>; builtModules: string[]; day: number; finalStep: number; campaignComplete: boolean; showEpilogue?: boolean };
type Store = { users: Account[]; sessions: Session[]; activities: Activity[]; progress: Record<string, CampaignProgress> };

let writeQueue: Promise<void> = Promise.resolve();

async function readStore(): Promise<Store> {
  try {
    const stored = JSON.parse(await readFile(storePath, "utf8")) as Partial<Store>;
    return { users: stored.users ?? [], sessions: stored.sessions ?? [], activities: stored.activities ?? [], progress: stored.progress ?? {} };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return { users: [], sessions: [], activities: [], progress: {} };
  }
}

export async function updateStore<T>(update: (store: Store) => T | Promise<T>): Promise<T> {
  let release: () => void = () => undefined;
  const previousWrite = writeQueue;
  writeQueue = new Promise<void>((resolve) => { release = resolve; });
  await previousWrite;
  try {
    const store = await readStore();
    const result = await update(store);
    await mkdir(path.dirname(storePath), { recursive: true });
    const temporaryPath = `${storePath}.${randomUUID()}.tmp`;
    await writeFile(temporaryPath, JSON.stringify(store, null, 2), "utf8");
    await rename(temporaryPath, storePath);
    return result;
  } finally {
    release();
  }
}

export async function getStore(): Promise<Store> {
  await writeQueue;
  return readStore();
}

export type { CampaignProgress };

export function publicAccount(account: Account): PublicAccount {
  return { id: account.id, name: account.name, email: account.email, role: account.role };
}

export async function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
  const hash = await scrypt(password, salt, 64) as Buffer;
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

export async function startSession(account: Account) {
  const token = randomBytes(32).toString("base64url");
  await updateStore((store) => {
    store.sessions = store.sessions.filter((session) => new Date(session.expiresAt).getTime() > Date.now());
    store.sessions.push({ tokenHash: hashSessionToken(token), userId: account.id, expiresAt: new Date(Date.now() + sessionLifetime).toISOString() });
  });
  const cookieStore = await cookies();
  cookieStore.set(sessionCookie, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: sessionLifetime / 1000 });
}

export async function endSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookie)?.value;
  if (token) {
    const tokenHash = hashSessionToken(token);
    await updateStore((store) => { store.sessions = store.sessions.filter((session) => session.tokenHash !== tokenHash); });
  }
  cookieStore.delete(sessionCookie);
}

export async function getCurrentAccount(): Promise<Account | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookie)?.value;
  if (!token) return null;
  const tokenHash = hashSessionToken(token);
  const store = await getStore();
  const session = store.sessions.find((item) => item.tokenHash === tokenHash && new Date(item.expiresAt).getTime() > Date.now());
  return session ? store.users.find((account) => account.id === session.userId) ?? null : null;
}

export async function recordAccess(account: Account, phase: string, answer: string) {
  const activity: Activity = { id: randomUUID(), userId: account.id, name: account.name, phase, answer, correct: true, kind: "access", at: new Date().toISOString() };
  await updateStore((store) => { store.activities.unshift(activity); store.activities = store.activities.slice(0, 2000); });
  return activity;
}
