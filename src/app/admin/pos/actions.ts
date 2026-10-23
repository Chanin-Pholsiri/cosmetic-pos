"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { buildInstallments } from "@/lib/installments";

const saleSchema = z.object({
  items: z
    .array(
      z.object({
        type: z.enum(["PRODUCT", "COURSE"]),
        id: z.string().min(1),
        quantity: z.number().int().min(1).max(999),
      })
    )
    .min(1, "กรุณาเลือกสินค้าอย่างน้อย 1 รายการ"),
  memberId: z.string().nullable(),
  discount: z.number().min(0),
  paymentMethod: z.enum(["CASH", "TRANSFER", "PROMPTPAY", "CREDIT_CARD"]),
  paymentType: z.enum(["FULL", "INSTALLMENT"]).default("FULL"),
  installmentCount: z.number().int().min(2).max(12).optional(),
});

export type CreateSaleResult =
  | { ok: true; saleId: string }
  | { ok: false; error: string; needLogin?: boolean };

export async function createSale(input: unknown): Promise<CreateSaleResult> {
  const session = await getSession();
  if (!session) {
    return {
      ok: false,
      error: "กรุณาเข้าสู่ระบบก่อนทำรายการขาย",
      needLogin: true,
    };
  }
  const user = session.user;

  const parsed = saleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "ข้อมูลการขายไม่ถูกต้อง กรุณาลองใหม่" };
  }
  const { items, memberId, discount, paymentMethod, paymentType, installmentCount } =
    parsed.data;

  const productItems = items.filter((i) => i.type === "PRODUCT");
  const courseItems = items.filter((i) => i.type === "COURSE");

  if (courseItems.length > 0 && !memberId) {
    return {
      ok: false,
      error: "การขายคอร์สต้องระบุลูกค้าสมาชิก เพื่อบันทึกสิทธิ์การใช้คอร์ส",
    };
  }

  if (paymentType === "INSTALLMENT" && !memberId) {
    return { ok: false, error: "การผ่อนชำระต้องระบุลูกค้าสมาชิก" };
  }
  if (paymentType === "INSTALLMENT" && !installmentCount) {
    return { ok: false, error: "กรุณาระบุจำนวนงวดผ่อนชำระ" };
  }

  try {
    const sale = await prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({
        where: { id: { in: productItems.map((i) => i.id) }, active: true },
      });
      const courses = await tx.course.findMany({
        where: { id: { in: courseItems.map((i) => i.id) }, active: true },
      });

      let subtotal = 0;
      const saleItems: {
        itemType: "PRODUCT" | "COURSE";
        productId?: string;
        courseId?: string;
        name: string;
        unitPrice: number;
        quantity: number;
        total: number;
      }[] = [];

      for (const item of productItems) {
        const product = products.find((p) => p.id === item.id);
        if (!product) throw new Error("ไม่พบสินค้าบางรายการ กรุณารีเฟรชหน้า");
        if (product.stockQty < item.quantity) {
          throw new Error(
            `สต๊อก "${product.name}" ไม่พอ (คงเหลือ ${product.stockQty} ชิ้น)`
          );
        }
        const unitPrice = Number(product.price);
        const total = unitPrice * item.quantity;
        subtotal += total;
        saleItems.push({
          itemType: "PRODUCT",
          productId: product.id,
          name: product.name,
          unitPrice,
          quantity: item.quantity,
          total,
        });
      }

      for (const item of courseItems) {
        const course = courses.find((c) => c.id === item.id);
        if (!course) throw new Error("ไม่พบคอร์สบางรายการ กรุณารีเฟรชหน้า");
        const unitPrice = Number(course.price);
        const total = unitPrice * item.quantity;
        subtotal += total;
        saleItems.push({
          itemType: "COURSE",
          courseId: course.id,
          name: course.name,
          unitPrice,
          quantity: item.quantity,
          total,
        });
      }

      const total = subtotal - discount;
      if (total < 0) throw new Error("ส่วนลดมากกว่ายอดรวมไม่ได้");

      // เลขที่ใบเสร็จ: RC20260704-0001 (รันตามวัน)
      const now = new Date();
      const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const countToday = await tx.sale.count({
        where: { createdAt: { gte: dayStart } },
      });
      const ymd = now.toISOString().slice(0, 10).replaceAll("-", "");
      const receiptNo = `RC${ymd}-${String(countToday + 1).padStart(4, "0")}`;

      const sale = await tx.sale.create({
        data: {
          receiptNo,
          memberId,
          userId: user.id,
          subtotal,
          discount,
          total,
          paymentMethod,
          paymentType,
          items: { create: saleItems },
        },
      });

      // แผนผ่อนชำระ: งวดแรกชำระทันที ที่เหลือครบกำหนดรายเดือน
      if (paymentType === "INSTALLMENT" && installmentCount) {
        const schedule = buildInstallments(total, installmentCount, now);
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

      // ตัดสต๊อกและบันทึกการเคลื่อนไหว
      for (const item of productItems) {
        await tx.product.update({
          where: { id: item.id },
          data: { stockQty: { decrement: item.quantity } },
        });
        await tx.stockMovement.create({
          data: {
            productId: item.id,
            type: "SALE",
            quantity: -item.quantity,
            note: `ขายตามใบเสร็จ ${receiptNo}`,
            userId: user.id,
          },
        });
      }

      // สร้างสิทธิ์คอร์สให้สมาชิก (1 สิทธิ์ต่อ 1 หน่วยที่ซื้อ)
      if (memberId) {
        for (const item of courseItems) {
          const course = courses.find((c) => c.id === item.id)!;
          for (let i = 0; i < item.quantity; i++) {
            await tx.courseEnrollment.create({
              data: {
                memberId,
                courseId: course.id,
                saleId: sale.id,
                totalSessions: course.totalSessions,
                expiresAt: course.validityDays
                  ? new Date(Date.now() + course.validityDays * 86400000)
                  : null,
              },
            });
          }
        }

        // สะสมแต้ม: 1 แต้มต่อยอดซื้อ 100 บาท
        await tx.member.update({
          where: { id: memberId },
          data: { points: { increment: Math.floor(total / 100) } },
        });
      }

      return sale;
    });

    revalidatePath("/admin");
    revalidatePath("/admin/stock");
    revalidatePath("/admin/sales");
    revalidatePath("/admin/installments");
    return { ok: true, saleId: sale.id };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "เกิดข้อผิดพลาด กรุณาลองใหม่",
    };
  }
}
