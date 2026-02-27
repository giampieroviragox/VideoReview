"use client";

export default function SocialProof() {
    return (
        <section className="social-proof-section" style={{ padding: 'var(--s6) 0', borderBottom: '1px solid var(--ink-3)' }}>
            <div className="wrap">
                <div style={{ textAlign: 'center', marginBottom: 'var(--s5)' }}>
                    <p className="label" style={{ color: 'var(--fog)', opacity: 0.6 }}>Social proof per oltre 500+ team ambiziosi</p>
                </div>
                <div className="logos-grid">
                    <div className="logo-item">TechFlow</div>
                    <div className="logo-item">ShopUp</div>
                    <div className="logo-item">EduBase</div>
                    <div className="logo-item">GrowthMind</div>
                    <div className="logo-item">CloudScale</div>
                    <div className="logo-item">DevOps.io</div>
                </div>
            </div>
        </section>
    );
}
