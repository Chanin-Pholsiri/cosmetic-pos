import Link from "next/link";
import { prisma } from "@/lib/db";
import { thDate } from "@/lib/format";
import { saveMember } from "./actions";

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; q?: string }>;
}) {
  const { edit, q } = await searchParams;

  const [members, editing] = await Promise.all([
    prisma.member.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { phone: { contains: q } },
              { code: { contains: q, mode: "insensitive" } },
            ],
          }
        : undefined,
      include: {
        _count: { select: { sales: true, enrollments: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    edit ? prisma.member.findUnique({ where: { id: edit } }) : null,
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">ลูกค้าสมาชิก</h1>
        <p className="mt-1 text-sm text-brand-500">
          ทะเบียนลูกค้า แต้มสะสม และสิทธิ์คอร์ส ({members.length} คน)
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="card p-0">
          <form className="border-b border-brand-100 px-6 py-4">
            <input
              name="q"
              defaultValue={q}
              className="input max-w-xs"
              placeholder="ค้นหาชื่อ / เบอร์โทร / รหัส แล้วกด Enter"
            />
          </form>
          <table className="table-base">
            <thead>
              <tr>
                <th>ลูกค้า</th>
                <th>เบอร์โทร</th>
                <th className="text-right">แต้มสะสม</th>
                <th className="text-right">ซื้อไปแล้ว</th>
                <th className="text-right">คอร์สที่ถือ</th>
                <th>สมัครเมื่อ</th>
              </tr>
            </thead>
            <tbody>
              {members.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-brand-400">
                    ยังไม่มีลูกค้าสมาชิก
                  </td>
                </tr>
              )}
              {members.map((m) => (
                <tr key={m.id}>
                  <td>
                    <Link
                      href={`/admin/members/${m.id}`}
                      className="font-medium text-brand-600 hover:underline"
                    >
                      {m.name}
                    </Link>
                    <p className="text-xs text-brand-400">{m.code}</p>
                  </td>
                  <td>{m.phone ?? "—"}</td>
                  <td className="text-right">
                    <span className="badge bg-brand-50 text-brand-700">
                      {m.points} แต้ม
                    </span>
                  </td>
                  <td className="text-right">{m._count.sales} บิล</td>
                  <td className="text-right">{m._count.enrollments} คอร์ส</td>
                  <td className="text-brand-500">{thDate(m.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card h-fit">
          <h2 className="mb-4 font-semibold">
            {editing ? `แก้ไข: ${editing.name}` : "เพิ่มลูกค้าใหม่"}
          </h2>
          <form action={saveMember} className="space-y-3">
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <div>
              <label className="label">ชื่อ-นามสกุล</label>
              <input
                name="name"
                className="input"
                defaultValue={editing?.name}
                required
              />
            </div>
            <div>
              <label className="label">เบอร์โทรศัพท์</label>
              <input
                name="phone"
                className="input"
                defaultValue={editing?.phone ?? ""}
                required
              />
            </div>
            <div>
              <label className="label">อีเมล (ถ้ามี)</label>
              <input
                name="email"
                type="email"
                className="input"
                defaultValue={editing?.email ?? ""}
              />
            </div>
            <div>
              <label className="label">วันเกิด (ถ้ามี)</label>
              <input
                name="birthDate"
                type="date"
                className="input"
                defaultValue={
                  editing?.birthDate
                    ? editing.birthDate.toISOString().slice(0, 10)
                    : ""
                }
              />
            </div>
            <div>
              <label className="label">บันทึกเพิ่มเติม</label>
              <textarea
                name="notes"
                className="input"
                rows={2}
                defaultValue={editing?.notes ?? ""}
                placeholder="เช่น แพ้สารกันเสีย, ผิวแพ้ง่าย"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button type="submit" className="btn-primary flex-1">
                {editing ? "บันทึกการแก้ไข" : "เพิ่มลูกค้า"}
              </button>
              {editing && (
                <Link href="/admin/members" className="btn-secondary">
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
