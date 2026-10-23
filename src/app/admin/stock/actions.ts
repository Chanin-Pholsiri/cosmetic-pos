"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function adjustStock(formData: FormData) {
  const user = await requireUser();

  const productId = String(formData.get("productId") ?? "");
  const type = String(formData.get("type") ?? "");
  const qty = Math.abs(Number(formData.get("quantity") ?? 0));
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!productId || qty <= 0) return;
  if (!["RECEIVE", "ADJUST", "RETURN"].includes(type)) return;

  const direction = String(formData.get("direction") ?? "in");
  // รับเข้า/รับคืน = บวกเสมอ, ปรับยอดเลือกทิศทางได้
  const signedQty =
    type === "ADJUST" && direction === "out" ? -qty : qty;

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return;
  if (product.stockQty + signedQty < 0) return;

  await prisma.$transaction([
    prisma.product.update({
      where: { id: productId },
      data: { stockQty: { increment: signedQty } },
    }),
    prisma.stockMovement.create({
      data: {
        productId,
        type: type as "RECEIVE" | "ADJUST" | "RETURN",
        quantity: signedQty,
        note,
        userId: user.id,
      },
    }),
  ]);

  revalidatePath("/admin/stock");
  revalidatePath("/admin/products");
  revalidatePath("/admin");
}
