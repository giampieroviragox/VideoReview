import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Collect video reviews and reward your customers.",
  description:
    "Tellr helps you collet the most convincing social proof you'll ever have.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: "/favicon.ico",
    apple: [{ url: "/favicon.png", sizes: "512x512" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <head>
          <Script id="microsoft-clarity" strategy="afterInteractive">
            {`(function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "vp9869dzfs");`}
          </Script>
          <Script
            id="umami-analytics"
            src="https://cloud.umami.is/script.js"
            data-website-id="faa22361-a993-4c91-88f1-af92c6eec6b5"
            strategy="afterInteractive"
            defer
          />
          <Script
            id="iubenda-widget"
            src="https://embeds.iubenda.com/widgets/12381140-145d-424a-80e6-74a69fe430b8.js"
            strategy="afterInteractive"
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
    </ClerkProvider>
  );
}
