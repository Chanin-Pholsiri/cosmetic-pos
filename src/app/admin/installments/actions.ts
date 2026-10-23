"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function payInstallment(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  const method = String(formData.get("paymentMethod") ?? "CASH");
  const allowed = ["CASH", "TRANSFER", "PROMPTPAY", "CREDIT_CARD"];

  const installment = await prisma.installment.findUnique({
    where: { id },
    include: { plan: { include: { sale: true } } },
  });
  if (!installment || installment.status === "PAID") return;

  await prisma.installment.update({
    where: { id },
    data: {
      status: "PAID",
      paidAt: new Date(),
      paymentMethod: (allowed.includes(method) ? method : "CASH") as
        | "CASH"
        | "TRANSFER"
        | "PROMPTPAY"
        | "CREDIT_CARD",
    },
  });

  // สะสมแต้มตามยอดที่ชำระจริงในงวดนี้
  const memberId = installment.plan.sale.memberId;
  if (memberId) {
    await prisma.member.update({
      where: { id: memberId },
      data: {
        points: { increment: Math.floor(Number(installment.amount) / 100) },
      },
    });
  }

  revalidatePath("/admin/installments");
  revalidatePath("/admin");
}
