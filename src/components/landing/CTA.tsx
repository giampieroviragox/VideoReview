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
        setMessage("");
        try {
            const res = await fetch("/api/waitlist", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            const contentType = res.headers.get("content-type") || "";
            let data: { message?: string; error?: string } = {};

            if (contentType.includes("application/json")) {
                data = (await res.json()) as { message?: string; error?: string };
            } else {
                const text = await res.text();
                data = { error: text || "Something went wrong." };
            }

            if (!res.ok) {
                throw new Error(data.error || "Something went wrong.");
            }

            setStatus("success");
            setMessage(data.message || "Thank you! We've added you to our waitlist.");
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
                    <h2 className="display cta-title">
                        Ready to collect <em>real</em> proof?
                    </h2>
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
                        <>
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
                                className="landing-cta-submit"
                                disabled={status === "loading"}
                            >
                                {status === "loading" ? "Sending..." : "Join the Waitlist →"}
                            </button>
                            </form>

                            {status === "loading" && (
                                <p className="cta-status-note cta-status-note--loading">Sending your request...</p>
                            )}

                            {status === "error" && (
                                <p className="cta-status-note cta-status-note--error">{message}</p>
                            )}
                        </>
                    )}

                    <p className="cta-legal">No spam. Only launch news. Privacy guaranteed.</p>
                </div>
            </div>
        </section>
    );
}
