"use client";

const features = [
    {
        icon: "📹",
        title: "Registrazione Semplice",
        description: "I tuoi clienti possono registrare un video direttamente dal browser, senza installare nulla. Mobile-first per massima comodità."
    },
    {
        icon: "⚡",
        title: "Velocità Incomparabile",
        description: "Caricamento diretto su Cloudflare R2 tramite presigned URLs. Performance garantite anche per video di grandi dimensioni."
    },
    {
        icon: "🛡️",
        title: "Sicurezza e Privacy",
        description: "Video salvati in modo sicuro in bucket privati. Solo tu decidi quali video rendere pubblici sulla tua landing."
    },
    {
        icon: "📊",
        title: "Dashboard Analitica",
        description: "Gestisci tutte le tue sottomissioni in un unico posto. Monitora l'efficacia delle tue campagne in tempo reale."
    }
];

export default function Features() {
    return (
        <section id="how-it-works" className="features-section">
            <div className="container">
                <div className="section-header align-center">
                    <h2 className="section-title">Perché scegliere la nostra piattaforma?</h2>
                    <p className="section-subtitle">
                        Abbiamo rimosso tutti gli ostacoli tecnici tra il tuo cliente e la sua recensione perfetta.
                    </p>
                </div>

                <div className="features-grid">
                    {features.map((feature, index) => (
                        <div key={index} className="feature-card glass-card animate-slide-up" style={{ animationDelay: `${index * 0.1}s` }}>
                            <div className="feature-icon">{feature.icon}</div>
                            <h3 className="feature-title">{feature.title}</h3>
                            <p className="feature-description">{feature.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
