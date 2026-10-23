import Link from "next/link";
import { prisma } from "@/lib/db";
import { thb, thDateTime, paymentLabels } from "@/lib/format";

export default async function DashboardPage() {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    todayAgg,
    monthAgg,
    memberCount,
    lowStock,
    recentSales,
    upcomingAppointments,
    overdueInstallments,
  ] = await Promise.all([
      prisma.sale.aggregate({
        where: { createdAt: { gte: startOfDay } },
        _sum: { total: true },
        _count: true,
      }),
      prisma.sale.aggregate({
        where: { createdAt: { gte: startOfMonth } },
        _sum: { total: true },
      }),
      prisma.member.count(),
      prisma.product.findMany({
        where: {
          active: true,
          stockQty: { lte: prisma.product.fields.lowStockAlert },
        },
        orderBy: { stockQty: "asc" },
        take: 6,
      }),
      prisma.sale.findMany({
        orderBy: { createdAt: "desc" },
        take: 6,
        include: { member: true, user: true },
      }),
      prisma.appointment.findMany({
        where: {
          status: { in: ["SCHEDULED", "CONFIRMED"] },
          scheduledAt: { lte: new Date(Date.now() + 48 * 3600000) },
        },
        include: { member: true, enrollment: { include: { course: true } } },
        orderBy: { scheduledAt: "asc" },
        take: 6,
      }),
      prisma.installment.count({
        where: { status: "PENDING", dueDate: { lt: new Date() } },
      }),
    ]);

  const stats = [
    { label: "ยอดขายวันนี้", value: thb(Number(todayAgg._sum.total ?? 0)) },
    { label: "จำนวนบิลวันนี้", value: `${todayAgg._count} บิล` },
    { label: "ยอดขายเดือนนี้", value: thb(Number(monthAgg._sum.total ?? 0)) },
    { label: "ลูกค้าสมาชิก", value: `${memberCount} คน` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">แดชบอร์ด</h1>
          <p className="mt-1 text-sm text-brand-500">
            ภาพรวมร้านค้าประจำวันที่{" "}
            {now.toLocaleDateString("th-TH", { dateStyle: "long" })}
          </p>
        </div>
        <Link href="/admin/pos" className="btn-primary">
          + เปิดการขาย
        </Link>
      </div>

      {(upcomingAppointments.length > 0 || overdueInstallments > 0) && (
        <div className="card border-amber-200 bg-amber-50/60">
          <p className="text-sm font-medium text-amber-800">🔔 สิ่งที่ต้องติดตาม</p>
          <ul className="mt-2 space-y-1 text-sm text-amber-700">
            {overdueInstallments > 0 && (
              <li>
                มีงวดผ่อนชำระเกินกำหนด {overdueInstallments} งวด —{" "}
                <Link href="/admin/installments" className="underline">
                  ไปที่หน้าผ่อนชำระ
                </Link>
              </li>
            )}
            {upcomingAppointments.map((a) => (
              <li key={a.id}>
                นัด {a.member.name} ({a.enrollment.course.name}){" "}
                {thDateTime(a.scheduledAt)}
                {a.status === "SCHEDULED" && " · ยังไม่ยืนยัน โทรติดตามลูกค้า"}{" "}
                —{" "}
                <Link href="/admin/appointments" className="underline">
                  จัดการนัด
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card">
            <p className="text-sm text-brand-500">{s.label}</p>
            <p className="mt-2 text-2xl font-semibold text-brand-900">
              {s.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-0">
          <div className="flex items-center justify-between px-6 py-4">
            <h2 className="font-semibold">การขายล่าสุด</h2>
            <Link href="/admin/sales" className="text-sm text-brand-500 hover:text-brand-700">
              ดูทั้งหมด →
            </Link>
          </div>
          <table className="table-base">
            <thead>
              <tr>
                <th>เลขที่ใบเสร็จ</th>
                <th>ลูกค้า</th>
                <th>ชำระโดย</th>
                <th className="text-right">ยอดรวม</th>
              </tr>
            </thead>
            <tbody>
              {recentSales.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-brand-400">
                    ยังไม่มีรายการขาย
                  </td>
                </tr>
              )}
              {recentSales.map((s) => (
                <tr key={s.id}>
                  <td>
                    <Link
                      href={`/admin/sales/${s.id}`}
                      className="font-medium text-brand-600 hover:underline"
                    >
                      {s.receiptNo}
                    </Link>
                    <p className="text-xs text-brand-400">
                      {thDateTime(s.createdAt)}
                    </p>
                  </td>
                  <td>{s.member?.name ?? "ลูกค้าทั่วไป"}</td>
                  <td>{paymentLabels[s.paymentMethod]}</td>
                  <td className="text-right font-medium">{thb(Number(s.total))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card p-0">
          <div className="flex items-center justify-between px-6 py-4">
            <h2 className="font-semibold">สินค้าใกล้หมดสต๊อก</h2>
            <Link href="/admin/stock" className="text-sm text-brand-500 hover:text-brand-700">
              จัดการสต๊อก →
            </Link>
          </div>
          <table className="table-base">
            <thead>
              <tr>
                <th>สินค้า</th>
                <th className="text-right">คงเหลือ</th>
                <th className="text-right">จุดสั่งซื้อ</th>
              </tr>
            </thead>
            <tbody>
              {lowStock.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-brand-400">
                    สต๊อกสินค้าอยู่ในระดับปกติ
                  </td>
                </tr>
              )}
              {lowStock.map((p) => (
                <tr key={p.id}>
                  <td>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-brand-400">{p.sku}</p>
                  </td>
                  <td className="text-right">
                    <span
                      className={`badge ${
                        p.stockQty === 0
                          ? "bg-red-50 text-red-600"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {p.stockQty} ชิ้น
                    </span>
                  </td>
                  <td className="text-right text-brand-500">{p.lowStockAlert}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
