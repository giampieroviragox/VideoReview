"use client";

export default function RewardEngine() {
    return (
        <section className="reward-section">
            <div className="wrap">
                <div className="reward-split">
                    <div className="reveal visible">
                        <div className="tag section-tag"><span className="tag-dot animate-pulse"></span>Reward Engine</div>
                        <h2 className="heading section-title">The right reward<br />for every customer.</h2>
                        <p className="section-sub" style={{ marginBottom: 'var(--s5)' }}>Configure automatic or manual incentives. VR handles distribution, tracking, and expiration. You just collect the videos.</p>
                        <ul className="feature-list">
                            <li><div className="check">✓</div> Premium trials, coupons, gift cards, early access &mdash; any type of digital reward</li>
                            <li><div className="check">✓</div> The reward is only unlocked after video approval by your team</li>
                            <li><div className="check">✓</div> Integration with Stripe, custom codes, or webhooks to your system</li>
                            <li><div className="check">✓</div> Budget limits per campaign, expiring rewards, and full reporting</li>
                        </ul>
                    </div>
                    <div className="reward-visual reveal visible reveal-delay-1">
                        <div className="label" style={{ color: 'var(--fog)', marginBottom: 'var(--s4)' }}>Active rewards in this campaign</div>
                        <div className="reward-card-demo">
                            <div className="reward-icon trial">🚀</div>
                            <div className="reward-info">
                                <h4>30 days Pro Plan</h4>
                                <p>Unlocked after video approval</p>
                            </div>
                            <span className="reward-badge active">Active</span>
                        </div>
                        <div className="reward-card-demo">
                            <div className="reward-icon coupon">🎟</div>
                            <div className="reward-info">
                                <h4>20% Coupon for next renewal</h4>
                                <p>Valid 90 days &middot; Max $50</p>
                            </div>
                            <span className="reward-badge popular">Popular</span>
                        </div>
                        <div className="reward-card-demo">
                            <div className="reward-icon gift">🎁</div>
                            <div className="reward-info">
                                <h4>$25 Amazon Gift Card</h4>
                                <p>Via automatic email</p>
                            </div>
                            <span className="reward-badge" style={{ background: 'var(--ink-3)', color: 'var(--fog)' }}>Draft</span>
                        </div>
                        <div style={{ marginTop: 'var(--s4)', padding: 'var(--s4)', background: 'var(--ink-3)', borderRadius: 'var(--r2)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--s2)' }}>
                                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--fog)' }}>Budget used</span>
                                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--white)', fontFamily: 'Syne, sans-serif', fontWeight: 700 }}>$420 / $1,000</span>
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
