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
                throw new Error(data.error || "Something went wrong.");
            }

            setStatus("success");
            setMessage(data.message);
            setEmail("");
        } catch (err) {
            setStatus("error");
            setMessage(err instanceof Error ? err.message : "Something went wrong.");
        }
    };

    return (
        <section className="cta-section" id="cta">
            <div className="wrap">
                <div className="cta-box reveal visible">
                    <div className="tag" style={{ display: 'inline-flex', marginBottom: 'var(--s5)' }}>
                        <span className="tag-dot"></span>Waitlist Open
                    </div>
                    <h2 className="display cta-title">Your next client is waiting for a reason to trust you.</h2>
                    <p className="cta-sub">
                        We are in private beta. Join to get <br />
                        <strong>priority access</strong> and 3 months of Pro for free.
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
                                placeholder="hello@email.com"
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
                                {status === "loading" ? "Sending..." : "Join the Waitlist →"}
                            </button>
                        </form>
                    )}

                    {status === "error" && (
                        <p style={{ color: "var(--brand)", marginTop: "var(--s3)", fontSize: "var(--text-sm)" }}>
                            {message}
                        </p>
                    )}

                    <p className="cta-legal">No spam. Only launch news. Privacy guaranteed.</p>
                </div>
            </div>
        </section>
    );
}
