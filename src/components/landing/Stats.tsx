"use client";

export default function Stats() {
    return (
        <section className="stats-section">
            <div className="wrap">
                <div className="stats-grid">
                    <div className="stat-item reveal visible">
                        <div className="stat-number">87<span>%</span></div>
                        <div className="stat-label">of invited customers leave<br />a video review</div>
                    </div>
                    <div className="stat-item reveal visible reveal-delay-1">
                        <div className="stat-number">3<span>&times;</span></div>
                        <div className="stat-label">more conversions compared<br />to text reviews</div>
                    </div>
                    <div className="stat-item reveal visible reveal-delay-2">
                        <div className="stat-number">5<span>min</span></div>
                        <div className="stat-label">complete setup and first<br />invitation sent</div>
                    </div>
                    <div className="stat-item reveal visible reveal-delay-3">
                        <div className="stat-number">+40<span>%</span></div>
                        <div className="stat-label">churn reduction for SaaS<br />with reward reviews</div>
                    </div>
                </div>
            </div>
        </section>
    );
}
