"use client";

export default function Pricing() {
    return (
        <section className="section" id="pricing">
            <div className="wrap">
                <div className="section-header reveal visible" style={{ textAlign: 'center' }}>
                    <div className="tag section-tag" style={{ display: 'inline-flex' }}><span className="tag-dot animate-pulse"></span>Pricing</div>
                    <h2 className="heading section-title">Private beta access,<br />free for early teams.</h2>
                    <p className="section-sub" style={{ margin: '0 auto' }}>Everyone who joins the waitlist and gets into the private beta unlocks the full PRO plan for free.</p>
                </div>

                <div className="pricing-grid" style={{ gridTemplateColumns: 'minmax(280px, 520px)', justifyContent: 'center' }}>
                    <div className="pricing-card card card-glow reveal visible reveal-delay-1 featured">
                        <div className="pricing-popular">Private Beta</div>
                        <div className="plan-name">Pro</div>
                        <div className="plan-price">$0<span>/free during beta</span></div>
                        <p className="plan-desc">The complete PRO plan unlocked for every approved waitlist member during the private beta.</p>
                        <ul className="plan-features">
                            <li><span className="chk">✓</span> Unlimited videos</li>
                            <li><span className="chk">✓</span> Full reward engine</li>
                            <li><span className="chk">✓</span> Analytics</li>
                            <li><span className="chk">✓</span> Custom branding</li>
                            <li><span className="chk">✓</span> Embed and widgets</li>
                            <li><span className="chk">✓</span> Unlimited webhook integrations</li>
                        </ul>
                        <a href="#cta" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Join the waitlist &rarr;</a>
                    </div>
                </div>
            </div>
        </section>
    );
}
