import Link from "next/link";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream-50 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-2xl text-white">
            ✦
          </div>
          <h1 className="text-2xl font-semibold text-brand-900">Beauty POS</h1>
          <p className="mt-1 text-sm text-brand-500">
            ระบบร้านเครื่องสำอางและคอร์สทรีตเมนต์
          </p>
        </div>

        {next === "/admin/pos" && (
          <p className="mb-4 rounded-xl bg-amber-50 px-3.5 py-2.5 text-center text-sm text-amber-700">
            กรุณาเข้าสู่ระบบก่อนทำรายการขาย — ตะกร้าของคุณยังอยู่ครบ
          </p>
        )}

        <LoginForm next={next ?? "/admin"} />

        <div className="mt-4 space-y-1 text-center text-xs text-brand-400">
          <p>บัญชีทดสอบ (ผู้ดูแลระบบ): admin / admin1234</p>
          <p>บัญชีทดสอบ (พนักงาน): staff / staff1234</p>
        </div>

        <p className="mt-4 text-center">
          <Link href="/" className="text-sm text-brand-500 hover:text-brand-700">
            ← กลับไปหน้าร้านสำหรับลูกค้า
          </Link>
        </p>
      </div>
    </main>
  );
}
