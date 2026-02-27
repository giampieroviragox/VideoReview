"use client";

import Link from "next/link";

export default function Hero() {
    return (
        <section className="hero-section">
            <div className="container">
                <div className="hero-content">
                    <div className="badge animate-fade-in">Novità: Video Recensioni Automatiche ⚡</div>
                    <h1 className="hero-title animate-slide-up">
                        Trasforma i tuoi clienti nei tuoi <span className="text-gradient">migliori venditori</span>.
                    </h1>
                    <p className="hero-subtitle animate-slide-up delay-1">
                        Raccogli video recensioni autentiche e coinvolgenti in pochi clic.
                        Aumenta la fiducia dei tuoi potenziali clienti con il potere del video.
                    </p>
                    <div className="hero-actions animate-slide-up delay-2">
                        <Link href="/sign-up" className="btn btn-primary btn-large">
                            Inizia Ora Gratis →
                        </Link>
                        <Link href="#how-it-works" className="btn btn-secondary btn-large">
                            Vedi come funziona
                        </Link>
                    </div>
                </div>

                <div className="hero-visual animate-fade-in delay-3">
                    <div className="hero-video-preview">
                        <div className="video-skeleton">
                            <div className="play-button-icon">▶</div>
                        </div>
                        <div className="floating-review-card card-1">
                            <div className="avatar">👤</div>
                            <div className="review-text">"Prodotto fantastico!"</div>
                        </div>
                        <div className="floating-review-card card-2">
                            <div className="avatar">👤</div>
                            <div className="review-text">"Velocissimo da usare."</div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
