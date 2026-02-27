"use client";

import { useState } from "react";

export default function CTA() {
    const [email, setEmail] = useState("");
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [message, setMessage] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        setStatus("loading");
        try {
            const res = await fetch("/api/waitlist", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Qualcosa è andato storto.");
            }

            setStatus("success");
            setMessage(data.message);
            setEmail("");
        } catch (err: any) {
            setStatus("error");
            setMessage(err.message);
        }
    };

    return (
        <section className="cta-section" id="cta">
            <div className="wrap">
                <div className="cta-box reveal visible">
                    <div className="tag" style={{ display: 'inline-flex', marginBottom: 'var(--s5)' }}>
                        <span className="tag-dot"></span>Waitlist Aperta
                    </div>
                    <h2 className="display cta-title">La tua prossima vendita<br />la chiude un video.</h2>
                    <p className="cta-sub">
                        Siamo in fase di beta privata. Iscriviti per ottenere <br />
                        <strong>accesso prioritario</strong> e il piano Pro gratis per 3 mesi.
                    </p>

                    {status === "success" ? (
                        <div className="success-message animate-fadeUp">
                            <div className="check" style={{ margin: '0 auto 16px' }}>✓</div>
                            <p style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>{message}</p>
                        </div>
                    ) : (
                        <form className="cta-form" onSubmit={handleSubmit}>
                            <input
                                type="email"
                                className="cta-input"
                                placeholder="la-tua@email.com"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={status === "loading"}
                            />
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={status === "loading"}
                            >
                                {status === "loading" ? "Invio in corso..." : "Entra in Waitlist →"}
                            </button>
                        </form>
                    )}

                    {status === "error" && (
                        <p style={{ color: "var(--brand)", marginTop: "var(--s3)", fontSize: "var(--text-sm)" }}>
                            {message}
                        </p>
                    )}

                    <p className="cta-legal">Nessuno spam. Solo news sul lancio. Privacy garantita.</p>
                </div>
            </div>
        </section>
    );
}
