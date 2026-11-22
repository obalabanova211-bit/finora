import type { Metadata, Viewport } from "next";
import "./globals.css";
import Nav from "../src/ui/Nav";

export const metadata: Metadata = {
  title: "Finora",
  description: "Учёт обязательств: кредиты, рассрочки, регулярные платежи",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <Nav />
        <div className="wrap">{children}</div>
      </body>
    </html>
  );
}
