"use client";

const steps = [
    {
        number: "01",
        icon: "✉️",
        title: "Invite your customers",
        description:
            "Create a video collection campaign in 2 clicks. Personalize the message, choose the customer segment, and define the optional reward to offer in exchange for the review.",
    },
    {
        number: "02",
        icon: "🎥",
        title: "Customer records & sends",
        description:
            "Direct link, no account needed. The customer records the video from the browser in 60 seconds — no app to download. Guided UI with optional prompts to maximize quality.",
    },
    {
        number: "03",
        icon: "🚀",
        title: "Publish, reuse, distribute",
        description:
            "Approve with one click, then share every review across your social channels, use it in your ads, or embed it directly into your site and landing pages.",
    },
];

export default function HowItWorks() {
    return (
        <section className="landing-how-section" id="how-it-works">
            <p className="landing-section-label">How it works</p>
            <h2 className="landing-section-title">
                Three steps.
                <br />
                Zero friction.
            </h2>
            <p className="landing-section-sub">
                Built for marketing and product teams that want results without technical overhead.
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
