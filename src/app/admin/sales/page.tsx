import Link from "next/link";
import { prisma } from "@/lib/db";
import { paymentLabels, thb, thDateTime } from "@/lib/format";

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; date?: string }>;
}) {
  const { q, date } = await searchParams;

  const dateFilter = date
    ? {
        gte: new Date(`${date}T00:00:00`),
        lt: new Date(new Date(`${date}T00:00:00`).getTime() + 86400000),
      }
    : undefined;

  const sales = await prisma.sale.findMany({
    where: {
      ...(q ? { receiptNo: { contains: q, mode: "insensitive" as const } } : {}),
      ...(dateFilter ? { createdAt: dateFilter } : {}),
    },
    include: { member: true, user: true, items: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const totalShown = sales.reduce((s, x) => s + Number(x.total), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">ประวัติการขาย</h1>
        <p className="mt-1 text-sm text-brand-500">
          แสดง {sales.length} บิลล่าสุด · ยอดรวม {thb(totalShown)}
        </p>
      </div>

      <div className="card p-0">
        <form className="flex flex-wrap gap-3 border-b border-brand-100 px-6 py-4">
          <input
            name="q"
            defaultValue={q}
            className="input max-w-56"
            placeholder="ค้นหาเลขที่ใบเสร็จ"
          />
          <input name="date" type="date" defaultValue={date} className="input max-w-44" />
          <button type="submit" className="btn-secondary">
            ค้นหา
          </button>
          {(q || date) && (
            <Link href="/admin/sales" className="btn-secondary">
              ล้างตัวกรอง
            </Link>
          )}
        </form>
        <table className="table-base">
          <thead>
            <tr>
              <th>เลขที่ใบเสร็จ</th>
              <th>วันที่-เวลา</th>
              <th>ลูกค้า</th>
              <th>พนักงาน</th>
              <th className="text-right">รายการ</th>
              <th>ชำระโดย</th>
              <th className="text-right">ยอดสุทธิ</th>
            </tr>
          </thead>
          <tbody>
            {sales.length === 0 && (
              <tr>
                <td colSpan={7} className="py-10 text-center text-brand-400">
                  ไม่พบรายการขาย
                </td>
              </tr>
            )}
            {sales.map((s) => (
              <tr key={s.id}>
                <td>
                  <Link
                    href={`/admin/sales/${s.id}`}
                    className="font-medium text-brand-600 hover:underline"
                  >
                    {s.receiptNo}
                  </Link>
                </td>
                <td className="whitespace-nowrap text-brand-500">
                  {thDateTime(s.createdAt)}
                </td>
                <td>{s.member?.name ?? "ลูกค้าทั่วไป"}</td>
                <td className="text-brand-500">
                  {s.user?.name ?? (s.channel === "ONLINE" ? "สั่งซื้อออนไลน์" : "—")}
                </td>
                <td className="text-right">{s.items.length}</td>
                <td>{paymentLabels[s.paymentMethod]}</td>
                <td className="text-right font-medium">{thb(Number(s.total))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
