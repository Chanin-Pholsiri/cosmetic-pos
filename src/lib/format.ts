export function thb(value: number | string | { toString(): string }) {
  return Number(value).toLocaleString("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
  });
}

export function thDate(d: Date) {
  return d.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function thDateTime(d: Date) {
  return d.toLocaleString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const paymentLabels: Record<string, string> = {
  CASH: "เงินสด",
  TRANSFER: "โอนเงิน",
  PROMPTPAY: "พร้อมเพย์",
  CREDIT_CARD: "บัตรเครดิต",
};

export const stockMoveLabels: Record<string, string> = {
  RECEIVE: "รับเข้า",
  SALE: "ขายออก",
  ADJUST: "ปรับยอด",
  RETURN: "รับคืน",
};

export const enrollmentStatusLabels: Record<string, string> = {
  ACTIVE: "ใช้งานได้",
  COMPLETED: "ใช้ครบแล้ว",
  EXPIRED: "หมดอายุ",
};

export const appointmentStatusLabels: Record<string, string> = {
  SCHEDULED: "รอยืนยัน",
  CONFIRMED: "ยืนยันแล้ว",
  COMPLETED: "รับบริการแล้ว",
  CANCELLED: "ยกเลิก",
};

export const roleLabels: Record<string, string> = {
  ADMIN: "ผู้ดูแลระบบ",
  STAFF: "พนักงาน",
};
