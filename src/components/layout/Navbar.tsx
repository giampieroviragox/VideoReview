"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };

    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest("a");

      if (
        link &&
        link.hash &&
        link.origin === window.location.origin &&
        link.pathname === window.location.pathname
      ) {
        const id = link.hash.slice(1);
        const element = document.getElementById(id);

        if (element) {
          e.preventDefault();
          element.scrollIntoView({ behavior: "smooth" });
          // Update URL without jump
          window.history.pushState(null, "", link.hash);
          setMenuOpen(false);
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    document.addEventListener("click", handleAnchorClick);
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("click", handleAnchorClick);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) {
      document.body.classList.remove("no-scroll");
      document.documentElement.classList.remove("no-scroll");
      return;
    }

    const scrollY = window.scrollY;

    document.body.classList.add("no-scroll");
    document.documentElement.classList.add("no-scroll");
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";

    return () => {
      document.body.classList.remove("no-scroll");
      document.documentElement.classList.remove("no-scroll");
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.width = "";
      window.scrollTo(0, scrollY);
    };
  }, [menuOpen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <nav className={`${scrolled ? "scrolled" : ""} ${menuOpen ? "menu-open" : ""}`}>
      <div className="wrap">
        <div className="nav-inner">
          <Link href="/" className="logo">
            <div className="logo-mark">▶</div>
            VR
          </Link>

          <ul className="nav-links desktop-only" style={{ margin: 0, padding: 0 }}>
            <li><a href="#how-it-works">How it works</a></li>
            <li><a href="#features">Features</a></li>
            <li><a href="#pricing">Pricing</a></li>
            <li><a href="#use-cases">Use Cases</a></li>
          </ul>

          <div className="nav-cta desktop-only">
            <a href="#cta" className="btn btn-primary" style={{ padding: "10px 20px", fontSize: "11px" }}>
              Join the Waitlist &rarr;
            </a>
          </div>

          <button
            className="mobile-toggle"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? "Close Menu" : "Open Menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
          >
            <div className="hamburger">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </button>
        </div>
      </div>

      <div id="mobile-menu" className={`mobile-menu ${menuOpen ? "active" : ""}`}>
        <ul className="mobile-links">
          <li><a href="#how-it-works" onClick={() => setMenuOpen(false)}>How it works</a></li>
          <li><a href="#features" onClick={() => setMenuOpen(false)}>Features</a></li>
          <li><a href="#pricing" onClick={() => setMenuOpen(false)}>Pricing</a></li>
          <li><a href="#use-cases" onClick={() => setMenuOpen(false)}>Use Cases</a></li>
        </ul>
        <div className="mobile-cta">
          <a href="#cta" className="btn btn-primary" style={{ width: "100%" }} onClick={() => setMenuOpen(false)}>
            Join the Waitlist
          </a>
        </div>
      </div>
    </nav>
  );
}
