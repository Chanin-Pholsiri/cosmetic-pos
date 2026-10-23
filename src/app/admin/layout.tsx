import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/sidebar";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getSession();
  if (!session) redirect("/login?next=/admin");

  return (
    <div className="flex min-h-screen">
      <Sidebar userName={session.user.name} userRole={session.user.role} />
      <main className="min-w-0 flex-1 p-6 lg:p-8 print:p-0">{children}</main>
    </div>
  );
}
