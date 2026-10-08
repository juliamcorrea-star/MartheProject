import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MARTHE — Sobreviva ao planeta vermelho",
  description: "Construa uma base em Marte e use a geometria para sobreviver.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
