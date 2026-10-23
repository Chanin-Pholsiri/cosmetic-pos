import Link from "next/link";
import { prisma } from "@/lib/db";
import { paymentLabels, thb, thDate } from "@/lib/format";
import { payInstallment } from "./actions";

export default async function InstallmentsPage() {
  const now = new Date();
  const plans = await prisma.installmentPlan.findMany({
    include: {
      sale: { include: { member: true, items: true } },
      installments: { orderBy: { seq: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  const activePlans = plans.filter((p) =>
    p.installments.some((i) => i.status === "PENDING")
  );
  const donePlans = plans.filter((p) =>
    p.installments.every((i) => i.status === "PAID")
  );
  const overdueCount = activePlans.reduce(
    (n, p) =>
      n +
      p.installments.filter((i) => i.status === "PENDING" && i.dueDate < now)
        .length,
    0
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">ผ่อนชำระ</h1>
        <p className="mt-1 text-sm text-brand-500">
          สัญญาผ่อนที่ยังไม่ครบ {activePlans.length} รายการ
          {overdueCount > 0 && (
            <span className="ml-2 text-red-500">
              · มีงวดเกินกำหนด {overdueCount} งวด
            </span>
          )}
        </p>
      </div>

      {activePlans.length === 0 && (
        <div className="card py-10 text-center text-brand-400">
          ไม่มีรายการผ่อนชำระค้างอยู่
        </div>
      )}

      {activePlans.map((plan) => {
        const paid = plan.installments
          .filter((i) => i.status === "PAID")
          .reduce((s, i) => s + Number(i.amount), 0);
        const balance = Number(plan.totalAmount) - paid;
        const nextDue = plan.installments.find((i) => i.status === "PENDING");

        return (
          <div key={plan.id} className="card">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-brand-100 pb-4">
              <div>
                <p className="font-medium">
                  {plan.sale.member ? (
                    <Link
                      href={`/admin/members/${plan.sale.member.id}`}
                      className="text-brand-700 hover:underline"
                    >
                      {plan.sale.member.name}
                    </Link>
                  ) : (
                    "ลูกค้าทั่วไป"
                  )}
                  <span className="ml-2 text-sm text-brand-400">
                    ใบเสร็จ{" "}
                    <Link
                      href={`/admin/sales/${plan.saleId}`}
                      className="text-brand-500 hover:underline"
                    >
                      {plan.sale.receiptNo}
                    </Link>
                  </span>
                </p>
                <p className="text-sm text-brand-600">
                  {plan.sale.items.map((i) => i.name).join(", ")}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-brand-500">
                  ยอดรวม {thb(Number(plan.totalAmount))} · ชำระแล้ว {thb(paid)}
                </p>
                <p className="text-lg font-semibold text-brand-900">
                  คงเหลือ {thb(balance)}
                </p>
                {nextDue && (
                  <p
                    className={`text-xs ${
                      nextDue.dueDate < now ? "text-red-500" : "text-brand-400"
                    }`}
                  >
                    งวดถัดไปครบกำหนด {thDate(nextDue.dueDate)}
                    {nextDue.dueDate < now && " (เกินกำหนดแล้ว)"}
                  </p>
                )}
              </div>
            </div>

            <table className="table-base mt-2">
              <thead>
                <tr>
                  <th>งวดที่</th>
                  <th>ครบกำหนด</th>
                  <th className="text-right">จำนวนเงิน</th>
                  <th>สถานะ</th>
                  <th className="text-right">รับชำระ</th>
                </tr>
              </thead>
              <tbody>
                {plan.installments.map((i) => {
                  const isOverdue = i.status === "PENDING" && i.dueDate < now;
                  return (
                    <tr key={i.id}>
                      <td>งวดที่ {i.seq} / {plan.count}</td>
                      <td className={isOverdue ? "text-red-500" : ""}>
                        {thDate(i.dueDate)}
                      </td>
                      <td className="text-right font-medium">
                        {thb(Number(i.amount))}
                      </td>
                      <td>
                        {i.status === "PAID" ? (
                          <span className="badge bg-emerald-50 text-emerald-700">
                            ชำระแล้ว {i.paidAt && thDate(i.paidAt)}
                            {i.paymentMethod &&
                              ` · ${paymentLabels[i.paymentMethod]}`}
                          </span>
                        ) : isOverdue ? (
                          <span className="badge bg-red-50 text-red-600">
                            เกินกำหนด
                          </span>
                        ) : (
                          <span className="badge bg-amber-50 text-amber-700">
                            รอชำระ
                          </span>
                        )}
                      </td>
                      <td>
                        {i.status === "PENDING" && (
                          <form
                            action={payInstallment}
                            className="flex items-center justify-end gap-2"
                          >
                            <input type="hidden" name="id" value={i.id} />
                            <select
                              name="paymentMethod"
                              className="input w-32 py-1.5 text-xs"
                            >
                              <option value="CASH">เงินสด</option>
                              <option value="PROMPTPAY">พร้อมเพย์</option>
                              <option value="TRANSFER">โอนเงิน</option>
                              <option value="CREDIT_CARD">บัตรเครดิต</option>
                            </select>
                            <button className="btn-primary py-1.5 text-xs">
                              รับชำระ
                            </button>
                          </form>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}

      {donePlans.length > 0 && (
        <div className="card p-0">
          <div className="px-6 py-4">
            <h2 className="font-semibold">ผ่อนครบแล้ว ({donePlans.length})</h2>
          </div>
          <table className="table-base">
            <thead>
              <tr>
                <th>ลูกค้า</th>
                <th>รายการ</th>
                <th className="text-right">ยอดรวม</th>
                <th className="text-right">จำนวนงวด</th>
              </tr>
            </thead>
            <tbody>
              {donePlans.map((p) => (
                <tr key={p.id}>
                  <td>{p.sale.member?.name ?? "ลูกค้าทั่วไป"}</td>
                  <td className="text-brand-600">
                    {p.sale.items.map((i) => i.name).join(", ")}
                  </td>
                  <td className="text-right">{thb(Number(p.totalAmount))}</td>
                  <td className="text-right">{p.count} งวด</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
