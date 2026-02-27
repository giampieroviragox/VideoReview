"use client";

export default function CTA() {
    return (
        <section className="cta-section" id="cta">
            <div className="wrap">
                <div className="cta-box reveal visible">
                    <div className="tag" style={{ display: 'inline-flex', marginBottom: 'var(--s5)' }}><span className="tag-dot"></span>Inizia oggi</div>
                    <h2 className="display cta-title">La tua prossima vendita<br />la chiude un video.</h2>
                    <p className="cta-sub">Inserisci la tua email, sei live in 5 minuti.<br />14 giorni Pro gratis, nessuna carta richiesta.</p>
                    <div className="cta-form">
                        <input type="email" className="cta-input" placeholder="la-tua@email.com" />
                        <button className="btn btn-primary">Inizia gratis &rarr;</button>
                    </div>
                    <p className="cta-legal">Nessuno spam. Privacy garantita. Cancellazione con 1 click.</p>
                </div>
            </div>
        </section>
    );
}
