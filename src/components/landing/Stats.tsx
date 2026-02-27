"use client";

export default function Stats() {
    return (
        <section className="stats-section">
            <div className="wrap">
                <div className="stats-grid">
                    <div className="stat-item reveal visible">
                        <div className="stat-number">87<span>%</span></div>
                        <div className="stat-label">dei clienti invitati lascia<br />una video recensione</div>
                    </div>
                    <div className="stat-item reveal visible reveal-delay-1">
                        <div className="stat-number">3<span>&times;</span></div>
                        <div className="stat-label">più conversioni rispetto<br />alle recensioni testuali</div>
                    </div>
                    <div className="stat-item reveal visible reveal-delay-2">
                        <div className="stat-number">5<span>min</span></div>
                        <div className="stat-label">setup completo e primo<br />invito spedito</div>
                    </div>
                    <div className="stat-item reveal visible reveal-delay-3">
                        <div className="stat-number">+40<span>%</span></div>
                        <div className="stat-label">riduzione churn per SaaS<br />con reward reviews</div>
                    </div>
                </div>
            </div>
        </section>
    );
}
