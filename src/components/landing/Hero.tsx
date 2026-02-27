"use client";

import Link from "next/link";

export default function Hero() {
    return (
        <section className="hero">
            <div className="hero-bg">
                <div className="hero-grid"></div>
                <div className="hero-blob hero-blob-1"></div>
                <div className="hero-blob hero-blob-2"></div>
            </div>

            <div className="wrap" style={{ display: 'flex', alignItems: 'center', gap: 'var(--s8)', position: 'relative' }}>
                <div className="hero-content">
                    <div className="tag hero-tag reveal visible" style={{ transitionDelay: '0.1s' }}>
                        <span className="tag-dot animate-pulse"></span>
                        Video Review Platform
                    </div>
                    <h1 className="display hero-title reveal visible" style={{ transitionDelay: '0.2s' }}>
                        Collect<br />
                        <em className="animate-shimmer">video reviews</em><br />
                        from your clients and reward them.
                    </h1>
                    <p className="hero-sub reveal visible" style={{ transitionDelay: '0.3s' }}>
                        Invite your customers, offer a tailored <strong>reward</strong>
                        and transform their voice into irresistible social proof.
                        No scripts, no fiction &mdash; just truth that converts.
                    </p>
                    <div className="hero-actions reveal visible">
                        <a href="#cta" className="btn btn-primary btn-lg">Join the Waitlist <span style={{ opacity: 0.7 }}>&rarr;</span></a>
                        <a href="#how-it-works" className="btn btn-ghost btn-lg">View demo</a>
                    </div>
                    <div className="hero-note reveal visible">
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" style={{ marginRight: '4px' }}>
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
                            <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                        No credit card required &nbsp;&middot;&nbsp; 5-minute setup &nbsp;&middot;&nbsp; 14-day trial
                    </div>
                </div>

                {/* Hero visual mockup */}
                <div className="hero-visual animate-float">
                    <div style={{ background: 'var(--ink-2)', border: '1px solid var(--ink-3)', borderRadius: 'var(--r4)', padding: 'var(--s5)', boxShadow: 'var(--shadow-lg)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--s4)' }}>
                            <span className="label" style={{ color: 'var(--fog)' }}>New review</span>
                            <span style={{ background: 'rgba(61,255,160,.12)', color: 'var(--success)', padding: '3px 10px', borderRadius: 'var(--r5)', fontSize: '11px', fontWeight: 600 }}>Live</span>
                        </div>
                        <div style={{ background: '#000', borderRadius: 'var(--r3)', aspectRatio: '16/9', display: 'grid', placeItems: 'center', marginBottom: 'var(--s4)', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,#1a1a2e,#16213e)' }}></div>
                            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--brand)', display: 'grid', placeItems: 'center', fontSize: '22px', position: 'relative', zIndex: 1, color: '#fff' }}>▶</div>
                            <div style={{ position: 'absolute', bottom: '12px', left: '12px', right: '12px', height: '3px', background: 'rgba(255,255,255,.15)', borderRadius: '2px', zIndex: 1 }}>
                                <div style={{ width: '42%', height: '100%', background: 'var(--brand)', borderRadius: '2px' }}></div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)', marginBottom: 'var(--s4)' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg,var(--brand),#7B4FFF)', display: 'grid', placeItems: 'center', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '13px', color: '#fff' }}>M</div>
                            <div>
                                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: '13px', color: 'var(--white)' }}>Mark R.</div>
                                <div style={{ fontSize: '11px', color: 'var(--fog)' }}>Customer for 6 months &middot; ★★★★★</div>
                            </div>
                            <div style={{ marginLeft: 'auto', background: 'rgba(255,95,61,.12)', border: '1px solid var(--brand-rim)', padding: '4px 12px', borderRadius: 'var(--r5)', fontSize: '11px', color: 'var(--brand-2)', fontWeight: 600, fontFamily: 'Syne, sans-serif' }}>+30d Pro</div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                            <div style={{ background: 'var(--ink-3)', borderRadius: 'var(--r2)', padding: '8px', textAlign: 'center' }}>
                                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '18px', color: 'var(--white)' }}>4.9</div>
                                <div style={{ fontSize: '10px', color: 'var(--fog)' }}>Avg Rating</div>
                            </div>
                            <div style={{ background: 'var(--ink-3)', borderRadius: 'var(--r2)', padding: '8px', textAlign: 'center' }}>
                                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '18px', color: 'var(--brand)' }}>87%</div>
                                <div style={{ fontSize: '10px', color: 'var(--fog)' }}>Response rate</div>
                            </div>
                            <div style={{ background: 'var(--ink-3)', borderRadius: 'var(--r2)', padding: '8px', textAlign: 'center' }}>
                                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '18px', color: 'var(--success)' }}>+23%</div>
                                <div style={{ fontSize: '10px', color: 'var(--fog)' }}>Conversions</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
