import type { Metadata } from "next";
import { Prompt } from "next/font/google";
import "./globals.css";

const prompt = Prompt({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-prompt",
});

export const metadata: Metadata = {
  title: "Beauty POS — ระบบร้านเครื่องสำอางและคอร์สทรีตเมนต์",
  description: "ระบบขายหน้าร้าน จัดการสินค้า คอร์สทรีตเมนต์ สต๊อก และรายงานยอดขาย",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th" className={prompt.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
