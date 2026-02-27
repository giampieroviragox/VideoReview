"use client";

export default function UseCases() {
    return (
        <section className="section" id="casi-uso" style={{ paddingTop: 0 }}>
            <div className="wrap">
                <div className="section-header reveal visible">
                    <div className="tag section-tag"><span className="tag-dot animate-pulse"></span>Use Cases</div>
                    <h2 className="heading section-title">Funziona per ogni business model.</h2>
                    <p className="section-sub">Reward fissi o dinamici, inviti manuali o automatici &mdash; VR si adatta al tuo flusso.</p>
                </div>
                <div className="use-cases-grid">
                    <div className="use-case-card card card-glow reveal visible">
                        <span className="use-case-icon">⚡</span>
                        <div className="use-case-kicker">SaaS &middot; freemium</div>
                        <h3 className="heading use-case-title">Free &rarr; Premium<br />con review reward</h3>
                        <p className="use-case-desc">Invita gli utenti free a registrare una video recensione del prodotto. In cambio, sblocchi automaticamente 30 giorni di piano Pro. Win-win: tu ottieni social proof, loro un upgrade gratis.</p>
                        <span className="use-case-pill">🎁 Reward: 30gg Premium</span>
                        &nbsp;
                        <span className="use-case-pill">📈 +23% conversione trial</span>
                    </div>
                    <div className="use-case-card card card-glow reveal visible reveal-delay-1">
                        <span className="use-case-icon">🛒</span>
                        <div className="use-case-kicker">E-commerce &middot; post-acquisto</div>
                        <h3 className="heading use-case-title">Video UGC post<br />acquisto automatici</h3>
                        <p className="use-case-desc">Email automatica 7 giorni dopo l'ordine. Il cliente mostra il prodotto in uso, riceve un coupon del 15%. Il video va direttamente sulla product page e demolisce i dubbi d'acquisto.</p>
                        <span className="use-case-pill">💳 Reward: coupon 15%</span>
                        &nbsp;
                        <span className="use-case-pill">🎬 UGC autentico</span>
                    </div>
                    <div className="use-case-card card card-glow reveal visible reveal-delay-2">
                        <span className="use-case-icon">🏢</span>
                        <div className="use-case-kicker">Agency &middot; B2B</div>
                        <h3 className="heading use-case-title">Case study video<br />per i clienti agency</h3>
                        <p className="use-case-desc">Trasforma il feedback del cliente finale in case study video professionale. Struttura i prompt, approva il contenuto, usa il video in pitch e proposal. Chiudi più contratti con prove reali.</p>
                        <span className="use-case-pill">🏆 No reward &mdash; relazione</span>
                        &nbsp;
                        <span className="use-case-pill">📋 Guided prompts</span>
                    </div>
                    <div className="use-case-card card card-glow reveal visible reveal-delay-3">
                        <span className="use-case-icon">🎓</span>
                        <div className="use-case-kicker">EdTech &middot; community</div>
                        <h3 className="heading use-case-title">Testimonial dagli<br />studenti più attivi</h3>
                        <p className="use-case-desc">Identifica gli utenti con highest engagement, invitali a raccontare la loro trasformazione. Reward: accesso a corso avanzato o mentoring session. Contenuto potentissimo per la landing di iscrizione.</p>
                        <span className="use-case-pill">🎓 Reward: corso avanzato</span>
                        &nbsp;
                        <span className="use-case-pill">✨ Social proof emotivo</span>
                    </div>
                </div>
            </div>
        </section>
    );
}

