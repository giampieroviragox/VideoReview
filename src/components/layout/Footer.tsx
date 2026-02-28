"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="landing-footer">
      <div className="landing-footer-inner">
        <Link href="/" className="landing-footer-logo">
          <div className="landing-nav-logo-mark">▶</div>
          VR
        </Link>

        <ul className="landing-footer-links">
          <li><a href="#examples">Product</a></li>
          <li><a href="#pricing">Pricing</a></li>
          <li><a href="#how-it-works">Blog</a></li>
          <li><a href="#cta">Privacy</a></li>
          <li><a href="#cta">Terms</a></li>
        </ul>
      </div>

      <div className="landing-footer-copy">
        © {new Date().getFullYear()} VR — Video Review Platform. All rights reserved.
      </div>
    </footer>
  );
}
