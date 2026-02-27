"use client";

export default function Features() {
    const featuresList = [
        { icon: "🎨", title: "Custom Branding", desc: "Customize every pixel of the widget and the collection page. Colors, fonts, and logo for a consistent brand experience." },
        { icon: "⚙️", title: "Automation Workflows", desc: "Build automated flows for invites, follow-ups, and reminders. Trigger emails and actions through flexible workflow logic." },
        { icon: "🛡️", title: "Smart Moderation", desc: "Approve videos before they go live. Automatic filters for audio/video quality and sensitive content." },
        { icon: "📱", title: "Mobile Optimized", desc: "Native browser recording UI. Smooth, fast, and frictionless on any smartphone." },
        { icon: "🔄", title: "API Automations", desc: "Connect VR to your CRM or billing system. Send rewards and unlock features automatically via webhook." },
        { icon: "✨", title: "Embed Widgets", desc: "Carousels, grids, or wall of love. Universal integration with a single line of code in React, Webflow, Shopify." }
    ];

    return (
        <section className="section" id="features">
            <div className="wrap">
                <div className="section-header reveal visible">
                    <div className="tag section-tag"><span className="tag-dot animate-pulse"></span>Features</div>
                    <h2 className="heading section-title">Everything you need to scale your social proof.</h2>
                    <p className="section-sub">From automatic invitations to reusable workflows, VR is the all-in-one platform for video marketing.</p>
                </div>
                <div className="features-grid">
                    {featuresList.map((f, i) => (
                        <div key={i} className={`feature-card card reveal visible reveal-delay-${i % 4}`}>
                            <div className="feature-icon-wrap">{f.icon}</div>
                            <h3 className="heading feature-title">{f.title}</h3>
                            <p className="feature-desc">{f.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
