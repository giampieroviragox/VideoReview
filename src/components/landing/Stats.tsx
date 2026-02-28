"use client";

export default function Stats() {
    return (
        <section className="landing-stats-section">
            <div className="landing-stats-inner">
                <h2 className="landing-stats-headline">
                    Numbers that <span>matter.</span>
                </h2>
                <div className="landing-stats-grid">
                    <div className="landing-stat-item">
                        <div className="stat-num">2<span>/3</span></div>
                        <div className="stat-label">
                            of consumers are more likely to buy after watching a
                            video testimonial (Wyzowl)
                        </div>
                    </div>
                    <div className="landing-stat-item">
                        <div className="stat-num">+80<span>%</span></div>
                        <div className="stat-label">
                            higher conversion rates on landing pages with video
                            testimonials (Unbounce)
                        </div>
                    </div>
                    <div className="landing-stat-item">
                        <div className="stat-num">5<span>min</span></div>
                        <div className="stat-label">
                            to complete setup and send your first invitation
                        </div>
                    </div>
                    <div className="landing-stat-item">
                        <div className="stat-num">95<span>%</span></div>
                        <div className="stat-label">
                            of a video review is remembered, vs 10% for text
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
