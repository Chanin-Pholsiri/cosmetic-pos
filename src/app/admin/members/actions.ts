"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function saveMember(formData: FormData) {
  await requireUser();

  const id = String(formData.get("id") ?? "");
  const birthDateRaw = String(formData.get("birthDate") ?? "");
  const data = {
    name: String(formData.get("name") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim() || null,
    birthDate: birthDateRaw ? new Date(birthDateRaw) : null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  };
  if (!data.name || !data.phone) return;

  if (id) {
    await prisma.member.update({ where: { id }, data });
  } else {
    const count = await prisma.member.count();
    const code = `M-${String(count + 1).padStart(4, "0")}`;
    await prisma.member.create({ data: { ...data, code } });
  }

  revalidatePath("/admin/members");
  redirect("/admin/members");
}

export async function useCourseSession(formData: FormData) {
  const user = await requireUser();
  const enrollmentId = String(formData.get("enrollmentId") ?? "");
  const note = String(formData.get("note") ?? "").trim() || null;

  const enrollment = await prisma.courseEnrollment.findUnique({
    where: { id: enrollmentId },
  });
  if (!enrollment || enrollment.status !== "ACTIVE") return;

  if (enrollment.expiresAt && enrollment.expiresAt < new Date()) {
    await prisma.courseEnrollment.update({
      where: { id: enrollmentId },
      data: { status: "EXPIRED" },
    });
    revalidatePath(`/admin/members/${enrollment.memberId}`);
    return;
  }

  const usedSessions = enrollment.usedSessions + 1;
  await prisma.$transaction([
    prisma.sessionUsage.create({
      data: { enrollmentId, userId: user.id, note },
    }),
    prisma.courseEnrollment.update({
      where: { id: enrollmentId },
      data: {
        usedSessions,
        status:
          usedSessions >= enrollment.totalSessions ? "COMPLETED" : "ACTIVE",
      },
    }),
  ]);

  revalidatePath(`/admin/members/${enrollment.memberId}`);
}
