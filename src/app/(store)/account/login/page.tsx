import Link from "next/link";
import { GoogleButton } from "../google-button";
import { MemberLoginForm } from "./login-form";

export default async function MemberLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const target = next ?? "/my";

  return (
    <div className="mx-auto max-w-sm space-y-5 py-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-brand-900">
          เข้าสู่ระบบสมาชิก
        </h1>
        <p className="mt-1 text-sm text-brand-500">
          เพื่อซื้อคอร์ส จองคิว และจัดการนัดหมายของคุณ
        </p>
      </div>

      {error === "google" && (
        <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-center text-sm text-red-600">
          เข้าสู่ระบบด้วย Google ไม่สำเร็จ กรุณาลองใหม่
        </p>
      )}

      <div className="card space-y-4">
        <MemberLoginForm next={target} />

        <div className="flex items-center gap-3 text-xs text-brand-300">
          <span className="h-px flex-1 bg-brand-100" />
          หรือ
          <span className="h-px flex-1 bg-brand-100" />
        </div>

        <GoogleButton next={target} />
      </div>

      <p className="text-center text-sm text-brand-500">
        ยังไม่มีบัญชี?{" "}
        <Link
          href={`/account/register?next=${encodeURIComponent(target)}`}
          className="font-medium text-brand-700 underline"
        >
          สมัครสมาชิก
        </Link>
      </p>
    </div>
  );
}
