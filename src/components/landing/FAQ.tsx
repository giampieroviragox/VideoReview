"use client";

import { useState } from "react";

export default function FAQ() {
    const questions = [
        { q: "How does the reward system work?", a: "You can choose between automatic rewards (coupons, premium trials, discounts) or manual ones. Once the video is approved, VR unlocks the prize and sends it via email or updates the user profile via webhook." },
        { q: "Do my customers need to download an app?", a: "No. Recording happens directly in the customer's browser, on both mobile and desktop. Zero friction, maximum participation." },
        { q: "Can I moderate videos before they go live?", a: "Absolutely. All videos appear in your dashboard first. You can approve them, reject them, or request an edit from the customer." },
        { q: "How can I integrate videos on my site?", a: "VR generates a code snippet that you can paste anywhere. We support carousels, testimonial grids, and video walls that load fast without impacting SEO." },
        { q: "Which integrations are supported?", a: "We natively support HubSpot, Zapier, and Stripe. Thanks to Webhooks, you can connect VR to any other email marketing software or CRM." }
    ];

    const [openIndex, setOpenIndex] = useState<number | null>(null);

    return (
        <section className="section" id="faq" style={{ paddingTop: 0 }}>
            <div className="wrap" style={{ maxWidth: '800px' }}>
                <div className="section-header reveal visible">
                    <div className="tag section-tag"><span className="tag-dot animate-pulse"></span>FAQ</div>
                    <h2 className="heading section-title">Frequently Asked Questions.</h2>
                    <p className="section-sub">Everything you need to know to get started with VR.</p>
                </div>
                <div className="faq-list">
                    {questions.map((f, i) => (
                        <div key={i} className="faq-item reveal visible" onClick={() => setOpenIndex(openIndex === i ? null : i)} style={{ cursor: 'pointer' }}>
                            <div className="faq-question">
                                <span>{f.q}</span>
                                <span className="faq-icon">{openIndex === i ? '−' : '+'}</span>
                            </div>
                            {openIndex === i && (
                                <div className="faq-answer animate-fade-in">
                                    {f.a}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
