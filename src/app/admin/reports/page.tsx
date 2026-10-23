import { prisma } from "@/lib/db";
import { paymentLabels, thb } from "@/lib/format";

type DailyRow = { day: Date; total: number; count: number };
type TopItemRow = { name: string; qty: number; revenue: number };
type TypeRow = { itemType: string; revenue: number };

export default async function ReportsPage() {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const last14 = new Date(startOfDay.getTime() - 13 * 86400000);
  const last7 = new Date(startOfDay.getTime() - 6 * 86400000);

  const [todayAgg, weekAgg, monthAgg, daily, topItems, byPayment, byType] =
    await Promise.all([
      prisma.sale.aggregate({
        where: { createdAt: { gte: startOfDay } },
        _sum: { total: true },
        _count: true,
      }),
      prisma.sale.aggregate({
        where: { createdAt: { gte: last7 } },
        _sum: { total: true },
      }),
      prisma.sale.aggregate({
        where: { createdAt: { gte: startOfMonth } },
        _sum: { total: true },
        _count: true,
      }),
      prisma.$queryRaw<DailyRow[]>`
        SELECT DATE("createdAt") AS day,
               COALESCE(SUM(total), 0)::float AS total,
               COUNT(*)::int AS count
        FROM "Sale"
        WHERE "createdAt" >= ${last14}
        GROUP BY 1
        ORDER BY 1
      `,
      prisma.$queryRaw<TopItemRow[]>`
        SELECT si.name,
               SUM(si.quantity)::int AS qty,
               SUM(si.total)::float AS revenue
        FROM "SaleItem" si
        JOIN "Sale" s ON s.id = si."saleId"
        WHERE s."createdAt" >= ${startOfMonth}
        GROUP BY si.name
        ORDER BY revenue DESC
        LIMIT 10
      `,
      prisma.sale.groupBy({
        by: ["paymentMethod"],
        where: { createdAt: { gte: startOfMonth } },
        _sum: { total: true },
        _count: true,
      }),
      prisma.$queryRaw<TypeRow[]>`
        SELECT si."itemType" AS "itemType",
               SUM(si.total)::float AS revenue
        FROM "SaleItem" si
        JOIN "Sale" s ON s.id = si."saleId"
        WHERE s."createdAt" >= ${startOfMonth}
        GROUP BY 1
      `,
    ]);

  // เติมวันที่ไม่มียอดขายให้ครบ 14 วัน
  const dailyMap = new Map(
    daily.map((d) => [new Date(d.day).toISOString().slice(0, 10), d])
  );
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(last14.getTime() + i * 86400000);
    const key = d.toISOString().slice(0, 10);
    const row = dailyMap.get(key);
    return { date: d, total: row?.total ?? 0, count: row?.count ?? 0 };
  });
  const maxDaily = Math.max(...days.map((d) => d.total), 1);

  const productRevenue = byType.find((t) => t.itemType === "PRODUCT")?.revenue ?? 0;
  const courseRevenue = byType.find((t) => t.itemType === "COURSE")?.revenue ?? 0;

  const stats = [
    {
      label: "ยอดขายวันนี้",
      value: thb(Number(todayAgg._sum.total ?? 0)),
      sub: `${todayAgg._count} บิล`,
    },
    { label: "ยอดขาย 7 วันล่าสุด", value: thb(Number(weekAgg._sum.total ?? 0)) },
    {
      label: "ยอดขายเดือนนี้",
      value: thb(Number(monthAgg._sum.total ?? 0)),
      sub: `${monthAgg._count} บิล`,
    },
    {
      label: "สัดส่วนเดือนนี้",
      value: `สินค้า ${thb(productRevenue)}`,
      sub: `คอร์ส ${thb(courseRevenue)}`,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">รายงานยอดขาย</h1>
        <p className="mt-1 text-sm text-brand-500">
          สรุปยอดขาย สินค้าขายดี และช่องทางการชำระเงิน
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card">
            <p className="text-sm text-brand-500">{s.label}</p>
            <p className="mt-2 text-xl font-semibold">{s.value}</p>
            {s.sub && <p className="mt-1 text-xs text-brand-400">{s.sub}</p>}
          </div>
        ))}
      </div>

      <div className="card">
        <h2 className="mb-4 font-semibold">ยอดขายรายวัน (14 วันล่าสุด)</h2>
        <div className="flex h-48 items-end gap-1.5">
          {days.map((d) => (
            <div
              key={d.date.toISOString()}
              className="group relative flex flex-1 flex-col items-center"
            >
              <div
                className="w-full rounded-t-md bg-brand-500 transition-colors group-hover:bg-brand-700"
                style={{
                  height: `${Math.max((d.total / maxDaily) * 160, d.total > 0 ? 6 : 2)}px`,
                }}
              />
              <span className="mt-1.5 text-[10px] text-brand-400">
                {d.date.toLocaleDateString("th-TH", {
                  day: "numeric",
                  month: "numeric",
                })}
              </span>
              <div className="pointer-events-none absolute bottom-full mb-1 hidden whitespace-nowrap rounded-lg bg-brand-900 px-2 py-1 text-xs text-white group-hover:block">
                {thb(d.total)} · {d.count} บิล
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-0">
          <div className="px-6 py-4">
            <h2 className="font-semibold">สินค้า/คอร์สขายดี (เดือนนี้)</h2>
          </div>
          <table className="table-base">
            <thead>
              <tr>
                <th>รายการ</th>
                <th className="text-right">จำนวน</th>
                <th className="text-right">ยอดขาย</th>
              </tr>
            </thead>
            <tbody>
              {topItems.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-brand-400">
                    ยังไม่มียอดขายเดือนนี้
                  </td>
                </tr>
              )}
              {topItems.map((item, i) => (
                <tr key={item.name}>
                  <td>
                    <span className="mr-2 text-brand-400">{i + 1}.</span>
                    {item.name}
                  </td>
                  <td className="text-right">{item.qty}</td>
                  <td className="text-right font-medium">{thb(item.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card p-0">
          <div className="px-6 py-4">
            <h2 className="font-semibold">ช่องทางการชำระเงิน (เดือนนี้)</h2>
          </div>
          <table className="table-base">
            <thead>
              <tr>
                <th>ช่องทาง</th>
                <th className="text-right">จำนวนบิล</th>
                <th className="text-right">ยอดรวม</th>
              </tr>
            </thead>
            <tbody>
              {byPayment.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-brand-400">
                    ยังไม่มียอดขายเดือนนี้
                  </td>
                </tr>
              )}
              {byPayment.map((p) => (
                <tr key={p.paymentMethod}>
                  <td>{paymentLabels[p.paymentMethod]}</td>
                  <td className="text-right">{p._count}</td>
                  <td className="text-right font-medium">
                    {thb(Number(p._sum.total ?? 0))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
