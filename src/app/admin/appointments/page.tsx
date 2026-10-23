import Link from "next/link";
import { prisma } from "@/lib/db";
import { appointmentStatusLabels, thDateTime } from "@/lib/format";
import {
  cancelAppointment,
  completeAppointment,
  confirmAppointment,
  createAppointment,
  rescheduleAppointment,
} from "./actions";

const statusBadge: Record<string, string> = {
  SCHEDULED: "bg-amber-50 text-amber-700",
  CONFIRMED: "bg-emerald-50 text-emerald-700",
  COMPLETED: "bg-brand-100 text-brand-500",
  CANCELLED: "bg-red-50 text-red-500",
};

export default async function AppointmentsPage() {
  const now = new Date();
  const soonThreshold = new Date(now.getTime() + 48 * 3600000);

  const [upcoming, past, activeEnrollments] = await Promise.all([
    prisma.appointment.findMany({
      where: { status: { in: ["SCHEDULED", "CONFIRMED"] } },
      include: { member: true, enrollment: { include: { course: true } } },
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.appointment.findMany({
      where: { status: { in: ["COMPLETED", "CANCELLED"] } },
      include: { member: true, enrollment: { include: { course: true } } },
      orderBy: { scheduledAt: "desc" },
      take: 15,
    }),
    prisma.courseEnrollment.findMany({
      where: { status: "ACTIVE" },
      include: { member: true, course: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const overdue = upcoming.filter((a) => a.scheduledAt < now);
  const soon = upcoming.filter(
    (a) => a.scheduledAt >= now && a.scheduledAt <= soonThreshold
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">นัดหมายบริการ</h1>
        <p className="mt-1 text-sm text-brand-500">
          จัดการนัดทรีตเมนต์ ยืนยัน เลื่อนนัด และบันทึกการเข้ารับบริการ
        </p>
      </div>

      {(overdue.length > 0 || soon.length > 0) && (
        <div className="card border-amber-200 bg-amber-50/60">
          <p className="text-sm font-medium text-amber-800">
            🔔 แจ้งเตือนนัดหมาย
          </p>
          <ul className="mt-2 space-y-1 text-sm text-amber-700">
            {overdue.map((a) => (
              <li key={a.id}>
                เลยกำหนดนัด — {a.member.name} ({a.enrollment.course.name}){" "}
                {thDateTime(a.scheduledAt)} · โทรติดตามเพื่อยืนยันหรือเลื่อนนัด
              </li>
            ))}
            {soon.map((a) => (
              <li key={a.id}>
                ใกล้ถึงนัดใน 48 ชม. — {a.member.name} ({a.enrollment.course.name}){" "}
                {thDateTime(a.scheduledAt)}
                {a.status === "SCHEDULED" && " · ยังไม่ยืนยัน"}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <div className="card p-0">
            <div className="px-6 py-4">
              <h2 className="font-semibold">
                นัดหมายที่จะถึง ({upcoming.length})
              </h2>
            </div>
            <div className="space-y-4 px-6 pb-6">
              {upcoming.length === 0 && (
                <p className="py-6 text-center text-sm text-brand-400">
                  ไม่มีนัดหมายค้างอยู่
                </p>
              )}
              {upcoming.map((a) => {
                const remaining =
                  a.enrollment.totalSessions - a.enrollment.usedSessions;
                return (
                  <div key={a.id} className="rounded-xl border border-brand-100 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">
                          <Link
                            href={`/admin/members/${a.memberId}`}
                            className="text-brand-700 hover:underline"
                          >
                            {a.member.name}
                          </Link>{" "}
                          <span className="text-sm text-brand-400">
                            · {a.member.phone}
                          </span>
                        </p>
                        <p className="text-sm text-brand-600">
                          {a.enrollment.course.name} (เหลือ {remaining} ครั้ง)
                        </p>
                        <p className="mt-1 text-sm font-medium text-brand-900">
                          📅 {thDateTime(a.scheduledAt)}
                          <span
                            className={`badge ml-2 ${statusBadge[a.status]}`}
                          >
                            {appointmentStatusLabels[a.status]}
                          </span>
                          {a.scheduledAt < now && (
                            <span className="badge ml-1 bg-red-50 text-red-600">
                              เลยกำหนด
                            </span>
                          )}
                        </p>
                        {a.note && (
                          <p className="mt-1 text-xs text-brand-400">
                            หมายเหตุ: {a.note}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        {a.status === "SCHEDULED" && (
                          <form action={confirmAppointment}>
                            <input type="hidden" name="id" value={a.id} />
                            <button className="btn-secondary py-1.5 text-xs">
                              ✓ ยืนยันนัด
                            </button>
                          </form>
                        )}
                        <form
                          action={rescheduleAppointment}
                          className="flex items-center gap-2"
                        >
                          <input type="hidden" name="id" value={a.id} />
                          <input
                            name="scheduledAt"
                            type="datetime-local"
                            className="input w-52 py-1.5 text-xs"
                            required
                          />
                          <button className="btn-secondary py-1.5 text-xs">
                            เลื่อนนัด
                          </button>
                        </form>
                        <form action={cancelAppointment}>
                          <input type="hidden" name="id" value={a.id} />
                          <button className="text-xs text-red-500 hover:underline">
                            ยกเลิกนัด
                          </button>
                        </form>
                      </div>
                    </div>

                    {/* บันทึกเข้ารับบริการ + นัดครั้งถัดไป */}
                    <form
                      action={completeAppointment}
                      className="mt-3 flex flex-wrap items-end gap-2 rounded-xl bg-brand-50 p-3"
                    >
                      <input type="hidden" name="id" value={a.id} />
                      <div className="min-w-40 flex-1">
                        <label className="label text-xs">
                          บันทึกการให้บริการ (ถ้ามี)
                        </label>
                        <input
                          name="note"
                          className="input py-1.5 text-xs"
                          placeholder="เช่น ทำทรีตเมนต์สูตร A"
                        />
                      </div>
                      {remaining > 1 && (
                        <div>
                          <label className="label text-xs">
                            นัดครั้งถัดไป (ถ้ากำหนดเลย)
                          </label>
                          <input
                            name="nextAt"
                            type="datetime-local"
                            className="input py-1.5 text-xs"
                          />
                        </div>
                      )}
                      <button className="btn-primary py-2 text-xs">
                        ✓ เข้ารับบริการแล้ว (ตัดสิทธิ์ 1 ครั้ง)
                      </button>
                    </form>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card p-0">
            <div className="px-6 py-4">
              <h2 className="font-semibold">ประวัติล่าสุด</h2>
            </div>
            <table className="table-base">
              <thead>
                <tr>
                  <th>วันเวลานัด</th>
                  <th>ลูกค้า</th>
                  <th>คอร์ส</th>
                  <th>สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {past.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-brand-400">
                      ยังไม่มีประวัติ
                    </td>
                  </tr>
                )}
                {past.map((a) => (
                  <tr key={a.id}>
                    <td className="whitespace-nowrap text-brand-500">
                      {thDateTime(a.scheduledAt)}
                    </td>
                    <td>{a.member.name}</td>
                    <td className="text-brand-600">{a.enrollment.course.name}</td>
                    <td>
                      <span className={`badge ${statusBadge[a.status]}`}>
                        {appointmentStatusLabels[a.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card h-fit">
          <h2 className="mb-4 font-semibold">สร้างนัดหมายใหม่</h2>
          <form action={createAppointment} className="space-y-3">
            <div>
              <label className="label">ลูกค้า / คอร์สที่ถือสิทธิ์</label>
              <select name="enrollmentId" className="input" required>
                <option value="">— เลือกสิทธิ์คอร์ส —</option>
                {activeEnrollments.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.member.name} · {e.course.name} (เหลือ{" "}
                    {e.totalSessions - e.usedSessions} ครั้ง)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">วันเวลานัด</label>
              <input
                name="scheduledAt"
                type="datetime-local"
                className="input"
                required
              />
            </div>
            <div>
              <label className="label">หมายเหตุ</label>
              <input name="note" className="input" placeholder="ถ้ามี" />
            </div>
            <button type="submit" className="btn-primary w-full">
              บันทึกนัดหมาย
            </button>
          </form>
          <p className="mt-3 text-xs text-brand-400">
            ลูกค้าที่ซื้อคอร์สออนไลน์จะเลือกวันนัดครั้งแรกเองตอนสั่งซื้อ
            และเข้ามายืนยัน/เลื่อนนัดได้ที่หน้า &quot;นัดหมายของฉัน&quot; บนหน้าร้าน
          </p>
        </div>
      </div>
    </div>
  );
}
