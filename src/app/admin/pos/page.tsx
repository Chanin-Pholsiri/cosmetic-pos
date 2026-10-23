import { prisma } from "@/lib/db";
import { PosClient } from "./pos-client";

export default async function PosPage() {
  const [products, courses, members] = await Promise.all([
    prisma.product.findMany({
      where: { active: true },
      include: { category: true },
      orderBy: { name: "asc" },
    }),
    prisma.course.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.member.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <PosClient
      products={products.map((p) => ({
        id: p.id,
        sku: p.sku,
        name: p.name,
        price: Number(p.price),
        stockQty: p.stockQty,
        category: p.category?.name ?? "ไม่มีหมวดหมู่",
      }))}
      courses={courses.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        price: Number(c.price),
        totalSessions: c.totalSessions,
      }))}
      members={members.map((m) => ({
        id: m.id,
        code: m.code,
        name: m.name,
        phone: m.phone ?? "-",
        points: m.points,
      }))}
    />
  );
}
