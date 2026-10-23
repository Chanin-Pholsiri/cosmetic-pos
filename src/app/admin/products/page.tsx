import Link from "next/link";
import { prisma } from "@/lib/db";
import { thb } from "@/lib/format";
import {
  addCategory,
  deleteProduct,
  saveProduct,
  toggleProductActive,
} from "./actions";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; q?: string }>;
}) {
  const { edit, q } = await searchParams;

  const [products, categories, editing] = await Promise.all([
    prisma.product.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { sku: { contains: q, mode: "insensitive" } },
            ],
          }
        : undefined,
      include: { category: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    edit ? prisma.product.findUnique({ where: { id: edit } }) : null,
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">สินค้า</h1>
        <p className="mt-1 text-sm text-brand-500">
          จัดการสินค้า ราคา และหมวดหมู่ ({products.length} รายการ)
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="card p-0">
          <form className="border-b border-brand-100 px-6 py-4">
            <input
              name="q"
              defaultValue={q}
              className="input max-w-xs"
              placeholder="ค้นหาชื่อ / SKU แล้วกด Enter"
            />
          </form>
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>สินค้า</th>
                  <th>หมวดหมู่</th>
                  <th className="text-right">ราคาขาย</th>
                  <th className="text-right">คงเหลือ</th>
                  <th>สถานะ</th>
                  <th className="text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-brand-400">
                      ยังไม่มีสินค้า
                    </td>
                  </tr>
                )}
                {products.map((p) => (
                  <tr key={p.id} className={p.active ? "" : "opacity-50"}>
                    <td>
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-brand-400">{p.sku}</p>
                    </td>
                    <td className="text-brand-500">
                      {p.category?.name ?? "—"}
                    </td>
                    <td className="text-right font-medium">
                      {thb(Number(p.price))}
                    </td>
                    <td className="text-right">
                      <span
                        className={`badge ${
                          p.stockQty <= p.lowStockAlert
                            ? "bg-amber-50 text-amber-700"
                            : "bg-brand-50 text-brand-700"
                        }`}
                      >
                        {p.stockQty}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          p.active
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-brand-100 text-brand-500"
                        }`}
                      >
                        {p.active ? "ขายอยู่" : "ปิดการขาย"}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-2 text-xs">
                        <Link
                          href={`/admin/products?edit=${p.id}`}
                          className="text-brand-600 hover:underline"
                        >
                          แก้ไข
                        </Link>
                        <form action={toggleProductActive}>
                          <input type="hidden" name="id" value={p.id} />
                          <button className="text-brand-500 hover:underline">
                            {p.active ? "ปิดขาย" : "เปิดขาย"}
                          </button>
                        </form>
                        <form action={deleteProduct}>
                          <input type="hidden" name="id" value={p.id} />
                          <button className="text-red-500 hover:underline">
                            ลบ
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <h2 className="mb-4 font-semibold">
              {editing ? `แก้ไข: ${editing.name}` : "เพิ่มสินค้าใหม่"}
            </h2>
            <form action={saveProduct} className="space-y-3">
              {editing && <input type="hidden" name="id" value={editing.id} />}
              <div>
                <label className="label">รหัสสินค้า (SKU)</label>
                <input
                  name="sku"
                  className="input"
                  defaultValue={editing?.sku}
                  placeholder="SK-001"
                  required
                />
              </div>
              <div>
                <label className="label">ชื่อสินค้า</label>
                <input
                  name="name"
                  className="input"
                  defaultValue={editing?.name}
                  placeholder="ครีมบำรุงผิวหน้า..."
                  required
                />
              </div>
              <div>
                <label className="label">หมวดหมู่</label>
                <select
                  name="categoryId"
                  className="input"
                  defaultValue={editing?.categoryId ?? ""}
                >
                  <option value="">ไม่มีหมวดหมู่</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">ราคาขาย (บาท)</label>
                  <input
                    name="price"
                    type="number"
                    step="0.01"
                    min="0"
                    className="input"
                    defaultValue={editing ? Number(editing.price) : undefined}
                    required
                  />
                </div>
                <div>
                  <label className="label">ต้นทุน (บาท)</label>
                  <input
                    name="cost"
                    type="number"
                    step="0.01"
                    min="0"
                    className="input"
                    defaultValue={editing ? Number(editing.cost) : 0}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {!editing && (
                  <div>
                    <label className="label">สต๊อกเริ่มต้น</label>
                    <input
                      name="stockQty"
                      type="number"
                      min="0"
                      className="input"
                      defaultValue={0}
                    />
                  </div>
                )}
                <div>
                  <label className="label">แจ้งเตือนเมื่อต่ำกว่า</label>
                  <input
                    name="lowStockAlert"
                    type="number"
                    min="0"
                    className="input"
                    defaultValue={editing?.lowStockAlert ?? 5}
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="submit" className="btn-primary flex-1">
                  {editing ? "บันทึกการแก้ไข" : "เพิ่มสินค้า"}
                </button>
                {editing && (
                  <Link href="/admin/products" className="btn-secondary">
                    ยกเลิก
                  </Link>
                )}
              </div>
            </form>
          </div>

          <div className="card">
            <h2 className="mb-4 font-semibold">หมวดหมู่สินค้า</h2>
            <div className="mb-3 flex flex-wrap gap-2">
              {categories.map((c) => (
                <span key={c.id} className="badge bg-brand-50 text-brand-700">
                  {c.name}
                </span>
              ))}
            </div>
            <form action={addCategory} className="flex gap-2">
              <input
                name="name"
                className="input"
                placeholder="ชื่อหมวดหมู่ใหม่"
                required
              />
              <button type="submit" className="btn-secondary shrink-0">
                เพิ่ม
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
