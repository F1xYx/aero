import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aero — браузер с интерфейсом Safari 27 для Windows",
  description:
    "Жидкое стекло, вкладки-пилюли Golden Gate и живые виджеты: Aero приносит Safari 27 на Windows на движке Chromium. Установщик или портативная версия без установки.",
  icons: {
    icon: "/aero-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0b0e",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="antialiased">{children}</body>
    </html>
  );
}
