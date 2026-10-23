import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./db";

const COOKIE_NAME = "member_session";
const SESSION_DAYS = 30;

export async function createMemberSession(memberId: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.memberSession.create({ data: { token, memberId, expiresAt } });
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

export async function getMemberSession() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const session = await prisma.memberSession.findUnique({
    where: { token },
    include: { member: true },
  });
  if (!session || session.expiresAt < new Date()) return null;
  return session;
}

export async function requireMember(next = "/my") {
  const session = await getMemberSession();
  if (!session) redirect(`/account/login?next=${encodeURIComponent(next)}`);
  return session.member;
}

export async function destroyMemberSession() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (token) {
    await prisma.memberSession.deleteMany({ where: { token } });
  }
  store.delete(COOKIE_NAME);
}
