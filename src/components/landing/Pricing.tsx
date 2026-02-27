"use client";

import Link from "next/link";

const plans = [
    {
        name: "Starter",
        price: "€0",
        description: "Perfetto per chi sta iniziando.",
        features: ["1 Campagna", "Fino a 20 Video", "R2 Storage Gratuito", "Supporto Community"],
        cta: "Inizia Gratis",
        popular: false
    },
    {
        name: "Pro",
        price: "€29",
        period: "/mese",
        description: "Per business in crescita.",
        features: ["Campagne Illimitate", "Senza limiti di Video", "Custom Branding", "Email Support prioritario"],
        cta: "Passa a Pro",
        popular: true
    },
    {
        name: "Enterprise",
        price: "Custom",
        description: "Soluzioni su misura per grandi volumi.",
        features: ["Storage dedicato", "API Access", "Account Manager dedicato", "SLA Garantite"],
        cta: "Contattaci",
        popular: false
    }
];

export default function Pricing() {
    return (
        <section id="pricing" className="pricing-section">
            <div className="container">
                <div className="section-header align-center">
                    <h2 className="section-title">Prezzi chiari, nessun trucco</h2>
                    <p className="section-subtitle">Scegli il piano giusto per far crescere il tuo business.</p>
                </div>

                <div className="pricing-grid">
                    {plans.map((plan, index) => (
                        <div key={index} className={`pricing-card glass-card ${plan.popular ? "popular" : ""} animate-slide-up`} style={{ animationDelay: `${index * 0.1}s` }}>
                            {plan.popular && <div className="popular-badge">Più Scelto</div>}
                            <h3 className="plan-name">{plan.name}</h3>
                            <div className="plan-price">
                                <span className="price-value">{plan.price}</span>
                                {plan.period && <span className="price-period">{plan.period}</span>}
                            </div>
                            <p className="plan-description">{plan.description}</p>
                            <ul className="plan-features">
                                {plan.features.map((feature, fIndex) => (
                                    <li key={fIndex}>✨ {feature}</li>
                                ))}
                            </ul>
                            <Link href="/sign-up" className={`btn ${plan.popular ? "btn-primary" : "btn-secondary"} btn-large plan-cta`}>
                                {plan.cta}
                            </Link>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
