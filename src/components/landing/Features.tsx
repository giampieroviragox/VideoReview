"use client";

export default function Features() {
    const featuresList = [
        { icon: "🎨", title: "Custom Branding", desc: "Personalizza ogni pixel del widget e della pagina di raccolta. Colori, font e logo per una brand experience coerente." },
        { icon: "📊", title: "Conversion Tracking", desc: "Misura quante vendite vengono generate direttamente dai video. Analytics avanzati per ogni singola review." },
        { icon: "🛡️", title: "Moderazione Smart", desc: "Approva i video prima che vadano live. Filtri automatici per qualità audio/video e contenuti sensibili." },
        { icon: "📱", title: "Mobile Optimized", desc: "UI di registrazione nativa sul browser. Fluida, veloce e senza frizioni su qualsiasi smartphone." },
        { icon: "🔄", title: "Automazioni API", desc: "Collega VR al tuo CRM o sistema di billing. Invia reward e sblocca feature automaticamente via webhook." },
        { icon: "✨", title: "Embed Widgets", desc: "Carousel, griglie o wall of love. Integrazione universale con una singola riga di codice in React, Webflow, Shopify." }
    ];

    return (
        <section className="section" id="features">
            <div className="wrap">
                <div className="section-header reveal visible">
                    <div className="tag section-tag"><span className="tag-dot animate-pulse"></span>Features</div>
                    <h2 className="heading section-title">Tutto quello che serve per scalare la tua social proof.</h2>
                    <p className="section-sub">Dall'invito automatico all'analisi del ROI, VR è la piattaforma all-in-one per il video marketing.</p>
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
