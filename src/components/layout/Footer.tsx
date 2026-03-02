"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  const [showBlogTooltip, setShowBlogTooltip] = useState(false);

  return (
    <footer className="landing-footer">
      <div className="landing-footer-inner">
        <Link href="/" className="landing-footer-logo">
          <Image
            src="/tellr-logo-white.svg"
            alt="Tellr.me"
            className="landing-footer-logo-image"
            width={180}
            height={34}
          />
        </Link>

        <ul className="landing-footer-links">
          <li className="landing-footer-tooltip-wrap">
            <button
              type="button"
              className="landing-footer-link-button"
              onClick={() => setShowBlogTooltip((current) => !current)}
              aria-expanded={showBlogTooltip}
            >
              Blog
            </button>
            {showBlogTooltip ? (
              <span className="landing-footer-tooltip">
                Who click on the footer? Btw, we are working on it.
              </span>
            ) : null}
          </li>
          <li>
            <a
              href="https://www.iubenda.com/privacy-policy/93675872"
              className="iubenda-white iubenda-noiframe iubenda-embed"
              title="Privacy Policy "
            >
              Privacy Policy
            </a>
          </li>
          <li>
            <a
              href="https://www.iubenda.com/privacy-policy/93675872/cookie-policy"
              className="iubenda-white iubenda-noiframe iubenda-embed"
              title="Cookie Policy "
            >
              Cookie Policy
            </a>
          </li>
        </ul>
      </div>

      <div className="landing-footer-copy">
        © 2026 Tellr.me — Built in Italy. All rights reserved.
      </div>
    </footer>
  );
}
