"use client";

import Link from "next/link";

export default function Pricing() {
    return (
        <section className="section" id="pricing">
            <div className="wrap">
                <div className="section-header reveal visible" style={{ textAlign: 'center' }}>
                    <div className="tag section-tag" style={{ display: 'inline-flex' }}><span className="tag-dot animate-pulse"></span>Pricing</div>
                    <h2 className="heading section-title">Transparent plans,<br />for every growth stage.</h2>
                    <p className="section-sub" style={{ margin: '0 auto' }}>Start for free, scale when you need more volume and automation.</p>
                </div>

                <div className="pricing-grid">
                    {/* Starter */}
                    <div className="pricing-card card reveal visible">
                        <div className="plan-name">Starter</div>
                        <div className="plan-price">$0<span>/mo</span></div>
                        <p className="plan-desc">For explorers and small projects that want to test video social proof.</p>
                        <ul className="plan-features">
                            <li><span className="chk">✓</span> Up to 5 videos/mo</li>
                            <li><span className="chk">✓</span> Standard widget</li>
                            <li><span className="chk">✓</span> Basic moderation</li>
                            <li><span className="chk">✕</span> Automatic rewards</li>
                            <li><span className="chk">✕</span> Custom branding</li>
                        </ul>
                        <a href="#cta" className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center' }}>Start for free</a>
                    </div>

                    {/* Pro - Featured */}
                    <div className="pricing-card card card-glow reveal visible reveal-delay-1 featured">
                        <div className="pricing-popular">Most Popular</div>
                        <div className="plan-name">Pro</div>
                        <div className="plan-price">$49<span>/mo</span></div>
                        <p className="plan-desc">Everything you need to scale collection and automate rewards.</p>
                        <ul className="plan-features">
                            <li><span className="chk">✓</span> Unlimited videos</li>
                            <li><span className="chk">✓</span> Full reward engine</li>
                            <li><span className="chk">✓</span> Conversion Analytics</li>
                            <li><span className="chk">✓</span> Custom branding &amp; domain</li>
                            <li><span className="chk">✓</span> Embed + carousel widget</li>
                            <li><span className="chk">✓</span> HubSpot + Zapier</li>
                        </ul>
                        <a href="#cta" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Try 14 days for free &rarr;</a>
                    </div>

                    {/* Enterprise */}
                    <div className="pricing-card card reveal visible reveal-delay-2">
                        <div className="plan-name">Enterprise</div>
                        <div className="plan-price" style={{ fontSize: 'var(--text-3xl)' }}>Custom</div>
                        <p className="plan-desc">For companies with high volumes, multiple teams, and enterprise security requirements.</p>
                        <ul className="plan-features">
                            <li><span className="chk">✓</span> Multi-brand / workspace</li>
                            <li><span className="chk">✓</span> SSO &amp; SAML</li>
                            <li><span className="chk">✓</span> Guaranteed SLA</li>
                            <li><span className="chk">✓</span> Custom CRM integration</li>
                            <li><span className="chk">✓</span> Dedicated onboarding</li>
                            <li><span className="chk">✓</span> Account manager</li>
                        </ul>
                        <a href="#cta" className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center' }}>Contact us</a>
                    </div>
                </div>
            </div>
        </section>
    );
}
