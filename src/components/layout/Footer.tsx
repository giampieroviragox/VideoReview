"use client";

import Image from "next/image";
import Link from "next/link";

export default function Footer() {
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
          <li><a href="#examples">Product</a></li>
          <li><a href="#pricing">Pricing</a></li>
          <li><a href="#how-it-works">Blog</a></li>
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
          <li><a href="#cta">Terms</a></li>
        </ul>
      </div>

      <div className="landing-footer-copy">
        © {new Date().getFullYear()} Tellr.me — Video Review Platform. All rights reserved.
      </div>
    </footer>
  );
}
