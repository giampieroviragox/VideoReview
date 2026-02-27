"use client";

export default function HowItWorks() {
    return (
        <section className="section" id="come-funziona">
            <div className="wrap">
                <div className="section-header reveal visible">
                    <div className="tag section-tag"><span className="tag-dot animate-pulse"></span>Come funziona</div>
                    <h2 className="heading section-title">Tre step. Zero frizioni.</h2>
                    <p className="section-sub">Costruito per team marketing e prodotto che vogliono risultati senza overhead tecnico.</p>
                </div>
                <div className="steps-grid">
                    <div className="step-card card card-glow reveal visible">
                        <div className="step-num">01</div>
                        <h3 className="step-title">Invita i tuoi clienti</h3>
                        <p className="step-desc">Crea una campagna di raccolta video in 2 click. Personalizza il messaggio, scegli il segmento di clienti e definisci il reward opzionale da offrire in cambio della recensione.</p>
                    </div>
                    <div className="step-card card card-glow reveal visible reveal-delay-1">
                        <div className="step-num">02</div>
                        <h3 className="step-title">Il cliente registra &amp; invia</h3>
                        <p className="step-desc">Link diretto, no account. Il cliente registra il video dal browser in 60 secondi &mdash; nessuna app da scaricare. UI guidata con prompt opzionali per massimizzare la qualità.</p>
                    </div>
                    <div className="step-card card card-glow reveal visible reveal-delay-2">
                        <div className="step-num">03</div>
                        <h3 className="step-title">Pubblica, misura, converti</h3>
                        <p className="step-desc">Approva con un click, embed ovunque in 1 riga di codice. Analytics integrati mostrano il reale impatto sulle conversioni di ogni video review.</p>
                    </div>
                </div>
            </div>
        </section>
    );
}

