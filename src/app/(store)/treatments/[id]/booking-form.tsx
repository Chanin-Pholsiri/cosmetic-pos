"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { thb } from "@/lib/format";
import { purchaseCourse } from "../actions";

const paymentMethods = [
  { value: "PROMPTPAY", label: "พร้อมเพย์" },
  { value: "TRANSFER", label: "โอนเงิน" },
  { value: "CREDIT_CARD", label: "บัตรเครดิต" },
] as const;

export function BookingForm({
  course,
  member,
}: {
  course: { id: string; name: string; price: number; totalSessions: number };
  member: { name: string; hasPhone: boolean };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [phone, setPhone] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [paymentType, setPaymentType] = useState<"FULL" | "INSTALLMENT">("FULL");
  const [installmentCount, setInstallmentCount] = useState(3);
  const [method, setMethod] =
    useState<(typeof paymentMethods)[number]["value"]>("PROMPTPAY");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const firstPayment =
    paymentType === "INSTALLMENT"
      ? Math.floor((course.price / installmentCount) * 100) / 100
      : course.price;

  // เลือกได้ตั้งแต่พรุ่งนี้เป็นต้นไป
  const minDate = new Date(Date.now() + 24 * 3600000).toISOString().slice(0, 16);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await purchaseCourse({
        courseId: course.id,
        scheduledAt,
        paymentType,
        installmentCount:
          paymentType === "INSTALLMENT" ? installmentCount : undefined,
        paymentMethod: method,
        phone: member.hasPhone ? undefined : phone,
      });
      if (result.ok) {
        router.push("/my?purchased=1");
      } else if (result.needLogin) {
        router.push(`/account/login?next=${encodeURIComponent(pathname)}`);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={submit} className="card h-fit space-y-4">
      <div>
        <h2 className="font-semibold text-brand-900">ซื้อคอร์สและจองคิว</h2>
        <p className="mt-1 text-sm text-brand-500">
          จองในนาม <span className="font-medium text-brand-700">{member.name}</span>
        </p>
      </div>

      {!member.hasPhone && (
        <div>
          <label className="label">เบอร์โทรศัพท์</label>
          <input
            className="input"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
            placeholder="0812345678"
            inputMode="tel"
            maxLength={10}
            required
          />
          <p className="mt-1 text-xs text-brand-400">
            บัญชีของคุณยังไม่มีเบอร์โทร — จำเป็นสำหรับให้ร้านติดต่อยืนยันนัด
          </p>
        </div>
      )}

      <div>
        <label className="label">วันเวลาเข้ารับบริการครั้งแรก</label>
        <input
          type="datetime-local"
          className="input"
          value={scheduledAt}
          min={minDate}
          onChange={(e) => setScheduledAt(e.target.value)}
          required
        />
        <p className="mt-1 text-xs text-brand-400">
          เปิดทุกวัน 10:00–20:00 น. — ร้านจะโทรยืนยันนัดอีกครั้ง
        </p>
      </div>

      <div>
        <label className="label">รูปแบบการชำระเงิน</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPaymentType("FULL")}
            className={`flex-1 rounded-xl border px-3 py-2.5 text-sm transition-colors ${
              paymentType === "FULL"
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-brand-200 text-brand-700 hover:bg-brand-50"
            }`}
          >
            จ่ายเต็มจำนวน
          </button>
          <button
            type="button"
            onClick={() => setPaymentType("INSTALLMENT")}
            className={`flex-1 rounded-xl border px-3 py-2.5 text-sm transition-colors ${
              paymentType === "INSTALLMENT"
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-brand-200 text-brand-700 hover:bg-brand-50"
            }`}
          >
            ผ่อนชำระรายเดือน
          </button>
        </div>
      </div>

      {paymentType === "INSTALLMENT" && (
        <div className="rounded-xl bg-brand-50 p-3.5">
          <label className="label">จำนวนงวด</label>
          <select
            className="input"
            value={installmentCount}
            onChange={(e) => setInstallmentCount(Number(e.target.value))}
          >
            {[2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n} งวด × ~{thb(course.price / n)} / เดือน
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-brand-500">
            ชำระงวดแรกวันนี้ งวดถัดไปครบกำหนดทุก 1 เดือน
            (ชำระงวดที่เหลือได้ที่ร้าน)
          </p>
        </div>
      )}

      <div>
        <label className="label">ช่องทางชำระเงิน</label>
        <div className="grid grid-cols-3 gap-2">
          {paymentMethods.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setMethod(m.value)}
              className={`rounded-xl border px-2 py-2 text-sm transition-colors ${
                method === m.value
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-brand-200 text-brand-700 hover:bg-brand-50"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1 border-t border-brand-100 pt-3 text-sm">
        <div className="flex justify-between text-brand-500">
          <span>ราคาคอร์ส</span>
          <span>{thb(course.price)}</span>
        </div>
        <div className="flex justify-between text-base font-semibold text-brand-900">
          <span>ชำระวันนี้</span>
          <span>{thb(firstPayment)}</span>
        </div>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-600">
          {error}
        </p>
      )}

      <button type="submit" className="btn-primary w-full py-3" disabled={pending}>
        {pending ? "กำลังทำรายการ..." : `ชำระเงิน ${thb(firstPayment)} และจองคิว`}
      </button>
      <p className="text-center text-xs text-brand-400">
        * ระบบเดโม — บันทึกคำสั่งซื้อเป็นชำระแล้วทันที ยังไม่ตัดเงินจริง
      </p>
    </form>
  );
}
