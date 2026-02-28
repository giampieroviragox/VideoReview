"use client";

const featuresList = [
  {
    icon: "🎨",
    title: "Custom Branding",
    desc: "Customize every pixel of the widget and the collection page. Colors, fonts, and logo for a consistent brand experience.",
  },
  {
    icon: "⚙️",
    title: "Automation Workflows",
    desc: "Build automated flows for invites, follow-ups, and reminders. Trigger emails and actions through flexible workflow logic.",
  },
  {
    icon: "🛡️",
    title: "Smart Moderation",
    desc: "Approve videos before they go live. Automatic filters for audio/video quality and sensitive content.",
  },
  {
    icon: "📱",
    title: "Mobile Optimized",
    desc: "Native browser recording UI. Smooth, fast, and frictionless on any smartphone.",
  },
  {
    icon: "🔄",
    title: "API Automations",
    desc: "Connect VR to your CRM or billing system. Send rewards and unlock features automatically via webhook.",
  },
  {
    icon: "✨",
    title: "Embed Widgets",
    desc: "Carousels, grids, or wall of love. Universal integration with a single line of code in React, Webflow, Shopify.",
  },
];

export default function Features() {
  return (
    <section className="landing-features-section" id="features">
      <div className="landing-features-inner">
        <div className="landing-section-head">
          <div className="landing-section-label">Features</div>
          <h2 className="landing-section-title">
            Everything you need to scale your social proof.
          </h2>
          <p className="landing-section-sub">
            From automatic invitations to reusable workflows, VR is the all-in-one
            platform for video marketing.
          </p>
        </div>

        <div className="landing-features-grid">
          {featuresList.map((feature) => (
            <article key={feature.title} className="landing-feature-card">
              <div className="landing-feature-icon">{feature.icon}</div>
              <h3 className="landing-feature-title">{feature.title}</h3>
              <p className="landing-feature-desc">{feature.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
