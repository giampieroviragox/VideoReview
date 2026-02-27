"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export default function Footer() {
    const [legalTooltip, setLegalTooltip] = useState<string | null>(null);
    const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const showLegalTooltip = () => {
        setLegalTooltip("Our legal is working. Please come back later.");

        if (tooltipTimerRef.current) {
            clearTimeout(tooltipTimerRef.current);
        }

        tooltipTimerRef.current = setTimeout(() => {
            setLegalTooltip(null);
            tooltipTimerRef.current = null;
        }, 2200);
    };

    useEffect(() => {
        return () => {
            if (tooltipTimerRef.current) {
                clearTimeout(tooltipTimerRef.current);
            }
        };
    }, []);

    return (
        <footer>
            <div className="wrap">
                <div className="footer-grid footer-grid-compact">
                    <div className="footer-brand">
                        <Link href="/" className="logo">
                            <div className="logo-mark">▶</div>
                            VR
                        </Link>
                        <p>The video review platform with rewards for teams that want authentic social proof and measurable results.</p>
                    </div>
                    <div className="footer-col">
                        <h5>Product</h5>
                        <ul>
                            <li><a href="#how-it-works">How it works</a></li>
                            <li><a href="#features">Features</a></li>
                            <li><a href="#pricing">Pricing</a></li>
                            <li><a href="#use-cases">Use Cases</a></li>
                        </ul>
                    </div>
                    <div className="footer-col footer-legal-col">
                        <h5>Legal</h5>
                        <ul>
                            <li>
                                <button type="button" className="footer-link-btn" onClick={showLegalTooltip}>
                                    Privacy Policy
                                </button>
                            </li>
                            <li>
                                <button type="button" className="footer-link-btn" onClick={showLegalTooltip}>
                                    Terms of Service
                                </button>
                            </li>
                        </ul>
                        {legalTooltip && <div className="footer-tooltip">{legalTooltip}</div>}
                    </div>
                </div>
                <div className="divider" style={{ margin: 'var(--s8) 0 var(--s5)' }}></div>
                <div className="footer-bottom">
                    <span>&copy; {new Date().getFullYear()} VR &mdash; Video Review Platform. All rights reserved.</span>
                    <span>Made with &hearts; in Italy</span>
                </div>
            </div>
        </footer>
    );
}
