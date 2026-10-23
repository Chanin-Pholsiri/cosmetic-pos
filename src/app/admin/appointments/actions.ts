"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

function revalidateAppointmentPaths(memberId?: string) {
  revalidatePath("/admin/appointments");
  revalidatePath("/admin");
  if (memberId) revalidatePath(`/admin/members/${memberId}`);
}

// สร้างนัดหมายใหม่ให้สิทธิ์คอร์สที่ยังใช้ได้
export async function createAppointment(formData: FormData) {
  await requireUser();
  const enrollmentId = String(formData.get("enrollmentId") ?? "");
  const scheduledAt = String(formData.get("scheduledAt") ?? "");
  const note = String(formData.get("note") ?? "").trim() || null;
  if (!enrollmentId || !scheduledAt) return;

  const enrollment = await prisma.courseEnrollment.findUnique({
    where: { id: enrollmentId },
  });
  if (!enrollment || enrollment.status !== "ACTIVE") return;

  await prisma.appointment.create({
    data: {
      enrollmentId,
      memberId: enrollment.memberId,
      scheduledAt: new Date(scheduledAt),
      note,
    },
  });
  revalidateAppointmentPaths(enrollment.memberId);
}

export async function confirmAppointment(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  const appt = await prisma.appointment.update({
    where: { id },
    data: { status: "CONFIRMED" },
  });
  revalidateAppointmentPaths(appt.memberId);
}

export async function rescheduleAppointment(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  const scheduledAt = String(formData.get("scheduledAt") ?? "");
  if (!id || !scheduledAt) return;
  const appt = await prisma.appointment.update({
    where: { id },
    data: {
      scheduledAt: new Date(scheduledAt),
      status: "SCHEDULED",
      note: "เลื่อนนัดโดยพนักงาน",
    },
  });
  revalidateAppointmentPaths(appt.memberId);
}

export async function cancelAppointment(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  const appt = await prisma.appointment.update({
    where: { id },
    data: { status: "CANCELLED" },
  });
  revalidateAppointmentPaths(appt.memberId);
}

// บันทึกเข้ารับบริการ: ตัดสิทธิ์คอร์ส 1 ครั้ง + กำหนดนัดครั้งถัดไป (ถ้าระบุ)
export async function completeAppointment(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const nextAt = String(formData.get("nextAt") ?? "");
  const note = String(formData.get("note") ?? "").trim() || null;

  const appt = await prisma.appointment.findUnique({
    where: { id },
    include: { enrollment: true },
  });
  if (!appt || appt.status === "COMPLETED" || appt.status === "CANCELLED") return;

  const enrollment = appt.enrollment;
  if (enrollment.status !== "ACTIVE") return;

  const usedSessions = enrollment.usedSessions + 1;
  const completed = usedSessions >= enrollment.totalSessions;

  await prisma.$transaction(async (tx) => {
    await tx.appointment.update({
      where: { id },
      data: { status: "COMPLETED" },
    });
    await tx.sessionUsage.create({
      data: { enrollmentId: enrollment.id, userId: user.id, note },
    });
    await tx.courseEnrollment.update({
      where: { id: enrollment.id },
      data: {
        usedSessions,
        status: completed ? "COMPLETED" : "ACTIVE",
      },
    });
    // นัดครั้งถัดไป (เฉพาะคอร์สที่ยังมีสิทธิ์เหลือ)
    if (nextAt && !completed) {
      await tx.appointment.create({
        data: {
          enrollmentId: enrollment.id,
          memberId: appt.memberId,
          scheduledAt: new Date(nextAt),
        },
      });
    }
  });

  revalidateAppointmentPaths(appt.memberId);
}
