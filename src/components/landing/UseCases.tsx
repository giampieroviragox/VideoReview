"use client";

export default function UseCases() {
    return (
        <section className="section" id="use-cases" style={{ paddingTop: 0 }}>
            <div className="wrap">
                <div className="section-header reveal visible">
                    <div className="tag section-tag"><span className="tag-dot animate-pulse"></span>Use Cases</div>
                    <h2 className="heading section-title">Works for every business model.</h2>
                    <p className="section-sub">Fixed or dynamic rewards, manual or automatic invites &mdash; VR adapts to your workflow.</p>
                </div>
                <div className="use-cases-grid">
                    <div className="use-case-card card card-glow reveal visible">
                        <span className="use-case-icon">⚡</span>
                        <div className="use-case-kicker">SaaS &middot; freemium</div>
                        <h3 className="heading use-case-title">Free &rarr; Premium<br />with review reward</h3>
                        <p className="use-case-desc">Invite free users to record a video review. In exchange, automatically unlock 30 days of the Pro plan. Win-win: you get social proof, they get a free upgrade.</p>
                        <span className="use-case-pill">🎁 Reward: 30d Premium</span>
                        &nbsp;
                        <span className="use-case-pill">📈 +23% trial conversion</span>
                    </div>
                    <div className="use-case-card card card-glow reveal visible reveal-delay-1">
                        <span className="use-case-icon">🛒</span>
                        <div className="use-case-kicker">E-commerce &middot; post-purchase</div>
                        <h3 className="heading use-case-title">Automatic post-purchase<br />video UGC</h3>
                        <p className="use-case-desc">Automatic email 7 days after the order. The customer shows the product in use, receives a 15% coupon. The video goes directly to the product page and crushes purchase doubts.</p>
                        <span className="use-case-pill">💳 Reward: 15% coupon</span>
                        &nbsp;
                        <span className="use-case-pill">🎬 Authentic UGC</span>
                    </div>
                    <div className="use-case-card card card-glow reveal visible reveal-delay-2">
                        <span className="use-case-icon">🏢</span>
                        <div className="use-case-kicker">Agency &middot; B2B</div>
                        <h3 className="heading use-case-title">Video case studies<br />for agency clients</h3>
                        <p className="use-case-desc">Turn final client feedback into professional video case studies. Structure prompts, approve content, use the video in pitches and proposals. Close more deals with real proof.</p>
                        <span className="use-case-pill">🏆 No reward &mdash; relationship</span>
                        &nbsp;
                        <span className="use-case-pill">📋 Guided prompts</span>
                    </div>
                    <div className="use-case-card card card-glow reveal visible reveal-delay-3">
                        <span className="use-case-icon">🎓</span>
                        <div className="use-case-kicker">EdTech &middot; community</div>
                        <h3 className="heading use-case-title">Testimonials from<br />top students</h3>
                        <p className="use-case-desc">Identify users with highest engagement, invite them to tell their transformation story. Reward: access to advanced course or mentoring session. Powerful content for enrollment landing page.</p>
                        <span className="use-case-pill">🎓 Reward: advanced course</span>
                        &nbsp;
                        <span className="use-case-pill">✨ Emotional social proof</span>
                    </div>
                </div>
            </div>
        </section>
    );
}

