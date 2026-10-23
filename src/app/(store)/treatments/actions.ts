"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getMemberSession } from "@/lib/member-auth";
import { buildInstallments } from "@/lib/installments";

const purchaseSchema = z.object({
  courseId: z.string().min(1),
  scheduledAt: z.string().min(1, "กรุณาเลือกวันเวลาเข้ารับบริการ"),
  paymentType: z.enum(["FULL", "INSTALLMENT"]),
  installmentCount: z.number().int().min(2).max(12).optional(),
  paymentMethod: z.enum(["PROMPTPAY", "TRANSFER", "CREDIT_CARD"]),
  // สำหรับบัญชี Google ที่ยังไม่มีเบอร์โทรในระบบ
  phone: z.string().optional(),
});

export type PurchaseResult =
  | { ok: true }
  | { ok: false; error: string; needLogin?: boolean };

export async function purchaseCourse(input: unknown): Promise<PurchaseResult> {
  const session = await getMemberSession();
  if (!session) {
    return { ok: false, error: "กรุณาเข้าสู่ระบบก่อนซื้อคอร์ส", needLogin: true };
  }
  const member = session.member;

  const parsed = purchaseSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง",
    };
  }
  const { courseId, scheduledAt, paymentType, installmentCount, paymentMethod, phone } =
    parsed.data;

  const bookingDate = new Date(scheduledAt);
  if (isNaN(bookingDate.getTime()) || bookingDate < new Date()) {
    return { ok: false, error: "กรุณาเลือกวันเวลานัดล่วงหน้า" };
  }
  if (paymentType === "INSTALLMENT" && !installmentCount) {
    return { ok: false, error: "กรุณาเลือกจำนวนงวดผ่อนชำระ" };
  }

  // ต้องมีเบอร์โทรก่อนจอง (บัญชี Google อาจยังไม่มี)
  if (!member.phone) {
    if (!phone || !/^0\d{8,9}$/.test(phone)) {
      return { ok: false, error: "กรุณากรอกเบอร์โทรศัพท์สำหรับติดต่อยืนยันนัด" };
    }
    const used = await prisma.member.findUnique({ where: { phone } });
    if (used && used.id !== member.id) {
      return { ok: false, error: "เบอร์นี้ถูกใช้กับบัญชีอื่นแล้ว" };
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      const course = await tx.course.findUnique({ where: { id: courseId } });
      if (!course || !course.active) {
        throw new Error("ไม่พบคอร์สนี้ หรือคอร์สปิดการขายแล้ว");
      }
      const total = Number(course.price);
      const now = new Date();

      if (!member.phone && phone) {
        await tx.member.update({
          where: { id: member.id },
          data: { phone },
        });
      }

      const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const countToday = await tx.sale.count({
        where: { createdAt: { gte: dayStart } },
      });
      const ymd = now.toISOString().slice(0, 10).replaceAll("-", "");
      const receiptNo = `RC${ymd}-${String(countToday + 1).padStart(4, "0")}`;

      const sale = await tx.sale.create({
        data: {
          receiptNo,
          memberId: member.id,
          userId: null,
          channel: "ONLINE",
          subtotal: total,
          discount: 0,
          total,
          paymentMethod,
          paymentType,
          items: {
            create: [
              {
                itemType: "COURSE",
                courseId: course.id,
                name: course.name,
                unitPrice: total,
                quantity: 1,
                total,
              },
            ],
          },
        },
      });

      const enrollment = await tx.courseEnrollment.create({
        data: {
          memberId: member.id,
          courseId: course.id,
          saleId: sale.id,
          totalSessions: course.totalSessions,
          expiresAt: course.validityDays
            ? new Date(Date.now() + course.validityDays * 86400000)
            : null,
        },
      });

      // นัดหมายเข้ารับบริการครั้งแรกตามที่ลูกค้าเลือก
      await tx.appointment.create({
        data: {
          enrollmentId: enrollment.id,
          memberId: member.id,
          scheduledAt: bookingDate,
          note: "ลูกค้าจองผ่านหน้าเว็บ",
        },
      });

      // ผ่อนชำระ: งวดแรกชำระทันที ที่เหลือรายเดือน
      let earnedFrom = total;
      if (paymentType === "INSTALLMENT" && installmentCount) {
        const schedule = buildInstallments(total, installmentCount, now);
        earnedFrom = schedule[0].amount;
        await tx.installmentPlan.create({
          data: {
            saleId: sale.id,
            totalAmount: total,
            count: installmentCount,
            installments: {
              create: schedule.map((s) => ({
                ...s,
                status: s.seq === 1 ? "PAID" : "PENDING",
                paidAt: s.seq === 1 ? now : null,
                paymentMethod: s.seq === 1 ? paymentMethod : null,
              })),
            },
          },
        });
      }

      // สะสมแต้มตามยอดที่ชำระจริงวันนี้
      await tx.member.update({
        where: { id: member.id },
        data: { points: { increment: Math.floor(earnedFrom / 100) } },
      });
    });

    revalidatePath("/my");
    revalidatePath("/admin");
    revalidatePath("/admin/appointments");
    revalidatePath("/admin/installments");
    revalidatePath("/admin/sales");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "เกิดข้อผิดพลาด กรุณาลองใหม่",
    };
  }
}
