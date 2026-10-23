import Link from "next/link";
import { prisma } from "@/lib/db";
import { thb } from "@/lib/format";
import { deleteCourse, saveCourse, toggleCourseActive } from "./actions";

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;

  const [courses, editing] = await Promise.all([
    prisma.course.findMany({
      include: { _count: { select: { enrollments: true } } },
      orderBy: { createdAt: "desc" },
    }),
    edit ? prisma.course.findUnique({ where: { id: edit } }) : null,
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">คอร์สทรีตเมนต์ & แพ็กเกจ</h1>
        <p className="mt-1 text-sm text-brand-500">
          จัดการคอร์ส จำนวนครั้ง และอายุการใช้งาน ({courses.length} รายการ)
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="card overflow-x-auto p-0">
          <table className="table-base">
            <thead>
              <tr>
                <th>คอร์ส</th>
                <th className="text-right">ราคา</th>
                <th className="text-right">จำนวนครั้ง</th>
                <th className="text-right">อายุคอร์ส</th>
                <th className="text-right">ผู้ถือสิทธิ์</th>
                <th>สถานะ</th>
                <th className="text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {courses.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-brand-400">
                    ยังไม่มีคอร์ส
                  </td>
                </tr>
              )}
              {courses.map((c) => (
                <tr key={c.id} className={c.active ? "" : "opacity-50"}>
                  <td>
                    <p className="font-medium">{c.name}</p>
                    <p className="text-xs text-brand-400">{c.code}</p>
                  </td>
                  <td className="text-right font-medium">{thb(Number(c.price))}</td>
                  <td className="text-right">{c.totalSessions} ครั้ง</td>
                  <td className="text-right text-brand-500">
                    {c.validityDays ? `${c.validityDays} วัน` : "ไม่จำกัด"}
                  </td>
                  <td className="text-right">{c._count.enrollments}</td>
                  <td>
                    <span
                      className={`badge ${
                        c.active
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-brand-100 text-brand-500"
                      }`}
                    >
                      {c.active ? "เปิดขาย" : "ปิดการขาย"}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center justify-end gap-2 text-xs">
                      <Link
                        href={`/admin/courses?edit=${c.id}`}
                        className="text-brand-600 hover:underline"
                      >
                        แก้ไข
                      </Link>
                      <form action={toggleCourseActive}>
                        <input type="hidden" name="id" value={c.id} />
                        <button className="text-brand-500 hover:underline">
                          {c.active ? "ปิดขาย" : "เปิดขาย"}
                        </button>
                      </form>
                      <form action={deleteCourse}>
                        <input type="hidden" name="id" value={c.id} />
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

        <div className="card h-fit">
          <h2 className="mb-4 font-semibold">
            {editing ? `แก้ไข: ${editing.name}` : "เพิ่มคอร์สใหม่"}
          </h2>
          <form action={saveCourse} className="space-y-3">
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <div>
              <label className="label">รหัสคอร์ส</label>
              <input
                name="code"
                className="input"
                defaultValue={editing?.code}
                placeholder="CS-001"
                required
              />
            </div>
            <div>
              <label className="label">ชื่อคอร์ส</label>
              <input
                name="name"
                className="input"
                defaultValue={editing?.name}
                placeholder="คอร์สทรีตเมนต์หน้าใส 5 ครั้ง"
                required
              />
            </div>
            <div>
              <label className="label">รายละเอียด</label>
              <textarea
                name="description"
                className="input"
                rows={2}
                defaultValue={editing?.description ?? ""}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">ราคา (บาท)</label>
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
                <label className="label">จำนวนครั้ง</label>
                <input
                  name="totalSessions"
                  type="number"
                  min="1"
                  className="input"
                  defaultValue={editing?.totalSessions ?? 1}
                  required
                />
              </div>
            </div>
            <div>
              <label className="label">อายุคอร์ส (วัน — เว้นว่าง/0 = ไม่จำกัด)</label>
              <input
                name="validityDays"
                type="number"
                min="0"
                className="input"
                defaultValue={editing?.validityDays ?? ""}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button type="submit" className="btn-primary flex-1">
                {editing ? "บันทึกการแก้ไข" : "เพิ่มคอร์ส"}
              </button>
              {editing && (
                <Link href="/admin/courses" className="btn-secondary">
                  ยกเลิก
                </Link>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
