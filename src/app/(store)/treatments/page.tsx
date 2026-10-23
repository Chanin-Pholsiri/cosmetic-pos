// ดึงข้อมูลสินค้า/คอร์สล่าสุดจากฐานข้อมูลทุกครั้ง
export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/db";
import { thb } from "@/lib/format";

export default async function TreatmentsPage() {
  const courses = await prisma.course.findMany({
    where: { active: true },
    orderBy: { price: "asc" },
  });

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-semibold text-brand-900">
          คอร์สทรีตเมนต์ทั้งหมด
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-brand-500">
          เลือกคอร์สที่ใช่ ซื้อพร้อมจองวันเข้ารับบริการครั้งแรก
          จ่ายเต็มจำนวนหรือผ่อนชำระรายเดือนก็ได้
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((c) => (
          <div key={c.id} className="card flex flex-col">
            <div className="mb-4 flex h-32 items-center justify-center rounded-xl bg-brand-50 text-5xl">
              💆‍♀️
            </div>
            <p className="text-xs text-brand-400">{c.code}</p>
            <h2 className="mt-1 text-lg font-semibold text-brand-900">
              {c.name}
            </h2>
            <p className="mt-2 text-sm text-brand-500">{c.description}</p>
            <ul className="mt-3 space-y-1 text-sm text-brand-600">
              <li>✓ เข้ารับบริการ {c.totalSessions} ครั้ง</li>
              <li>
                ✓ อายุคอร์ส{" "}
                {c.validityDays ? `${c.validityDays} วัน` : "ไม่จำกัด"}
              </li>
              <li>✓ ผ่อนชำระรายเดือนได้</li>
            </ul>
            <div className="mt-auto flex items-center justify-between pt-5">
              <span className="text-xl font-semibold text-brand-700">
                {thb(Number(c.price))}
              </span>
              <Link href={`/treatments/${c.id}`} className="btn-primary">
                ซื้อและจองคิว
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
