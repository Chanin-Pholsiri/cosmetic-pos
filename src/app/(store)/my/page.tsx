import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireMember } from "@/lib/member-auth";
import {
  appointmentStatusLabels,
  enrollmentStatusLabels,
  thb,
  thDate,
  thDateTime,
} from "@/lib/format";
import {
  confirmMyAppointment,
  rescheduleMyAppointment,
  updateMyPhone,
} from "./actions";

const statusBadge: Record<string, string> = {
  SCHEDULED: "bg-amber-50 text-amber-700",
  CONFIRMED: "bg-emerald-50 text-emerald-700",
  COMPLETED: "bg-brand-100 text-brand-500",
  CANCELLED: "bg-red-50 text-red-500",
};

export default async function MyPage({
  searchParams,
}: {
  searchParams: Promise<{ purchased?: string }>;
}) {
  const { purchased } = await searchParams;
  const sessionMember = await requireMember("/my");

  const member = (await prisma.member.findUnique({
    where: { id: sessionMember.id },
    include: {
      appointments: {
        include: { enrollment: { include: { course: true } } },
        orderBy: { scheduledAt: "asc" },
      },
      enrollments: {
        include: { course: true },
        orderBy: { createdAt: "desc" },
      },
      sales: {
        where: { installmentPlan: { isNot: null } },
        include: {
          items: true,
          installmentPlan: {
            include: { installments: { orderBy: { seq: "asc" } } },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  }))!;

  const now = new Date();
  const soonThreshold = new Date(now.getTime() + 48 * 3600000);
  const upcoming = member.appointments.filter(
    (a) => a.status === "SCHEDULED" || a.status === "CONFIRMED"
  );
  const alerts = upcoming.filter(
    (a) => a.scheduledAt <= soonThreshold && a.status === "SCHEDULED"
  );
  const minDate = new Date(Date.now() + 24 * 3600000).toISOString().slice(0, 16);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-brand-900">นัดหมายของฉัน</h1>
        <p className="mt-1 text-sm text-brand-500">
          นัดหมาย สิทธิ์คอร์ส และการผ่อนชำระของคุณ
        </p>
      </div>

      {purchased && (
        <div className="rounded-xl bg-emerald-50 px-4 py-3 text-center text-sm text-emerald-700">
          ✓ สั่งซื้อและจองคิวสำเร็จ! ร้านจะติดต่อยืนยันนัดหมายอีกครั้ง
        </div>
      )}

      <div className="card flex items-center justify-between">
        <div>
          <p className="font-semibold text-brand-900">{member.name}</p>
          <p className="text-sm text-brand-400">
            รหัสสมาชิก {member.code}
            {member.phone && ` · ${member.phone}`}
            {member.email && ` · ${member.email}`}
          </p>
        </div>
        <span className="badge bg-brand-50 px-3 py-1.5 text-brand-700">
          ⭐ {member.points} แต้ม
        </span>
      </div>

      {/* บัญชี Google ที่ยังไม่มีเบอร์โทร */}
      {!member.phone && (
        <div className="card border-amber-200 bg-amber-50/60">
          <p className="font-medium text-amber-800">
            กรุณาเพิ่มเบอร์โทรศัพท์
          </p>
          <p className="mt-1 text-sm text-amber-700">
            จำเป็นสำหรับการจองคิวและให้ร้านติดต่อยืนยันนัดหมาย
          </p>
          <form action={updateMyPhone} className="mt-3 flex max-w-sm gap-2">
            <input
              name="phone"
              className="input"
              placeholder="0812345678"
              inputMode="tel"
              maxLength={10}
              required
            />
            <button className="btn-primary shrink-0">บันทึก</button>
          </form>
        </div>
      )}

      {/* แจ้งเตือนนัดใกล้ถึง */}
      {alerts.length > 0 && (
        <div className="card border-amber-200 bg-amber-50/60">
          <p className="font-medium text-amber-800">
            🔔 คุณมีนัดหมายใกล้ถึงที่ยังไม่ยืนยัน
          </p>
          <p className="mt-1 text-sm text-amber-700">
            กรุณากด &quot;ยืนยันเข้ารับบริการ&quot; หรือเลื่อนนัดด้านล่าง
          </p>
        </div>
      )}

      {/* นัดหมาย */}
      <div className="card p-0">
        <div className="px-6 py-4">
          <h2 className="font-semibold">นัดหมายเข้ารับบริการ</h2>
        </div>
        <div className="space-y-3 px-6 pb-6">
          {upcoming.length === 0 && (
            <p className="py-4 text-center text-sm text-brand-400">
              ไม่มีนัดหมายที่จะถึง —{" "}
              <Link href="/treatments" className="text-brand-600 underline">
                เลือกซื้อคอร์สทรีตเมนต์
              </Link>
            </p>
          )}
          {upcoming.map((a) => (
            <div key={a.id} className="rounded-xl border border-brand-100 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-brand-900">
                    {a.enrollment.course.name}
                  </p>
                  <p className="text-sm text-brand-600">
                    📅 {thDateTime(a.scheduledAt)}
                  </p>
                </div>
                <span className={`badge ${statusBadge[a.status]}`}>
                  {appointmentStatusLabels[a.status]}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {a.status === "SCHEDULED" && (
                  <form action={confirmMyAppointment}>
                    <input type="hidden" name="id" value={a.id} />
                    <button className="btn-primary py-1.5 text-xs">
                      ✓ ยืนยันเข้ารับบริการ
                    </button>
                  </form>
                )}
                <form
                  action={rescheduleMyAppointment}
                  className="flex items-center gap-2"
                >
                  <input type="hidden" name="id" value={a.id} />
                  <input
                    name="scheduledAt"
                    type="datetime-local"
                    min={minDate}
                    className="input w-52 py-1.5 text-xs"
                    required
                  />
                  <button className="btn-secondary py-1.5 text-xs">
                    ขอเลื่อนนัด
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* สิทธิ์คอร์ส */}
      <div className="card p-0">
        <div className="px-6 py-4">
          <h2 className="font-semibold">คอร์สของฉัน</h2>
        </div>
        <div className="space-y-3 px-6 pb-6">
          {member.enrollments.length === 0 && (
            <p className="py-4 text-center text-sm text-brand-400">
              ยังไม่มีคอร์ส
            </p>
          )}
          {member.enrollments.map((e) => (
            <div key={e.id} className="rounded-xl border border-brand-100 p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium">{e.course.name}</p>
                <span
                  className={`badge ${
                    e.status === "ACTIVE"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-brand-100 text-brand-500"
                  }`}
                >
                  {enrollmentStatusLabels[e.status]}
                </span>
              </div>
              <div className="mt-2">
                <div className="mb-1 flex justify-between text-xs text-brand-500">
                  <span>
                    ใช้ไป {e.usedSessions}/{e.totalSessions} ครั้ง
                  </span>
                  {e.expiresAt && <span>หมดอายุ {thDate(e.expiresAt)}</span>}
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
            </div>
          ))}
        </div>
      </div>

      {/* ผ่อนชำระ */}
      {member.sales.length > 0 && (
        <div className="card p-0">
          <div className="px-6 py-4">
            <h2 className="font-semibold">การผ่อนชำระของฉัน</h2>
          </div>
          <div className="space-y-4 px-6 pb-6">
            {member.sales.map((s) => {
              const plan = s.installmentPlan!;
              const balance = plan.installments
                .filter((i) => i.status === "PENDING")
                .reduce((sum, i) => sum + Number(i.amount), 0);
              return (
                <div key={s.id} className="rounded-xl border border-brand-100 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">
                      {s.items.map((i) => i.name).join(", ")}
                    </p>
                    <p className="text-sm font-semibold text-brand-700">
                      คงเหลือ {thb(balance)}
                    </p>
                  </div>
                  <table className="mt-2 w-full text-sm">
                    <tbody>
                      {plan.installments.map((i) => {
                        const isOverdue =
                          i.status === "PENDING" && i.dueDate < now;
                        return (
                          <tr key={i.id}>
                            <td className="py-1 text-brand-600">
                              งวดที่ {i.seq}/{plan.count}
                            </td>
                            <td
                              className={`py-1 ${
                                isOverdue ? "text-red-500" : "text-brand-500"
                              }`}
                            >
                              ครบกำหนด {thDate(i.dueDate)}
                            </td>
                            <td className="py-1 text-right">
                              {thb(Number(i.amount))}
                            </td>
                            <td className="py-1 text-right">
                              {i.status === "PAID" ? (
                                <span className="text-emerald-600">ชำระแล้ว</span>
                              ) : isOverdue ? (
                                <span className="text-red-500">เกินกำหนด</span>
                              ) : (
                                <span className="text-amber-600">รอชำระ</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <p className="mt-2 text-xs text-brand-400">
                    ชำระงวดที่เหลือได้ที่หน้าร้าน
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
