"use client";

const steps = [
    {
        number: "01",
        icon: "🏢",
        title: "Set up your brand",
        description:
            "Upload your logo, set your primary color. Your invite page is ready in under 5 minutes.",
    },
    {
        number: "02",
        icon: "📨",
        title: "Invite your customers",
        description:
            "Send a link via email, WhatsApp or anywhere. Optionally attach a reward to boost response rate.",
    },
    {
        number: "03",
        icon: "✨",
        title: "Collect & publish",
        description:
            "Review each video before it goes live. Embed anywhere with a single line of code.",
    },
];

export default function HowItWorks() {
    return (
        <section className="landing-how-section" id="how-it-works">
            <p className="landing-section-label">How it works</p>
            <h2 className="landing-section-title">
                Three steps.
                <br />
                That&apos;s really it.
            </h2>
            <p className="landing-section-sub">
                No complex flows, no integrations required. Set up once, collect forever.
            </p>

                <div className="landing-steps-grid">
                    {steps.map((step, index) => (
                        <div key={step.number} className="landing-step-card">
                            <div className="step-num">{step.number}</div>
                            <div className="step-icon">{step.icon}</div>
                            <h3 className="step-title">{step.title}</h3>
                            <p className="step-sub">{step.description}</p>
                            {index < steps.length - 1 && (
                                <div className="step-connector">→</div>
                            )}
                        </div>
                    ))}
                </div>
        </section>
    );
}
