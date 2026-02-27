import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Video Reviews — Raccogli video recensioni dai tuoi clienti",
  description:
    "Piattaforma per raccogliere video recensioni autentiche dai tuoi clienti.",
};

import { ClerkProvider } from "@clerk/nextjs";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="it">
        <body className={inter.variable}>{children}</body>
      </html>
    </ClerkProvider>
  );
}
