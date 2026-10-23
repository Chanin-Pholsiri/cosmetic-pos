import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { paymentLabels, thb, thDate, thDateTime } from "@/lib/format";
import { PrintButton } from "./print-button";

export default async function ReceiptPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ new?: string }>;
}) {
  const { id } = await params;
  const { new: isNew } = await searchParams;

  const sale = await prisma.sale.findUnique({
    where: { id },
    include: {
      items: true,
      member: true,
      user: true,
      installmentPlan: {
        include: { installments: { orderBy: { seq: "asc" } } },
      },
    },
  });
  if (!sale) notFound();

  return (
    <div className="mx-auto max-w-lg space-y-4">
      {isNew && (
        <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 print:hidden">
          ✓ บันทึกการขายเรียบร้อยแล้ว
        </div>
      )}

      <div className="flex items-center justify-between print:hidden">
        <Link href="/admin/sales" className="text-sm text-brand-400 hover:text-brand-600">
          ← ประวัติการขาย
        </Link>
        <div className="flex gap-2">
          <Link href="/admin/pos" className="btn-secondary">
            เปิดบิลใหม่
          </Link>
          <PrintButton />
        </div>
      </div>

      {/* ใบเสร็จ */}
      <div className="card print:border-0 print:shadow-none">
        <div className="border-b border-dashed border-brand-200 pb-4 text-center">
          <p className="text-lg font-semibold">Beauty Shop & Treatment</p>
          <p className="mt-1 text-xs text-brand-500">
            ร้านเครื่องสำอางและคอร์สทรีตเมนต์
          </p>
          <p className="mt-3 text-sm font-medium">ใบเสร็จรับเงิน</p>
          <p className="text-xs text-brand-500">{sale.receiptNo}</p>
        </div>

        <div className="space-y-1 border-b border-dashed border-brand-200 py-3 text-xs text-brand-600">
          <div className="flex justify-between">
            <span>วันที่</span>
            <span>{thDateTime(sale.createdAt)}</span>
          </div>
          <div className="flex justify-between">
            <span>พนักงาน</span>
            <span>
              {sale.user?.name ??
                (sale.channel === "ONLINE" ? "สั่งซื้อออนไลน์" : "—")}
            </span>
          </div>
          <div className="flex justify-between">
            <span>ลูกค้า</span>
            <span>
              {sale.member
                ? `${sale.member.name} (${sale.member.code})`
                : "ลูกค้าทั่วไป"}
            </span>
          </div>
        </div>

        <table className="w-full border-b border-dashed border-brand-200 text-sm">
          <thead>
            <tr className="text-xs text-brand-400">
              <th className="py-2 text-left font-normal">รายการ</th>
              <th className="py-2 text-center font-normal">จำนวน</th>
              <th className="py-2 text-right font-normal">ราคา</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((item) => (
              <tr key={item.id}>
                <td className="py-1.5">
                  {item.name}
                  {item.itemType === "COURSE" && (
                    <span className="ml-1 text-xs text-brand-400">(คอร์ส)</span>
                  )}
                </td>
                <td className="py-1.5 text-center">{item.quantity}</td>
                <td className="py-1.5 text-right">{thb(Number(item.total))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="space-y-1 py-3 text-sm">
          <div className="flex justify-between text-brand-500">
            <span>รวม</span>
            <span>{thb(Number(sale.subtotal))}</span>
          </div>
          {Number(sale.discount) > 0 && (
            <div className="flex justify-between text-brand-500">
              <span>ส่วนลด</span>
              <span>-{thb(Number(sale.discount))}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-brand-200 pt-2 text-base font-semibold">
            <span>ยอดสุทธิ</span>
            <span>{thb(Number(sale.total))}</span>
          </div>
          <div className="flex justify-between pt-1 text-xs text-brand-500">
            <span>ชำระโดย</span>
            <span>
              {paymentLabels[sale.paymentMethod]}
              {sale.paymentType === "INSTALLMENT" &&
                ` (ผ่อนชำระ ${sale.installmentPlan?.count ?? ""} งวด)`}
            </span>
          </div>
        </div>

        {sale.installmentPlan && (
          <div className="border-t border-dashed border-brand-200 py-3">
            <p className="mb-2 text-xs font-medium text-brand-600">
              ตารางผ่อนชำระ
            </p>
            <table className="w-full text-xs">
              <tbody>
                {sale.installmentPlan.installments.map((i) => (
                  <tr key={i.id}>
                    <td className="py-1">งวดที่ {i.seq}</td>
                    <td className="py-1 text-brand-500">
                      ครบกำหนด {thDate(i.dueDate)}
                    </td>
                    <td className="py-1 text-right">{thb(Number(i.amount))}</td>
                    <td className="py-1 text-right">
                      {i.status === "PAID" ? (
                        <span className="text-emerald-600">ชำระแล้ว</span>
                      ) : (
                        <span className="text-amber-600">รอชำระ</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-right text-xs font-medium">
              ยอดคงเหลือ{" "}
              {thb(
                sale.installmentPlan.installments
                  .filter((i) => i.status === "PENDING")
                  .reduce((s, i) => s + Number(i.amount), 0)
              )}
            </p>
          </div>
        )}

        <p className="border-t border-dashed border-brand-200 pt-4 text-center text-xs text-brand-400">
          ขอบคุณที่ใช้บริการค่ะ ♡
        </p>
      </div>
    </div>
  );
}
