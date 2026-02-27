"use client";

export default function SocialProof() {
    return (
        <section className="social-proof-section" style={{ padding: 'var(--s6) 0', borderBottom: '1px solid var(--ink-3)' }}>
            <div className="wrap">
                <div style={{ textAlign: 'center', marginBottom: 'var(--s5)' }}>
                    <p className="label" style={{ color: 'var(--fog)', opacity: 0.6 }}>Private beta for ambitious teams</p>
                </div>
                <div className="logos-grid">
                    <div className="logo-placeholder">Do you want your logo here? Try me!</div>
                </div>
            </div>
        </section>
    );
}
