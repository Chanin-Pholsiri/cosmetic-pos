"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function saveCourse(formData: FormData) {
  await requireUser();

  const id = String(formData.get("id") ?? "");
  const validityDays = Number(formData.get("validityDays") ?? 0);
  const data = {
    code: String(formData.get("code") ?? "").trim(),
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || null,
    price: Number(formData.get("price") ?? 0),
    totalSessions: Math.max(Number(formData.get("totalSessions") ?? 1), 1),
    validityDays: validityDays > 0 ? validityDays : null,
  };
  if (!data.code || !data.name || data.price < 0) return;

  if (id) {
    await prisma.course.update({ where: { id }, data });
  } else {
    await prisma.course.create({ data });
  }

  revalidatePath("/admin/courses");
  redirect("/admin/courses");
}

export async function toggleCourseActive(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  const course = await prisma.course.findUnique({ where: { id } });
  if (!course) return;
  await prisma.course.update({
    where: { id },
    data: { active: !course.active },
  });
  revalidatePath("/admin/courses");
}

export async function deleteCourse(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  const used = await prisma.courseEnrollment.count({ where: { courseId: id } });
  if (used > 0) {
    // มีลูกค้าถือสิทธิ์คอร์สนี้อยู่ ห้ามลบ — ปิดการขายแทน
    await prisma.course.update({ where: { id }, data: { active: false } });
  } else {
    await prisma.course.delete({ where: { id } });
  }
  revalidatePath("/admin/courses");
}
