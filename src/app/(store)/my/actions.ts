"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getMemberSession } from "@/lib/member-auth";

// ตรวจว่านัดหมายเป็นของสมาชิกที่ login อยู่จริง ป้องกันแก้นัดของคนอื่น
async function findOwnedAppointment(id: string) {
  const session = await getMemberSession();
  if (!session) return null;
  const appt = await prisma.appointment.findUnique({ where: { id } });
  if (!appt || appt.memberId !== session.memberId) return null;
  return appt;
}

export async function confirmMyAppointment(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const appt = await findOwnedAppointment(id);
  if (!appt || appt.status !== "SCHEDULED") return;

  await prisma.appointment.update({
    where: { id },
    data: { status: "CONFIRMED", note: "ลูกค้ายืนยันผ่านหน้าเว็บ" },
  });
  revalidatePath("/my");
  revalidatePath("/admin/appointments");
}

export async function rescheduleMyAppointment(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const scheduledAt = String(formData.get("scheduledAt") ?? "");
  const appt = await findOwnedAppointment(id);
  if (!appt || appt.status === "COMPLETED" || appt.status === "CANCELLED") return;

  const newDate = new Date(scheduledAt);
  if (isNaN(newDate.getTime()) || newDate < new Date()) return;

  await prisma.appointment.update({
    where: { id },
    data: {
      scheduledAt: newDate,
      status: "SCHEDULED",
      note: "ลูกค้าขอเลื่อนนัดผ่านหน้าเว็บ",
    },
  });
  revalidatePath("/my");
  revalidatePath("/admin/appointments");
}

// สำหรับบัญชี Google ที่ยังไม่มีเบอร์โทร
export async function updateMyPhone(formData: FormData) {
  const session = await getMemberSession();
  if (!session) return;
  const phone = String(formData.get("phone") ?? "").trim();
  if (!/^0\d{8,9}$/.test(phone)) return;

  const used = await prisma.member.findUnique({ where: { phone } });
  if (used && used.id !== session.memberId) return;

  await prisma.member.update({
    where: { id: session.memberId },
    data: { phone },
  });
  revalidatePath("/my");
}
