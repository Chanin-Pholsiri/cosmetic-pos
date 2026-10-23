// สร้างตารางงวดผ่อนชำระ: งวดแรกชำระทันที งวดถัดไปครบกำหนดทุก 1 เดือน
// จำนวนเงินแบ่งเท่ากัน เศษสตางค์ไปรวมที่งวดสุดท้าย
export function buildInstallments(total: number, count: number, start = new Date()) {
  const base = Math.floor((total / count) * 100) / 100;
  const last = Math.round((total - base * (count - 1)) * 100) / 100;

  return Array.from({ length: count }, (_, i) => {
    const dueDate = new Date(start);
    dueDate.setMonth(dueDate.getMonth() + i);
    return {
      seq: i + 1,
      amount: i === count - 1 ? last : base,
      dueDate,
    };
  });
}
