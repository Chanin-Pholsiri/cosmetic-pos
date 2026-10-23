"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function createUser(formData: FormData) {
  await requireAdmin();

  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const role = String(formData.get("role") ?? "STAFF") === "ADMIN" ? "ADMIN" : "STAFF";

  if (!username || !name || password.length < 8) return;

  const exists = await prisma.user.findUnique({ where: { username } });
  if (exists) return;

  await prisma.user.create({
    data: {
      username,
      name,
      role,
      passwordHash: await bcrypt.hash(password, 10),
    },
  });
  revalidatePath("/admin/users");
}

export async function toggleUserActive(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (id === admin.id) return; // ห้ามปิดบัญชีตัวเอง
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return;
  await prisma.$transaction([
    prisma.user.update({ where: { id }, data: { active: !user.active } }),
    // เตะออกจากระบบทันทีเมื่อถูกปิดใช้งาน
    ...(user.active
      ? [prisma.session.deleteMany({ where: { userId: id } })]
      : []),
  ]);
  revalidatePath("/admin/users");
}

export async function resetPassword(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!id || password.length < 8) return;
  await prisma.user.update({
    where: { id },
    data: { passwordHash: await bcrypt.hash(password, 10) },
  });
  revalidatePath("/admin/users");
}
