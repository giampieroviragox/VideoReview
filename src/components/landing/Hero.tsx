"use client";

import { useState } from "react";
import DemoModal from "@/components/landing/DemoModal";

export default function Hero() {
    const [demoOpen, setDemoOpen] = useState(false);

    return (
        <>
            <section className="landing-hero">
                <div className="landing-hero-badge">
                    <span className="landing-hero-badge-dot">▶</span>
                    Video Review Platform
                </div>

                <h1 className="landing-hero-title">
                    Your customers
                    <br />
                    have a <em>story</em>
                    <br />
                    to tell.
                </h1>

                <p className="landing-hero-sub">
                    Invite them, offer a reward, collect their video. The most
                    convincing social proof you&apos;ll ever have.
                </p>

                <div className="landing-hero-cta">
                    <a href="#cta" className="landing-hero-primary">
                        Start for free <span aria-hidden="true">&rarr;</span>
                    </a>
                    <button
                        type="button"
                        className="landing-hero-secondary"
                        onClick={() => setDemoOpen(true)}
                    >
                        See a demo
                    </button>
                </div>

                <p className="landing-hero-proof">
                    No credit card required · 14-day free trial
                </p>
            </section>

            {demoOpen && <DemoModal onClose={() => setDemoOpen(false)} />}
        </>
    );
}
