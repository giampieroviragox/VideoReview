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
      <head>
        <Script
          id="iubenda-widget"
          src="https://embeds.iubenda.com/widgets/12381140-145d-424a-80e6-74a69fe430b8.js"
          strategy="beforeInteractive"
        />
      </head>
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
