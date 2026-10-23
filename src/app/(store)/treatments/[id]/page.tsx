import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getMemberSession } from "@/lib/member-auth";
import { thb } from "@/lib/format";
import { BookingForm } from "./booking-form";

export default async function TreatmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [course, session] = await Promise.all([
    prisma.course.findUnique({ where: { id } }),
    getMemberSession(),
  ]);
  if (!course || !course.active) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href="/treatments"
        className="text-sm text-brand-400 hover:text-brand-600"
      >
        ← คอร์สทั้งหมด
      </Link>

      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <div className="mb-5 flex h-52 items-center justify-center rounded-3xl bg-brand-50 text-7xl">
            💆‍♀️
          </div>
          <p className="text-xs text-brand-400">{course.code}</p>
          <h1 className="mt-1 text-2xl font-semibold text-brand-900">
            {course.name}
          </h1>
          <p className="mt-3 text-brand-600">{course.description}</p>
          <ul className="mt-4 space-y-2 text-sm text-brand-700">
            <li>✓ เข้ารับบริการทั้งหมด {course.totalSessions} ครั้ง</li>
            <li>
              ✓ อายุคอร์ส{" "}
              {course.validityDays ? `${course.validityDays} วัน` : "ไม่จำกัด"}
            </li>
            <li>✓ เลือกวันเวลานัดครั้งแรกได้ทันที ครั้งถัดไปนัดกับพนักงานหลังรับบริการ</li>
            <li>✓ ผ่อนชำระรายเดือนได้ ชำระงวดแรกวันนี้</li>
            <li>✓ ติดตามนัดหมายและยอดคงเหลือได้ที่ &quot;นัดหมายของฉัน&quot;</li>
          </ul>
          <p className="mt-5 text-3xl font-semibold text-brand-700">
            {thb(Number(course.price))}
          </p>
        </div>

        {session ? (
          <BookingForm
            course={{
              id: course.id,
              name: course.name,
              price: Number(course.price),
              totalSessions: course.totalSessions,
            }}
            member={{
              name: session.member.name,
              hasPhone: Boolean(session.member.phone),
            }}
          />
        ) : (
          <div className="card h-fit space-y-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-2xl">
              🔒
            </div>
            <div>
              <h2 className="font-semibold text-brand-900">
                เข้าสู่ระบบเพื่อซื้อคอร์สและจองคิว
              </h2>
              <p className="mt-1 text-sm text-brand-500">
                สมัครสมาชิกฟรี หรือใช้บัญชี Google ได้เลย
              </p>
            </div>
            <Link
              href={`/account/login?next=${encodeURIComponent(`/treatments/${course.id}`)}`}
              className="btn-primary w-full py-3"
            >
              เข้าสู่ระบบ
            </Link>
            <Link
              href={`/account/register?next=${encodeURIComponent(`/treatments/${course.id}`)}`}
              className="btn-secondary w-full py-3"
            >
              สมัครสมาชิกใหม่
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
