"use client";

const featurePills = [
    {
        icon: "🎨",
        title: "Your brand, your colors",
        copy: "Logo, color and company name. The experience is entirely yours.",
    },
    {
        icon: "🎁",
        title: "Reward is optional",
        copy: "Activate it only when you want. Discounts, credits, vouchers — you decide.",
    },
    {
        icon: "❓",
        title: "Ask or leave it open",
        copy: "Set a specific question or let customers decide freely what to say.",
    },
    {
        icon: "📱",
        title: "Works on any device",
        copy: "Mobile, tablet or desktop. No app required, just a link.",
    },
];

export default function SocialProof() {
    return (
        <section className="landing-preview-section" id="examples">
            <p className="landing-section-label">What your customer sees</p>
            <h2 className="landing-section-title">Beautiful on every brand.</h2>
            <p className="landing-section-sub">
                The experience adapts to your company colors and logo. Your
                customers see your brand, not ours.
            </p>

            <div className="landing-phone-wrap">
                <div className="landing-phone-frame">
                    <div className="landing-phone-bar">
                        <div className="landing-phone-dot" style={{ background: "#FF5C35", opacity: 0.5 }}></div>
                        <div className="landing-phone-dot" style={{ background: "#FFB347", opacity: 0.5 }}></div>
                        <div className="landing-phone-dot" style={{ background: "#2ECC71", opacity: 0.5 }}></div>
                    </div>

                    <div className="landing-phone-body">
                        <div className="landing-invite-header">
                            <div className="landing-invite-logo" style={{ background: "#F0F4FF", color: "#3B5BDB" }}>
                                AC
                            </div>
                            <div>
                                <div className="landing-invite-from">Hai ricevuto un invito da</div>
                                <div className="landing-invite-company">ACME Corp</div>
                            </div>
                        </div>

                        <div className="landing-invite-question">
                            <div className="landing-invite-q-label">La domanda</div>
                            <div className="landing-invite-q-text">Cosa ti ha convinto a sceglierci?</div>
                        </div>

                        <div className="landing-invite-recorder">
                            <div className="landing-recorder-badge">
                                <div className="landing-rec-dot"></div>
                                00:04
                            </div>
                            <div className="landing-recorder-pulse">▶</div>
                        </div>

                        <div className="landing-reward-card">
                            <div className="landing-reward-emoji">🎁</div>
                            <div>
                                <div className="landing-reward-label">Il tuo reward</div>
                                <div className="landing-reward-val">30 giorni gratis</div>
                            </div>
                        </div>

                        <div className="landing-invite-cta-btn" style={{ background: "#3B5BDB" }}>
                            Rispondi e ricevi il reward →
                        </div>

                        <div className="landing-powered">Powered by VR</div>
                    </div>
                </div>

                <div className="landing-feature-stack">
                    {featurePills.map((pill) => (
                        <div key={pill.title} className="landing-feature-pill">
                            <div className="landing-feature-pill-icon">{pill.icon}</div>
                            <div className="landing-feature-pill-title">{pill.title}</div>
                            <div className="landing-feature-pill-sub">{pill.copy}</div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
