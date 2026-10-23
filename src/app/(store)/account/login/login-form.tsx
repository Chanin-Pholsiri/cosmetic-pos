"use client";

import { useActionState } from "react";
import { loginMember, type MemberAuthState } from "../actions";

export function MemberLoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState<MemberAuthState, FormData>(
    loginMember,
    {}
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="phone" className="label">
          เบอร์โทรศัพท์
        </label>
        <input
          id="phone"
          name="phone"
          className="input"
          placeholder="0812345678"
          inputMode="tel"
          autoComplete="tel"
          required
        />
      </div>
      <div>
        <label htmlFor="password" className="label">
          รหัสผ่าน
        </label>
        <input
          id="password"
          name="password"
          type="password"
          className="input"
          placeholder="••••••••"
          autoComplete="current-password"
          required
        />
      </div>

      {state.error && (
        <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-600">
          {state.error}
        </p>
      )}

      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
      </button>
    </form>
  );
}
