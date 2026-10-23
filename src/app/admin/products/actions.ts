"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function saveProduct(formData: FormData) {
  const user = await requireUser();

  const id = String(formData.get("id") ?? "");
  const data = {
    sku: String(formData.get("sku") ?? "").trim(),
    name: String(formData.get("name") ?? "").trim(),
    categoryId: String(formData.get("categoryId") ?? "") || null,
    price: Number(formData.get("price") ?? 0),
    cost: Number(formData.get("cost") ?? 0),
    lowStockAlert: Number(formData.get("lowStockAlert") ?? 5),
  };
  if (!data.sku || !data.name || data.price < 0) return;

  if (id) {
    await prisma.product.update({ where: { id }, data });
  } else {
    const stockQty = Number(formData.get("stockQty") ?? 0);
    const product = await prisma.product.create({ data: { ...data, stockQty } });
    if (stockQty > 0) {
      await prisma.stockMovement.create({
        data: {
          productId: product.id,
          type: "RECEIVE",
          quantity: stockQty,
          note: "สต๊อกเริ่มต้น",
          userId: user.id,
        },
      });
    }
  }

  revalidatePath("/admin/products");
  redirect("/admin/products");
}

export async function toggleProductActive(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return;
  await prisma.product.update({
    where: { id },
    data: { active: !product.active },
  });
  revalidatePath("/admin/products");
}

export async function deleteProduct(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  const soldCount = await prisma.saleItem.count({ where: { productId: id } });
  if (soldCount > 0) {
    // มีประวัติการขายแล้ว ห้ามลบ — ปิดการขายแทนเพื่อรักษาข้อมูลใบเสร็จ
    await prisma.product.update({ where: { id }, data: { active: false } });
  } else {
    await prisma.product.delete({ where: { id } });
  }
  revalidatePath("/admin/products");
}

export async function addCategory(formData: FormData) {
  await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
  revalidatePath("/admin/products");
}
