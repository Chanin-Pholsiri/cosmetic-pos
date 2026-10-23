import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  enrollmentStatusLabels,
  paymentLabels,
  thb,
  thDate,
  thDateTime,
} from "@/lib/format";
import { useCourseSession } from "../actions";

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const member = await prisma.member.findUnique({
    where: { id },
    include: {
      enrollments: {
        include: {
          course: true,
          usages: { include: { user: true }, orderBy: { usedAt: "desc" } },
        },
        orderBy: { createdAt: "desc" },
      },
      sales: {
        include: { items: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });
  if (!member) notFound();

  const now = new Date();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/admin/members" className="text-sm text-brand-400 hover:text-brand-600">
            ← กลับไปรายชื่อลูกค้า
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">{member.name}</h1>
          <p className="mt-1 text-sm text-brand-500">
            {member.code} · {member.phone ?? "ไม่มีเบอร์"}
            {member.email && ` · ${member.email}`}
          </p>
        </div>
        <Link href={`/admin/members?edit=${member.id}`} className="btn-secondary">
          แก้ไขข้อมูล
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="card">
          <p className="text-sm text-brand-500">แต้มสะสม</p>
          <p className="mt-2 text-2xl font-semibold">{member.points} แต้ม</p>
        </div>
        <div className="card">
          <p className="text-sm text-brand-500">ยอดซื้อสะสม</p>
          <p className="mt-2 text-2xl font-semibold">
            {thb(member.sales.reduce((s, x) => s + Number(x.total), 0))}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-brand-500">คอร์สที่ใช้งานได้</p>
          <p className="mt-2 text-2xl font-semibold">
            {member.enrollments.filter((e) => e.status === "ACTIVE").length} คอร์ส
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-brand-500">สมัครสมาชิกเมื่อ</p>
          <p className="mt-2 text-lg font-semibold">{thDate(member.createdAt)}</p>
        </div>
      </div>

      {member.notes && (
        <div className="card border-amber-200 bg-amber-50/50">
          <p className="text-sm font-medium text-amber-800">บันทึกเพิ่มเติม</p>
          <p className="mt-1 text-sm text-amber-700">{member.notes}</p>
        </div>
      )}

      <div className="card p-0">
        <div className="px-6 py-4">
          <h2 className="font-semibold">สิทธิ์คอร์สทรีตเมนต์</h2>
        </div>
        {member.enrollments.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-brand-400">ยังไม่เคยซื้อคอร์ส</p>
        ) : (
          <div className="space-y-4 px-6 pb-6">
            {member.enrollments.map((e) => {
              const expired =
                e.status === "EXPIRED" ||
                (e.expiresAt !== null && e.expiresAt < now && e.status === "ACTIVE");
              const usable = e.status === "ACTIVE" && !expired;
              const remaining = e.totalSessions - e.usedSessions;
              return (
                <div
                  key={e.id}
                  className="rounded-xl border border-brand-100 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{e.course.name}</p>
                      <p className="text-xs text-brand-400">
                        ซื้อเมื่อ {thDate(e.createdAt)}
                        {e.expiresAt && ` · หมดอายุ ${thDate(e.expiresAt)}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`badge ${
                          usable
                            ? "bg-emerald-50 text-emerald-700"
                            : e.status === "COMPLETED"
                              ? "bg-brand-100 text-brand-500"
                              : "bg-red-50 text-red-600"
                        }`}
                      >
                        {expired && e.status === "ACTIVE"
                          ? "หมดอายุ"
                          : enrollmentStatusLabels[e.status]}
                      </span>
                      {usable && (
                        <form
                          action={useCourseSession}
                          className="flex items-center gap-2"
                        >
                          <input type="hidden" name="enrollmentId" value={e.id} />
                          <input
                            name="note"
                            className="input w-40 py-1.5 text-xs"
                            placeholder="บันทึก (ถ้ามี)"
                          />
                          <button type="submit" className="btn-primary py-1.5 text-xs">
                            ใช้สิทธิ์ 1 ครั้ง
                          </button>
                        </form>
                      )}
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="mb-1 flex justify-between text-xs text-brand-500">
                      <span>
                        ใช้ไป {e.usedSessions}/{e.totalSessions} ครั้ง
                      </span>
                      <span>เหลือ {remaining} ครั้ง</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-brand-100">
                      <div
                        className="h-full rounded-full bg-brand-600"
                        style={{
                          width: `${(e.usedSessions / e.totalSessions) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  {e.usages.length > 0 && (
                    <details className="mt-3 text-xs text-brand-500">
                      <summary className="cursor-pointer hover:text-brand-700">
                        ประวัติการใช้ ({e.usages.length} ครั้ง)
                      </summary>
                      <ul className="mt-2 space-y-1 pl-4">
                        {e.usages.map((u) => (
                          <li key={u.id}>
                            {thDateTime(u.usedAt)} — โดย {u.user?.name ?? "ไม่ระบุ"}
                            {u.note && ` (${u.note})`}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="card p-0">
        <div className="px-6 py-4">
          <h2 className="font-semibold">ประวัติการซื้อล่าสุด</h2>
        </div>
        <table className="table-base">
          <thead>
            <tr>
              <th>เลขที่ใบเสร็จ</th>
              <th>รายการ</th>
              <th>ชำระโดย</th>
              <th className="text-right">ยอดสุทธิ</th>
            </tr>
          </thead>
          <tbody>
            {member.sales.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-brand-400">
                  ยังไม่มีประวัติการซื้อ
                </td>
              </tr>
            )}
            {member.sales.map((s) => (
              <tr key={s.id}>
                <td>
                  <Link
                    href={`/admin/sales/${s.id}`}
                    className="font-medium text-brand-600 hover:underline"
                  >
                    {s.receiptNo}
                  </Link>
                  <p className="text-xs text-brand-400">{thDateTime(s.createdAt)}</p>
                </td>
                <td className="max-w-md text-brand-600">
                  {s.items.map((i) => i.name).join(", ")}
                </td>
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
