"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/admin/actions";
import { roleLabels } from "@/lib/format";

const navItems = [
  { href: "/admin", label: "แดชบอร์ด", icon: "▦" },
  { href: "/admin/pos", label: "ขายหน้าร้าน (POS)", icon: "🛒" },
  { href: "/admin/appointments", label: "นัดหมายบริการ", icon: "📅" },
  { href: "/admin/installments", label: "ผ่อนชำระ", icon: "💳" },
  { href: "/admin/products", label: "สินค้า", icon: "🧴" },
  { href: "/admin/courses", label: "คอร์สทรีตเมนต์", icon: "💆" },
  { href: "/admin/members", label: "ลูกค้าสมาชิก", icon: "👥" },
  { href: "/admin/stock", label: "สต๊อกสินค้า", icon: "📦" },
  { href: "/admin/sales", label: "ประวัติการขาย", icon: "🧾" },
  { href: "/admin/reports", label: "รายงานยอดขาย", icon: "📊" },
];

const adminItems = [
  { href: "/admin/users", label: "ผู้ใช้งานระบบ", icon: "🔑" },
];

export function Sidebar({
  userName,
  userRole,
}: {
  userName: string;
  userRole: string;
}) {
  const pathname = usePathname();
  const items =
    userRole === "ADMIN" ? [...navItems, ...adminItems] : navItems;

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-brand-100 bg-white print:hidden">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
          ✦
        </div>
        <div>
          <p className="text-sm font-semibold text-brand-900">Beauty POS</p>
          <p className="text-xs text-brand-400">ระบบหลังร้าน</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {items.map((item) => {
          const active =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                active
                  ? "bg-brand-600 font-medium text-white"
                  : "text-brand-700 hover:bg-brand-50"
              }`}
            >
              <span className="w-5 text-center text-base leading-none">
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-brand-100 p-4">
        <p className="text-sm font-medium text-brand-900">{userName}</p>
        <p className="text-xs text-brand-400">{roleLabels[userRole]}</p>
        <div className="mt-3 flex gap-2">
          <Link href="/" className="btn-secondary flex-1 text-xs">
            ดูหน้าร้าน
          </Link>
          <form action={logout} className="flex-1">
            <button type="submit" className="btn-secondary w-full text-xs">
              ออกจากระบบ
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
