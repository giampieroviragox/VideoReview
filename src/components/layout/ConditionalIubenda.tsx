"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";

function cleanupIubendaNodes() {
  const selectors = [
    'script[src*="iubenda"]',
    'iframe[src*="iubenda"]',
    '[id*="iubenda"]',
    '[class*="iubenda"]',
  ];

  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    elements.forEach((node) => {
      if (node instanceof HTMLElement) {
        node.style.display = "none";
      }
      if (node.tagName === "SCRIPT" || node.tagName === "IFRAME") {
        node.remove();
      }
    });
  }
}

export default function ConditionalIubenda() {
  const pathname = usePathname();
  const isDashboard = pathname.startsWith("/dashboard");

  useEffect(() => {
    if (isDashboard) {
      cleanupIubendaNodes();
    }
  }, [isDashboard]);

  if (isDashboard) {
    return null;
  }

  return (
    <>
      <Script
        id="iubenda-widget"
        src="https://embeds.iubenda.com/widgets/12381140-145d-424a-80e6-74a69fe430b8.js"
        strategy="afterInteractive"
      />
      <Script
        id="iubenda-loader"
        src="https://cdn.iubenda.com/iubenda.js"
        strategy="afterInteractive"
      />
    </>
  );
}
