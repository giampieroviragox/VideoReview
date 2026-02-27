"use client";

import { useState } from "react";

export default function FAQ() {
    const questions = [
        { q: "Come funziona il sistema di reward?", a: "Puoi scegliere tra reward automatici (coupon, trial premium, sconti) o manuali. Una volta approvato il video, VR sblocca il premio e lo invia via email o aggiorna il profilo utente via webhook." },
        { q: "I miei clienti devono scaricare un'app?", a: "No. La registrazione avviene direttamente nel browser del cliente, sia su mobile che su desktop. Zero frizioni, massima partecipazione." },
        { q: "Posso moderare i video prima che vadano live?", a: "Assolutamente sì. Tutti i video appaiono prima nella tua dashboard. Puoi approvarli, scartarli o richiedere una modifica al cliente." },
        { q: "Come posso integrare i video sul mio sito?", a: "VR genera uno snippet di codice che puoi incollare ovunque. Supportiamo carousel, griglie di testimonial e video wall che si caricano velocemente senza pesare sul SEO." },
        { q: "Quali integrazioni sono supportate?", a: "Supportiamo nativamente HubSpot, Zapier e Stripe. Grazie ai Webhook puoi collegare VR a qualsiasi altro software di email marketing o CRM." }
    ];

    const [openIndex, setOpenIndex] = useState<number | null>(null);

    return (
        <section className="section" id="faq" style={{ paddingTop: 0 }}>
            <div className="wrap" style={{ maxWidth: '800px' }}>
                <div className="section-header reveal visible">
                    <div className="tag section-tag"><span className="tag-dot animate-pulse"></span>FAQ</div>
                    <h2 className="heading section-title">Domande frequenti.</h2>
                    <p className="section-sub">Tutto quello che devi sapere per iniziare con VR.</p>
                </div>
                <div className="faq-list">
                    {questions.map((f, i) => (
                        <div key={i} className="faq-item reveal visible" onClick={() => setOpenIndex(openIndex === i ? null : i)} style={{ cursor: 'pointer' }}>
                            <div className="faq-question">
                                <span>{f.q}</span>
                                <span className="faq-icon">{openIndex === i ? '−' : '+'}</span>
                            </div>
                            {openIndex === i && (
                                <div className="faq-answer animate-fade-in">
                                    {f.a}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
