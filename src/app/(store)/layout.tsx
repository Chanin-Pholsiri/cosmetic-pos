import Link from "next/link";
import { getMemberSession } from "@/lib/member-auth";
import { logoutMember } from "./account/actions";

export default async function StoreLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getMemberSession();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-brand-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
              ✦
            </span>
            <span>
              <span className="block text-sm font-semibold text-brand-900">
                Beauty Shop & Treatment
              </span>
              <span className="block text-xs text-brand-400">
                เครื่องสำอางและทรีตเมนต์ผิว
              </span>
            </span>
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link
              href="/"
              className="rounded-xl px-3 py-2 text-brand-700 hover:bg-brand-50"
            >
              หน้าแรก
            </Link>
            <Link
              href="/treatments"
              className="rounded-xl px-3 py-2 text-brand-700 hover:bg-brand-50"
            >
              คอร์สทรีตเมนต์
            </Link>
            <Link
              href="/my"
              className="rounded-xl px-3 py-2 text-brand-700 hover:bg-brand-50"
            >
              นัดหมายของฉัน
            </Link>

            {session ? (
              <span className="ml-2 flex items-center gap-2">
                <Link
                  href="/my"
                  className="rounded-xl bg-brand-50 px-3 py-2 text-xs font-medium text-brand-700"
                >
                  👤 {session.member.name}
                </Link>
                <form action={logoutMember}>
                  <button className="rounded-xl px-2 py-2 text-xs text-brand-400 hover:text-brand-700">
                    ออกจากระบบ
                  </button>
                </form>
              </span>
            ) : (
              <>
                <Link href="/account/login" className="btn-primary ml-2 py-2 text-xs">
                  เข้าสู่ระบบ
                </Link>
                <Link href="/account/register" className="btn-secondary py-2 text-xs">
                  สมัครสมาชิก
                </Link>
              </>
            )}
            <Link
              href="/login"
              className="ml-1 rounded-xl px-2 py-2 text-xs text-brand-300 hover:text-brand-600"
            >
              พนักงาน
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {children}
      </main>

      <footer className="border-t border-brand-100 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-xs text-brand-400">
          <p>© 2026 Beauty Shop & Treatment · เปิดทุกวัน 10:00–20:00 น.</p>
          <p>โทร 02-000-0000 · Line: @beautyshop</p>
        </div>
      </footer>
    </div>
  );
}
