"use client";

export default function RewardEngine() {
    return (
        <section className="reward-section">
            <div className="wrap">
                <div className="reward-split">
                    <div className="reveal visible">
                        <div className="tag section-tag"><span className="tag-dot animate-pulse"></span>Reward Engine</div>
                        <h2 className="heading section-title">Il reward giusto<br />per ogni cliente.</h2>
                        <p className="section-sub" style={{ marginBottom: 'var(--s5)' }}>Configura incentivi automatici o manuali. VR gestisce la distribuzione, il tracking e la scadenza. Tu raccogli i video.</p>
                        <ul className="feature-list">
                            <li><div className="check">✓</div> Trial premium, coupon, gift card, accesso anticipato &mdash; qualsiasi tipo di reward digitale</li>
                            <li><div className="check">✓</div> Il reward si sblocca solo dopo l'approvazione del video da parte del tuo team</li>
                            <li><div className="check">✓</div> Integrazione con Stripe, codici custom o webhook verso il tuo sistema</li>
                            <li><div className="check">✓</div> Limite budget per campagna, reward scadente e reporting completo</li>
                        </ul>
                    </div>
                    <div className="reward-visual reveal visible reveal-delay-1">
                        <div className="label" style={{ color: 'var(--fog)', marginBottom: 'var(--s4)' }}>Reward attivi in questa campagna</div>
                        <div className="reward-card-demo">
                            <div className="reward-icon trial">🚀</div>
                            <div className="reward-info">
                                <h4>30 giorni Piano Pro</h4>
                                <p>Sbloccato post-approvazione video</p>
                            </div>
                            <span className="reward-badge active">Attivo</span>
                        </div>
                        <div className="reward-card-demo">
                            <div className="reward-icon coupon">🎟</div>
                            <div className="reward-info">
                                <h4>Coupon 20% prossimo rinnovo</h4>
                                <p>Valido 90 giorni &middot; Max €50</p>
                            </div>
                            <span className="reward-badge popular">Popolare</span>
                        </div>
                        <div className="reward-card-demo">
                            <div className="reward-icon gift">🎁</div>
                            <div className="reward-info">
                                <h4>Amazon Gift Card €25</h4>
                                <p>Via email automatica</p>
                            </div>
                            <span className="reward-badge" style={{ background: 'var(--ink-3)', color: 'var(--fog)' }}>Draft</span>
                        </div>
                        <div style={{ marginTop: 'var(--s4)', padding: 'var(--s4)', background: 'var(--ink-3)', borderRadius: 'var(--r2)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--s2)' }}>
                                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--fog)' }}>Budget usato</span>
                                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--white)', fontFamily: 'Syne, sans-serif', fontWeight: 700 }}>€420 / €1.000</span>
                            </div>
                            <div style={{ height: '6px', background: 'var(--ink-4)', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ width: '42%', height: '100%', background: 'linear-gradient(90deg,var(--brand),var(--brand-2))', borderRadius: '3px' }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
