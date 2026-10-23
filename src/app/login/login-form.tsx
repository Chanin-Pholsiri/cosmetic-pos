"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    login,
    {}
  );

  return (
    <form action={formAction} className="card space-y-4">
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="username" className="label">
          ชื่อผู้ใช้
        </label>
        <input
          id="username"
          name="username"
          className="input"
          placeholder="admin"
          autoComplete="username"
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
