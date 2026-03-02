import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tellr.me — Collect video reviews from your clients",
  description:
    "Platform to collect authentic video reviews from your customers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <Script
          id="iubenda-loader"
          src="https://cdn.iubenda.com/iubenda.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
