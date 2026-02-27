"use client";

import { useState } from "react";

const faqs = [
    {
        question: "I miei clienti devono installare un'app?",
        answer: "No, assolutamente. La pagina di raccolta funziona direttamente nel browser di qualsiasi dispositivo (smartphone, tablet o PC) senza installazioni."
    },
    {
        question: "Quanto dura il video massimo?",
        answer: "Di default il limite è impostato a 90 secondi, il tempo ideale per una recensione efficace e diretta."
    },
    {
        question: "Dove vengono salvati i video?",
        answer: "I video vengono salvati in modo sicuro su Cloudflare R2, garantendo altissima velocità di caricamento e massima affidabilità."
    },
    {
        question: "Posso esportare i video?",
        answer: "Certamente. Dalla tua dashboard potrai scaricare i file video originali per usarli sui tuoi social o nel tuo marketing."
    }
];

export default function FAQ() {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    return (
        <section id="faq" className="faq-section">
            <div className="container">
                <div className="section-header align-center">
                    <h2 className="section-title">Domande Frequenti</h2>
                </div>

                <div className="faq-list">
                    {faqs.map((faq, index) => (
                        <div key={index} className="faq-item glass-card">
                            <button
                                className="faq-question"
                                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                            >
                                {faq.question}
                                <span className={`faq-icon ${openIndex === index ? "open" : ""}`}>↓</span>
                            </button>
                            {openIndex === index && (
                                <div className="faq-answer animate-fade-in">
                                    <p>{faq.answer}</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
