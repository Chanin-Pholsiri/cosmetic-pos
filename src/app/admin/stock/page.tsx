import { prisma } from "@/lib/db";
import { stockMoveLabels, thDateTime } from "@/lib/format";
import { adjustStock } from "./actions";

export default async function StockPage() {
  const [products, movements] = await Promise.all([
    prisma.product.findMany({
      where: { active: true },
      include: { category: true },
      orderBy: { stockQty: "asc" },
    }),
    prisma.stockMovement.findMany({
      include: { product: true, user: true },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">สต๊อกสินค้า</h1>
        <p className="mt-1 text-sm text-brand-500">
          ยอดคงเหลือ รับเข้า ปรับยอด และประวัติการเคลื่อนไหว
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <div className="card overflow-x-auto p-0">
            <div className="px-6 py-4">
              <h2 className="font-semibold">ยอดคงเหลือปัจจุบัน</h2>
            </div>
            <table className="table-base">
              <thead>
                <tr>
                  <th>สินค้า</th>
                  <th>หมวดหมู่</th>
                  <th className="text-right">คงเหลือ</th>
                  <th className="text-right">จุดแจ้งเตือน</th>
                  <th>สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-brand-400">{p.sku}</p>
                    </td>
                    <td className="text-brand-500">{p.category?.name ?? "—"}</td>
                    <td className="text-right font-semibold">{p.stockQty}</td>
                    <td className="text-right text-brand-500">{p.lowStockAlert}</td>
                    <td>
                      {p.stockQty === 0 ? (
                        <span className="badge bg-red-50 text-red-600">หมด</span>
                      ) : p.stockQty <= p.lowStockAlert ? (
                        <span className="badge bg-amber-50 text-amber-700">
                          ใกล้หมด
                        </span>
                      ) : (
                        <span className="badge bg-emerald-50 text-emerald-700">
                          ปกติ
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card p-0">
            <div className="px-6 py-4">
              <h2 className="font-semibold">การเคลื่อนไหวล่าสุด</h2>
            </div>
            <table className="table-base">
              <thead>
                <tr>
                  <th>วันที่</th>
                  <th>สินค้า</th>
                  <th>ประเภท</th>
                  <th className="text-right">จำนวน</th>
                  <th>โดย / หมายเหตุ</th>
                </tr>
              </thead>
              <tbody>
                {movements.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-brand-400">
                      ยังไม่มีการเคลื่อนไหว
                    </td>
                  </tr>
                )}
                {movements.map((m) => (
                  <tr key={m.id}>
                    <td className="whitespace-nowrap text-brand-500">
                      {thDateTime(m.createdAt)}
                    </td>
                    <td className="font-medium">{m.product.name}</td>
                    <td>
                      <span
                        className={`badge ${
                          m.quantity > 0
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-600"
                        }`}
                      >
                        {stockMoveLabels[m.type]}
                      </span>
                    </td>
                    <td
                      className={`text-right font-medium ${
                        m.quantity > 0 ? "text-emerald-600" : "text-red-500"
                      }`}
                    >
                      {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                    </td>
                    <td className="text-brand-500">
                      {m.user?.name ?? "—"}
                      {m.note && (
                        <p className="text-xs text-brand-400">{m.note}</p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card h-fit">
          <h2 className="mb-4 font-semibold">รับเข้า / ปรับยอดสต๊อก</h2>
          <form action={adjustStock} className="space-y-3">
            <div>
              <label className="label">สินค้า</label>
              <select name="productId" className="input" required>
                <option value="">— เลือกสินค้า —</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (เหลือ {p.stockQty})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">ประเภทรายการ</label>
              <select name="type" className="input" required>
                <option value="RECEIVE">รับเข้า (ซื้อของเข้าร้าน)</option>
                <option value="RETURN">รับคืนจากลูกค้า</option>
                <option value="ADJUST">ปรับยอด (นับสต๊อก/ของเสีย)</option>
              </select>
            </div>
            <div>
              <label className="label">ทิศทาง (เฉพาะปรับยอด)</label>
              <select name="direction" className="input">
                <option value="in">เพิ่มสต๊อก (+)</option>
                <option value="out">ลดสต๊อก (−)</option>
              </select>
            </div>
            <div>
              <label className="label">จำนวน</label>
              <input
                name="quantity"
                type="number"
                min="1"
                className="input"
                required
              />
            </div>
            <div>
              <label className="label">หมายเหตุ</label>
              <input
                name="note"
                className="input"
                placeholder="เช่น ล็อตใหม่จากซัพพลายเออร์ A"
              />
            </div>
            <button type="submit" className="btn-primary w-full">
              บันทึกรายการ
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
