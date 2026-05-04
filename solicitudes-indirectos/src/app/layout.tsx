import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/layout/Providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Solicitudes Indirectos — Baia Kristal",
  description: "Sistema de gestión de solicitudes de contratación indirecta",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="h-full">
      <body className={`${inter.className} h-full bg-gray-50 antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
