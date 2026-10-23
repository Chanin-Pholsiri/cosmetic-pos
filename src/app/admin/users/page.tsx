import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { roleLabels, thDate } from "@/lib/format";
import { createUser, resetPassword, toggleUserActive } from "./actions";

export default async function UsersPage() {
  const admin = await requireAdmin();
  const users = await prisma.user.findMany({
    include: { _count: { select: { sales: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">ผู้ใช้งานระบบ</h1>
        <p className="mt-1 text-sm text-brand-500">
          จัดการบัญชีพนักงานและสิทธิ์การใช้งาน (เฉพาะผู้ดูแลระบบ)
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="card p-0">
          <table className="table-base">
            <thead>
              <tr>
                <th>ผู้ใช้</th>
                <th>สิทธิ์</th>
                <th className="text-right">ยอดขายที่ทำ</th>
                <th>สร้างเมื่อ</th>
                <th>สถานะ</th>
                <th className="text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className={u.active ? "" : "opacity-50"}>
                  <td>
                    <p className="font-medium">{u.name}</p>
                    <p className="text-xs text-brand-400">@{u.username}</p>
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        u.role === "ADMIN"
                          ? "bg-brand-600 text-white"
                          : "bg-brand-50 text-brand-700"
                      }`}
                    >
                      {roleLabels[u.role]}
                    </span>
                  </td>
                  <td className="text-right">{u._count.sales} บิล</td>
                  <td className="text-brand-500">{thDate(u.createdAt)}</td>
                  <td>
                    <span
                      className={`badge ${
                        u.active
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-red-50 text-red-600"
                      }`}
                    >
                      {u.active ? "ใช้งานได้" : "ถูกระงับ"}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center justify-end gap-2 text-xs">
                      {u.id !== admin.id && (
                        <form action={toggleUserActive}>
                          <input type="hidden" name="id" value={u.id} />
                          <button
                            className={
                              u.active
                                ? "text-red-500 hover:underline"
                                : "text-emerald-600 hover:underline"
                            }
                          >
                            {u.active ? "ระงับ" : "เปิดใช้"}
                          </button>
                        </form>
                      )}
                      <details className="relative">
                        <summary className="cursor-pointer text-brand-600 hover:underline">
                          รีเซ็ตรหัส
                        </summary>
                        <form
                          action={resetPassword}
                          className="absolute right-0 z-10 mt-1 flex w-64 gap-2 rounded-xl border border-brand-200 bg-white p-3 shadow-lg"
                        >
                          <input type="hidden" name="id" value={u.id} />
                          <input
                            name="password"
                            type="password"
                            minLength={8}
                            className="input py-1.5 text-xs"
                            placeholder="รหัสใหม่ (8+ ตัว)"
                            required
                          />
                          <button className="btn-primary shrink-0 px-3 py-1.5 text-xs">
                            บันทึก
                          </button>
                        </form>
                      </details>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card h-fit">
          <h2 className="mb-4 font-semibold">เพิ่มผู้ใช้ใหม่</h2>
          <form action={createUser} className="space-y-3">
            <div>
              <label className="label">ชื่อ-นามสกุล</label>
              <input name="name" className="input" required />
            </div>
            <div>
              <label className="label">ชื่อผู้ใช้ (สำหรับเข้าระบบ)</label>
              <input name="username" className="input" required />
            </div>
            <div>
              <label className="label">รหัสผ่าน (อย่างน้อย 8 ตัวอักษร)</label>
              <input
                name="password"
                type="password"
                minLength={8}
                className="input"
                required
              />
            </div>
            <div>
              <label className="label">สิทธิ์การใช้งาน</label>
              <select name="role" className="input" defaultValue="STAFF">
                <option value="STAFF">พนักงาน — ขายและจัดการข้อมูล</option>
                <option value="ADMIN">ผู้ดูแลระบบ — ทุกสิทธิ์</option>
              </select>
            </div>
            <button type="submit" className="btn-primary w-full">
              สร้างบัญชี
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
