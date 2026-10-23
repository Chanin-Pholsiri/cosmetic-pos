"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { thb } from "@/lib/format";
import { createSale } from "./actions";

type ProductItem = {
  id: string;
  sku: string;
  name: string;
  price: number;
  stockQty: number;
  category: string;
};
type CourseItem = {
  id: string;
  code: string;
  name: string;
  price: number;
  totalSessions: number;
};
type MemberItem = {
  id: string;
  code: string;
  name: string;
  phone: string;
  points: number;
};
type CartLine = {
  type: "PRODUCT" | "COURSE";
  id: string;
  name: string;
  price: number;
  quantity: number;
  maxQty?: number;
};

const paymentOptions = [
  { value: "CASH", label: "เงินสด" },
  { value: "PROMPTPAY", label: "พร้อมเพย์" },
  { value: "TRANSFER", label: "โอนเงิน" },
  { value: "CREDIT_CARD", label: "บัตรเครดิต" },
] as const;

export function PosClient({
  products,
  courses,
  members,
}: {
  products: ProductItem[];
  courses: CourseItem[];
  members: MemberItem[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"PRODUCT" | "COURSE">("PRODUCT");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [memberQuery, setMemberQuery] = useState("");
  const [memberId, setMemberId] = useState<string | null>(null);
  const [discount, setDiscount] = useState(0);
  const [payment, setPayment] =
    useState<(typeof paymentOptions)[number]["value"]>("CASH");
  const [paymentType, setPaymentType] = useState<"FULL" | "INSTALLMENT">("FULL");
  const [installmentCount, setInstallmentCount] = useState(3);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // กู้ตะกร้าคืนหลังกลับมาจากหน้า login
  useEffect(() => {
    const saved = sessionStorage.getItem("pos-cart");
    if (!saved) return;
    sessionStorage.removeItem("pos-cart");
    try {
      const data = JSON.parse(saved);
      if (Array.isArray(data.cart)) setCart(data.cart);
      if (data.memberId) setMemberId(data.memberId);
      if (typeof data.discount === "number") setDiscount(data.discount);
      if (data.payment) setPayment(data.payment);
    } catch {
      // ข้อมูลเสียหาย ข้ามไป
    }
  }, []);

  const q = search.trim().toLowerCase();
  const filteredProducts = useMemo(
    () =>
      products.filter(
        (p) =>
          !q ||
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      ),
    [products, q]
  );
  const filteredCourses = useMemo(
    () =>
      courses.filter(
        (c) =>
          !q ||
          c.name.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q)
      ),
    [courses, q]
  );

  const selectedMember = members.find((m) => m.id === memberId) ?? null;
  const mq = memberQuery.trim().toLowerCase();
  const memberMatches = mq
    ? members
        .filter(
          (m) =>
            m.name.toLowerCase().includes(mq) ||
            m.phone.includes(mq) ||
            m.code.toLowerCase().includes(mq)
        )
        .slice(0, 5)
    : [];

  const subtotal = cart.reduce((sum, l) => sum + l.price * l.quantity, 0);
  const total = Math.max(subtotal - discount, 0);
  const hasCourse = cart.some((l) => l.type === "COURSE");

  function addLine(line: Omit<CartLine, "quantity">) {
    setError(null);
    setCart((prev) => {
      const existing = prev.find(
        (l) => l.type === line.type && l.id === line.id
      );
      if (existing) {
        if (line.maxQty !== undefined && existing.quantity >= line.maxQty) {
          return prev;
        }
        return prev.map((l) =>
          l.type === line.type && l.id === line.id
            ? { ...l, quantity: l.quantity + 1 }
            : l
        );
      }
      return [...prev, { ...line, quantity: 1 }];
    });
  }

  function changeQty(line: CartLine, delta: number) {
    setCart((prev) =>
      prev
        .map((l) => {
          if (l.type !== line.type || l.id !== line.id) return l;
          const next = l.quantity + delta;
          if (l.maxQty !== undefined && next > l.maxQty) return l;
          return { ...l, quantity: next };
        })
        .filter((l) => l.quantity > 0)
    );
  }

  function submit() {
    setError(null);
    if (cart.length === 0) {
      setError("กรุณาเลือกสินค้าหรือคอร์สอย่างน้อย 1 รายการ");
      return;
    }
    if (hasCourse && !memberId) {
      setError("การขายคอร์สต้องเลือกลูกค้าสมาชิกก่อน");
      return;
    }
    if (paymentType === "INSTALLMENT" && !memberId) {
      setError("การผ่อนชำระต้องเลือกลูกค้าสมาชิกก่อน");
      return;
    }
    startTransition(async () => {
      const result = await createSale({
        items: cart.map((l) => ({ type: l.type, id: l.id, quantity: l.quantity })),
        memberId,
        discount,
        paymentMethod: payment,
        paymentType,
        installmentCount:
          paymentType === "INSTALLMENT" ? installmentCount : undefined,
      });
      if (result.ok) {
        router.push(`/admin/sales/${result.saleId}?new=1`);
      } else if (result.needLogin) {
        sessionStorage.setItem(
          "pos-cart",
          JSON.stringify({ cart, memberId, discount, payment })
        );
        router.push("/login?next=/admin/pos");
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-6">
      {/* แคตตาล็อก */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex rounded-xl border border-brand-200 bg-white p-1">
            <button
              onClick={() => setTab("PRODUCT")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                tab === "PRODUCT"
                  ? "bg-brand-600 text-white"
                  : "text-brand-600 hover:bg-brand-50"
              }`}
            >
              สินค้า
            </button>
            <button
              onClick={() => setTab("COURSE")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                tab === "COURSE"
                  ? "bg-brand-600 text-white"
                  : "text-brand-600 hover:bg-brand-50"
              }`}
            >
              คอร์สทรีตเมนต์
            </button>
          </div>
          <input
            className="input flex-1"
            placeholder="ค้นหาชื่อ / รหัสสินค้า..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="grid flex-1 auto-rows-min grid-cols-2 gap-3 overflow-y-auto pb-4 xl:grid-cols-3">
          {tab === "PRODUCT" &&
            filteredProducts.map((p) => {
              const inCart =
                cart.find((l) => l.type === "PRODUCT" && l.id === p.id)
                  ?.quantity ?? 0;
              const out = p.stockQty - inCart <= 0;
              return (
                <button
                  key={p.id}
                  disabled={out}
                  onClick={() =>
                    addLine({
                      type: "PRODUCT",
                      id: p.id,
                      name: p.name,
                      price: p.price,
                      maxQty: p.stockQty,
                    })
                  }
                  className="card flex flex-col items-start p-4 text-left transition-colors hover:border-brand-400 disabled:opacity-40"
                >
                  <p className="text-xs text-brand-400">
                    {p.sku} · {p.category}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm font-medium">{p.name}</p>
                  <div className="mt-auto flex w-full items-end justify-between pt-3">
                    <span className="font-semibold text-brand-700">
                      {thb(p.price)}
                    </span>
                    <span
                      className={`text-xs ${
                        out ? "text-red-500" : "text-brand-400"
                      }`}
                    >
                      {out ? "หมดสต๊อก" : `เหลือ ${p.stockQty - inCart}`}
                    </span>
                  </div>
                </button>
              );
            })}

          {tab === "COURSE" &&
            filteredCourses.map((c) => (
              <button
                key={c.id}
                onClick={() =>
                  addLine({ type: "COURSE", id: c.id, name: c.name, price: c.price })
                }
                className="card flex flex-col items-start p-4 text-left transition-colors hover:border-brand-400"
              >
                <p className="text-xs text-brand-400">{c.code}</p>
                <p className="mt-1 line-clamp-2 text-sm font-medium">{c.name}</p>
                <div className="mt-auto flex w-full items-end justify-between pt-3">
                  <span className="font-semibold text-brand-700">
                    {thb(c.price)}
                  </span>
                  <span className="text-xs text-brand-400">
                    {c.totalSessions} ครั้ง
                  </span>
                </div>
              </button>
            ))}

          {((tab === "PRODUCT" && filteredProducts.length === 0) ||
            (tab === "COURSE" && filteredCourses.length === 0)) && (
            <p className="col-span-full py-10 text-center text-sm text-brand-400">
              ไม่พบรายการที่ค้นหา
            </p>
          )}
        </div>
      </div>

      {/* ตะกร้า */}
      <div className="card flex w-96 shrink-0 flex-col p-0">
        <div className="border-b border-brand-100 px-5 py-4">
          <h2 className="font-semibold">รายการขาย</h2>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {cart.length === 0 && (
            <p className="py-10 text-center text-sm text-brand-400">
              แตะสินค้าหรือคอร์สเพื่อเพิ่มลงบิล
            </p>
          )}
          {cart.map((l) => (
            <div key={`${l.type}-${l.id}`} className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{l.name}</p>
                <p className="text-xs text-brand-400">
                  {thb(l.price)}
                  {l.type === "COURSE" && " · คอร์ส"}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => changeQty(l, -1)}
                  className="h-7 w-7 rounded-lg border border-brand-200 text-brand-600 hover:bg-brand-50"
                >
                  −
                </button>
                <span className="w-6 text-center text-sm font-medium">
                  {l.quantity}
                </span>
                <button
                  onClick={() => changeQty(l, 1)}
                  className="h-7 w-7 rounded-lg border border-brand-200 text-brand-600 hover:bg-brand-50"
                >
                  +
                </button>
              </div>
              <span className="w-20 text-right text-sm font-medium">
                {thb(l.price * l.quantity)}
              </span>
            </div>
          ))}
        </div>

        <div className="space-y-3 border-t border-brand-100 px-5 py-4">
          {/* ลูกค้าสมาชิก */}
          <div>
            <label className="label">
              ลูกค้าสมาชิก{" "}
              {hasCourse && <span className="text-red-500">*จำเป็นสำหรับคอร์ส</span>}
            </label>
            {selectedMember ? (
              <div className="flex items-center justify-between rounded-xl bg-brand-50 px-3.5 py-2.5">
                <div>
                  <p className="text-sm font-medium">{selectedMember.name}</p>
                  <p className="text-xs text-brand-400">
                    {selectedMember.phone} · {selectedMember.points} แต้ม
                  </p>
                </div>
                <button
                  onClick={() => setMemberId(null)}
                  className="text-xs text-brand-500 hover:text-red-500"
                >
                  เอาออก
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  className="input"
                  placeholder="ค้นหาชื่อ / เบอร์โทร"
                  value={memberQuery}
                  onChange={(e) => setMemberQuery(e.target.value)}
                />
                {memberMatches.length > 0 && (
                  <div className="absolute bottom-full z-10 mb-1 w-full overflow-hidden rounded-xl border border-brand-200 bg-white shadow-lg">
                    {memberMatches.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => {
                          setMemberId(m.id);
                          setMemberQuery("");
                        }}
                        className="block w-full px-3.5 py-2.5 text-left text-sm hover:bg-brand-50"
                      >
                        <span className="font-medium">{m.name}</span>
                        <span className="ml-2 text-xs text-brand-400">
                          {m.phone}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ส่วนลด */}
          <div className="flex items-center justify-between gap-3">
            <label className="text-sm text-brand-600">ส่วนลด (บาท)</label>
            <input
              type="number"
              min={0}
              className="input w-28 text-right"
              value={discount || ""}
              placeholder="0"
              onChange={(e) => setDiscount(Math.max(Number(e.target.value) || 0, 0))}
            />
          </div>

          {/* รูปแบบการชำระ: เต็มจำนวน / ผ่อนชำระ */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPaymentType("FULL")}
              className={`flex-1 rounded-xl border px-3 py-2 text-sm transition-colors ${
                paymentType === "FULL"
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-brand-200 text-brand-700 hover:bg-brand-50"
              }`}
            >
              จ่ายเต็มจำนวน
            </button>
            <button
              onClick={() => setPaymentType("INSTALLMENT")}
              className={`flex-1 rounded-xl border px-3 py-2 text-sm transition-colors ${
                paymentType === "INSTALLMENT"
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-brand-200 text-brand-700 hover:bg-brand-50"
              }`}
            >
              ผ่อนชำระ
            </button>
          </div>
          {paymentType === "INSTALLMENT" && (
            <div className="flex items-center justify-between gap-3 rounded-xl bg-brand-50 px-3.5 py-2.5">
              <label className="text-sm text-brand-700">จำนวนงวด</label>
              <select
                className="input w-32"
                value={installmentCount}
                onChange={(e) => setInstallmentCount(Number(e.target.value))}
              >
                {[2, 3, 4, 5, 6, 10, 12].map((n) => (
                  <option key={n} value={n}>
                    {n} งวด (~{thb(total / n)})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* วิธีชำระเงิน */}
          <div className="grid grid-cols-2 gap-2">
            {paymentOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setPayment(opt.value)}
                className={`rounded-xl border px-3 py-2 text-sm transition-colors ${
                  payment === opt.value
                    ? "border-brand-600 bg-brand-600 text-white"
                    : "border-brand-200 text-brand-700 hover:bg-brand-50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="space-y-1 pt-1 text-sm">
            <div className="flex justify-between text-brand-500">
              <span>รวม</span>
              <span>{thb(subtotal)}</span>
            </div>
            <div className="flex justify-between text-brand-500">
              <span>ส่วนลด</span>
              <span>-{thb(discount)}</span>
            </div>
            <div className="flex justify-between pt-1 text-lg font-semibold text-brand-900">
              <span>ยอดสุทธิ</span>
              <span>{thb(total)}</span>
            </div>
            {paymentType === "INSTALLMENT" && (
              <div className="flex justify-between text-sm text-brand-600">
                <span>ชำระงวดแรกวันนี้</span>
                <span>{thb(Math.floor((total / installmentCount) * 100) / 100)}</span>
              </div>
            )}
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            onClick={submit}
            disabled={pending || cart.length === 0}
            className="btn-primary w-full py-3 text-base"
          >
            {pending
              ? "กำลังบันทึก..."
              : paymentType === "INSTALLMENT"
                ? `ชำระงวดแรก ${thb(Math.floor((total / installmentCount) * 100) / 100)}`
                : `ชำระเงิน ${thb(total)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
