import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { ensureSchema } from "./db";

const SECRET = new TextEncoder().encode("diagnosticos-demo-secret-key-do-not-use-in-prod");
const COOKIE_NAME = "diagnosticos_session";

export type Role = "TECH" | "ADMIN" | "REVIEWER";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  photoUrl: string | null;
  credential: string | null;
  truckId: string | null;
};

export function getUserByEmail(email: string) {
  const db = ensureSchema();
  return db.prepare(`SELECT * FROM users WHERE email = ?`).get(email) as any;
}

export function getUserById(id: string) {
  const db = ensureSchema();
  return db.prepare(`SELECT * FROM users WHERE id = ?`).get(id) as any;
}

export async function verifyPassword(email: string, password: string): Promise<SessionUser | null> {
  const user = getUserByEmail(email);
  if (!user) return null;
  const ok = bcrypt.compareSync(password, user.password_hash);
  if (!ok) return null;
  return toSessionUser(user);
}

function toSessionUser(user: any): SessionUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    photoUrl: user.photo_url,
    credential: user.credential,
    truckId: user.truck_id,
  };
}

export async function createSessionCookie(user: SessionUser) {
  const token = await new SignJWT({ uid: user.id, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET);
  const store = await cookies();
  store.set(COOKIE_NAME, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    const user = getUserById(payload.uid as string);
    if (!user) return null;
    return toSessionUser(user);
  } catch {
    return null;
  }
}
