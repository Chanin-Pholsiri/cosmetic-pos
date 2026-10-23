"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createMemberSession, destroyMemberSession } from "@/lib/member-auth";

export type MemberAuthState = { error?: string };

function safeNext(raw: string) {
  return raw.startsWith("/") && !raw.startsWith("//") ? raw : "/my";
}

export async function registerMember(
  _prev: MemberAuthState,
  formData: FormData
): Promise<MemberAuthState> {
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim() || null;
  const password = String(formData.get("password") ?? "");
  const next = safeNext(String(formData.get("next") ?? ""));

  if (!name || name.length < 2) return { error: "กรุณากรอกชื่อ-นามสกุล" };
  if (!/^0\d{8,9}$/.test(phone)) {
    return { error: "เบอร์โทรไม่ถูกต้อง (เช่น 0812345678)" };
  }
  if (password.length < 8) {
    return { error: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const existing = await prisma.member.findUnique({ where: { phone } });

  let memberId: string;
  if (existing) {
    if (existing.passwordHash || existing.googleId) {
      return {
        error: "เบอร์นี้มีบัญชีอยู่แล้ว กรุณาเข้าสู่ระบบ หรือใช้ปุ่ม Google",
      };
    }
    // เคยเป็นลูกค้าหน้าร้านมาก่อน (ไม่มีบัญชีออนไลน์) — ผูกบัญชีให้เลย
    await prisma.member.update({
      where: { id: existing.id },
      data: { passwordHash, email: email ?? existing.email },
    });
    memberId = existing.id;
  } else {
    if (email) {
      const emailUsed = await prisma.member.findUnique({ where: { email } });
      if (emailUsed) return { error: "อีเมลนี้ถูกใช้แล้ว" };
    }
    const count = await prisma.member.count();
    const member = await prisma.member.create({
      data: {
        code: `M-${String(count + 1).padStart(4, "0")}`,
        name,
        phone,
        email,
        passwordHash,
        notes: "สมัครสมาชิกผ่านหน้าเว็บ",
      },
    });
    memberId = member.id;
  }

  await createMemberSession(memberId);
  redirect(next);
}

export async function loginMember(
  _prev: MemberAuthState,
  formData: FormData
): Promise<MemberAuthState> {
  const phone = String(formData.get("phone") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(String(formData.get("next") ?? ""));

  if (!phone || !password) return { error: "กรุณากรอกเบอร์โทรและรหัสผ่าน" };

  const member = await prisma.member.findUnique({ where: { phone } });
  if (!member) return { error: "ไม่พบบัญชีของเบอร์นี้ กรุณาสมัครสมาชิก" };
  if (!member.passwordHash) {
    return {
      error: member.googleId
        ? "บัญชีนี้ใช้ Google — กรุณากดปุ่ม \"เข้าสู่ระบบด้วย Google\""
        : "เบอร์นี้ยังไม่มีบัญชีออนไลน์ กรุณาสมัครสมาชิกก่อน",
    };
  }
  if (!(await bcrypt.compare(password, member.passwordHash))) {
    return { error: "รหัสผ่านไม่ถูกต้อง" };
  }

  await createMemberSession(member.id);
  redirect(next);
}

export async function logoutMember() {
  await destroyMemberSession();
  redirect("/");
}
