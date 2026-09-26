import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "I-AGILE",
  description: "La tua settimana, visibile e sostenibile.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
