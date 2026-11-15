import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aero — браузер в стиле Safari 27",
  description:
    "Браузер для Windows с интерфейсом Safari 27 (Golden Gate): liquid glass, вкладки-пилюли, тёмная тема, виджеты и кастомный установщик.",
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
