"use client";

import { useActionState } from "react";
import { registerMember, type MemberAuthState } from "../actions";

export function RegisterForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState<MemberAuthState, FormData>(
    registerMember,
    {}
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="name" className="label">
          ชื่อ-นามสกุล
        </label>
        <input
          id="name"
          name="name"
          className="input"
          placeholder="เช่น สมหญิง ใจดี"
          autoComplete="name"
          required
        />
      </div>
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
          maxLength={10}
          autoComplete="tel"
          required
        />
        <p className="mt-1 text-xs text-brand-400">
          ถ้าเคยเป็นลูกค้าหน้าร้าน ใช้เบอร์เดิมเพื่อดึงแต้มและคอร์สของคุณมาอัตโนมัติ
        </p>
      </div>
      <div>
        <label htmlFor="email" className="label">
          อีเมล (ถ้ามี)
        </label>
        <input
          id="email"
          name="email"
          type="email"
          className="input"
          autoComplete="email"
        />
      </div>
      <div>
        <label htmlFor="password" className="label">
          รหัสผ่าน (อย่างน้อย 8 ตัวอักษร)
        </label>
        <input
          id="password"
          name="password"
          type="password"
          className="input"
          minLength={8}
          autoComplete="new-password"
          required
        />
      </div>

      {state.error && (
        <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-600">
          {state.error}
        </p>
      )}

      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? "กำลังสมัคร..." : "สมัครสมาชิก"}
      </button>
    </form>
  );
}
