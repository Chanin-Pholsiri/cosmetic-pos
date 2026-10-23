import Link from "next/link";
import { GoogleButton } from "../google-button";
import { RegisterForm } from "./register-form";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const target = next ?? "/my";

  return (
    <div className="mx-auto max-w-sm space-y-5 py-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-brand-900">สมัครสมาชิก</h1>
        <p className="mt-1 text-sm text-brand-500">
          รับสิทธิ์ซื้อคอร์สออนไลน์ สะสมแต้ม และจัดการนัดหมาย
        </p>
      </div>

      <div className="card space-y-4">
        <RegisterForm next={target} />

        <div className="flex items-center gap-3 text-xs text-brand-300">
          <span className="h-px flex-1 bg-brand-100" />
          หรือ
          <span className="h-px flex-1 bg-brand-100" />
        </div>

        <GoogleButton next={target} />
      </div>

      <p className="text-center text-sm text-brand-500">
        มีบัญชีอยู่แล้ว?{" "}
        <Link
          href={`/account/login?next=${encodeURIComponent(target)}`}
          className="font-medium text-brand-700 underline"
        >
          เข้าสู่ระบบ
        </Link>
      </p>
    </div>
  );
}
