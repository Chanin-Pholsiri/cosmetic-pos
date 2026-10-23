"use client";

export function PrintButton() {
  return (
    <button onClick={() => window.print()} className="btn-primary">
      🖨 พิมพ์ใบเสร็จ
    </button>
  );
}
