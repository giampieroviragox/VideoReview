"use client";

export default function Stats() {
    return (
        <section className="stats-section">
            <div className="wrap">
                <div className="stats-grid">
                    <div className="stat-item reveal visible">
                        <div className="stat-number">2<span>/3</span></div>
                        <div className="stat-label">of consumers are more likely to buy<br />after watching a video testimonial (Wyzowl)</div>
                    </div>
                    <div className="stat-item reveal visible reveal-delay-1">
                        <div className="stat-number">+80<span>%</span></div>
                        <div className="stat-label">higher conversion rates on landing pages<br />with video testimonials (Unbounce)</div>
                    </div>
                    <div className="stat-item reveal visible reveal-delay-2">
                        <div className="stat-number">5<span>min</span></div>
                        <div className="stat-label">complete setup and first<br />invitation sent</div>
                    </div>
                    <div className="stat-item reveal visible reveal-delay-3">
                        <div className="stat-number">95<span>%</span></div>
                        <div className="stat-label">message retention for video reviews<br />vs 10% for text (Influencer Marketing Hub)</div>
                    </div>
                </div>
            </div>
        </section>
    );
}
