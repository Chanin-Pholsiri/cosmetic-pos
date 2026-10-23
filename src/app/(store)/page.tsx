// ดึงข้อมูลสินค้า/คอร์สล่าสุดจากฐานข้อมูลทุกครั้ง
export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/db";
import { thb } from "@/lib/format";

export default async function StoreHomePage() {
  const [courses, products] = await Promise.all([
    prisma.course.findMany({
      where: { active: true },
      orderBy: { price: "asc" },
      take: 4,
    }),
    prisma.product.findMany({
      where: { active: true, stockQty: { gt: 0 } },
      include: { category: true },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  return (
    <div className="space-y-14">
      {/* Hero */}
      <section className="rounded-3xl bg-gradient-to-br from-brand-100 via-cream-100 to-cream-50 px-8 py-14 text-center">
        <p className="text-sm font-medium tracking-wide text-brand-500 uppercase">
          Beauty Shop & Treatment
        </p>
        <h1 className="mx-auto mt-3 max-w-2xl text-3xl font-semibold text-brand-900 lg:text-4xl">
          ผิวสวยสุขภาพดี ด้วยทรีตเมนต์จากผู้เชี่ยวชาญ
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-brand-600">
          เลือกซื้อคอร์สทรีตเมนต์พร้อมจองวันเข้ารับบริการได้ทันที
          ผ่อนชำระได้ และติดตามนัดหมายของคุณออนไลน์
        </p>
        <div className="mt-7 flex justify-center gap-3">
          <Link href="/treatments" className="btn-primary px-6 py-3">
            ดูคอร์สทรีตเมนต์
          </Link>
          <Link href="/my" className="btn-secondary px-6 py-3">
            เช็คนัดหมายของฉัน
          </Link>
        </div>
      </section>

      {/* คอร์สแนะนำ */}
      <section>
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h2 className="text-xl font-semibold text-brand-900">
              คอร์สทรีตเมนต์แนะนำ
            </h2>
            <p className="mt-1 text-sm text-brand-500">
              ซื้อออนไลน์ พร้อมเลือกวันเวลาเข้ารับบริการครั้งแรกได้เลย
            </p>
          </div>
          <Link
            href="/treatments"
            className="text-sm text-brand-500 hover:text-brand-700"
          >
            ดูทั้งหมด →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {courses.map((c) => (
            <Link
              key={c.id}
              href={`/treatments/${c.id}`}
              className="card group flex flex-col transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md"
            >
              <div className="mb-3 flex h-28 items-center justify-center rounded-xl bg-brand-50 text-4xl">
                💆‍♀️
              </div>
              <p className="font-medium text-brand-900 group-hover:text-brand-700">
                {c.name}
              </p>
              <p className="mt-1 line-clamp-2 text-sm text-brand-500">
                {c.description}
              </p>
              <div className="mt-auto flex items-end justify-between pt-4">
                <span className="text-lg font-semibold text-brand-700">
                  {thb(Number(c.price))}
                </span>
                <span className="text-xs text-brand-400">
                  {c.totalSessions} ครั้ง
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* สินค้า */}
      <section>
        <div className="mb-5">
          <h2 className="text-xl font-semibold text-brand-900">
            สินค้าของเรา
          </h2>
          <p className="mt-1 text-sm text-brand-500">
            เครื่องสำอางและสกินแคร์คัดสรร — เลือกซื้อได้ที่หน้าร้าน
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <div key={p.id} className="card flex flex-col p-4">
              <div className="mb-3 flex h-24 items-center justify-center rounded-xl bg-cream-100 text-3xl">
                🧴
              </div>
              <p className="text-xs text-brand-400">
                {p.category?.name ?? "สินค้า"}
              </p>
              <p className="mt-0.5 line-clamp-2 text-sm font-medium text-brand-900">
                {p.name}
              </p>
              <p className="mt-auto pt-3 font-semibold text-brand-700">
                {thb(Number(p.price))}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
