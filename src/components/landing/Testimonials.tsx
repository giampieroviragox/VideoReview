"use client";

export default function Testimonials() {
    return (
        <section className="section" id="testimonials">
            <div className="wrap">
                <div className="section-header reveal visible">
                    <div className="tag section-tag"><span className="tag-dot animate-pulse"></span>Testimonials</div>
                    <h2 className="heading section-title">Cosa dicono di noi (in video).</h2>
                    <p className="section-sub">Oltre 500 team usano VR per raccogliere social proof ogni giorno.</p>
                </div>
                <div className="testimonials-grid">
                    <div className="testimonial-card card reveal visible">
                        <div className="quote-icon">“</div>
                        <p className="testimonial-text">VR ha cambiato radicalmente il nostro modo di gestire le testimonianze. Otteniamo video di alta qualità dai clienti senza doverli inseguire per settimane.</p>
                        <div className="testimonial-author">
                            <div className="avatar">AM</div>
                            <div>
                                <div className="author-name">Alex M.</div>
                                <div className="author-role">Founder @ TechFlow</div>
                            </div>
                        </div>
                    </div>
                    <div className="testimonial-card card reveal visible reveal-delay-1">
                        <div className="quote-icon">“</div>
                        <p className="testimonial-text">L'integrazione con i reward è stata il game-changer. Il tasso di risposta alle nostre richieste di recensione è passato dal 5% al 22% in un mese.</p>
                        <div className="testimonial-author">
                            <div className="avatar" style={{ background: 'var(--brand)' }}>SL</div>
                            <div>
                                <div className="author-name">Sara L.</div>
                                <div className="author-role">Head of Growth @ ShopUp</div>
                            </div>
                        </div>
                    </div>
                    <div className="testimonial-card card reveal visible reveal-delay-2">
                        <div className="quote-icon">“</div>
                        <p className="testimonial-text">Poter approvare i video e vederli apparire all'istante sulla nostra landing page è magico. La fiducia dei nuovi utenti è schizzata alle stelle.</p>
                        <div className="testimonial-author">
                            <div className="avatar" style={{ background: 'var(--ink-4)' }}>DP</div>
                            <div>
                                <div className="author-name">Davide P.</div>
                                <div className="author-role">Product Manager @ EduBase</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
