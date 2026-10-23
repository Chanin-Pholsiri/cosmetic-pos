import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // ผู้ใช้งานเริ่มต้น
  await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      passwordHash: await bcrypt.hash("admin1234", 10),
      name: "ผู้ดูแลระบบ",
      role: "ADMIN",
    },
  });
  await prisma.user.upsert({
    where: { username: "staff" },
    update: {},
    create: {
      username: "staff",
      passwordHash: await bcrypt.hash("staff1234", 10),
      name: "พนักงานขาย",
      role: "STAFF",
    },
  });

  // หมวดหมู่สินค้า
  const categories = ["สกินแคร์", "เมคอัพ", "บอดี้แคร์", "เซรั่ม/ทรีตเมนต์"];
  for (const name of categories) {
    await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
  }
  const cat = Object.fromEntries(
    (await prisma.category.findMany()).map((c) => [c.name, c.id])
  );

  // สินค้าตัวอย่าง
  const products = [
    { sku: "SK-001", name: "ครีมบำรุงผิวหน้า Hydra Boost 50g", categoryId: cat["สกินแคร์"], price: 890, cost: 450, stockQty: 24 },
    { sku: "SK-002", name: "โฟมล้างหน้า Gentle Clean 150ml", categoryId: cat["สกินแคร์"], price: 320, cost: 150, stockQty: 40 },
    { sku: "SK-003", name: "กันแดด SPF50+ PA++++ 30ml", categoryId: cat["สกินแคร์"], price: 590, cost: 280, stockQty: 30 },
    { sku: "SR-001", name: "เซรั่มวิตามินซี 20% 30ml", categoryId: cat["เซรั่ม/ทรีตเมนต์"], price: 1290, cost: 620, stockQty: 15 },
    { sku: "SR-002", name: "เซรั่มไฮยาลูรอน 30ml", categoryId: cat["เซรั่ม/ทรีตเมนต์"], price: 990, cost: 480, stockQty: 3 },
    { sku: "MK-001", name: "ลิปสติกแมท รุ่น Velvet #04", categoryId: cat["เมคอัพ"], price: 450, cost: 200, stockQty: 18 },
    { sku: "MK-002", name: "คุชชั่นรองพื้น SPF35 #21", categoryId: cat["เมคอัพ"], price: 790, cost: 380, stockQty: 12 },
    { sku: "BD-001", name: "โลชั่นบำรุงผิวกาย Shea Butter 250ml", categoryId: cat["บอดี้แคร์"], price: 390, cost: 180, stockQty: 25 },
  ];
  for (const p of products) {
    await prisma.product.upsert({ where: { sku: p.sku }, update: {}, create: p });
  }

  // คอร์สทรีตเมนต์
  const courses = [
    { code: "CS-001", name: "คอร์สทรีตเมนต์หน้าใส 5 ครั้ง", description: "ทรีตเมนต์ผิวหน้า ฟื้นฟูผิวใส ลดริ้วรอย", price: 4500, totalSessions: 5, validityDays: 180 },
    { code: "CS-002", name: "คอร์สทรีตเมนต์หน้าใส 10 ครั้ง", description: "ทรีตเมนต์ผิวหน้าแบบคุ้มค่า พร้อมมาส์กทองคำ", price: 8000, totalSessions: 10, validityDays: 365 },
    { code: "CS-003", name: "คอร์สนวดหน้ายกกระชับ 3 ครั้ง", description: "นวดยกกระชับใบหน้า ลดความหย่อนคล้อย", price: 2700, totalSessions: 3, validityDays: 90 },
    { code: "CS-004", name: "ทรีตเมนต์รายครั้ง (Single)", description: "ทรีตเมนต์ผิวหน้า 1 ครั้ง", price: 1200, totalSessions: 1, validityDays: 30 },
  ];
  for (const c of courses) {
    await prisma.course.upsert({ where: { code: c.code }, update: {}, create: c });
  }

  // ลูกค้าตัวอย่าง
  const members = [
    { code: "M-0001", name: "คุณสมหญิง ใจดี", phone: "0812345678", points: 120 },
    { code: "M-0002", name: "คุณวรรณา สวยงาม", phone: "0898765432", points: 45 },
  ];
  for (const m of members) {
    await prisma.member.upsert({ where: { phone: m.phone }, update: {}, create: m });
  }

  console.log("✅ Seed เรียบร้อย — login ด้วย admin/admin1234 หรือ staff/staff1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
