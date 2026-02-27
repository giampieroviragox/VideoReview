"use client";

import Link from "next/link";

export default function Pricing() {
    return (
        <section className="section" id="pricing">
            <div className="wrap">
                <div className="section-header reveal visible" style={{ textAlign: 'center' }}>
                    <div className="tag section-tag" style={{ display: 'inline-flex' }}><span className="tag-dot animate-pulse"></span>Pricing</div>
                    <h2 className="heading section-title">Piani trasparenti,<br />per ogni fase di crescita.</h2>
                    <p className="section-sub" style={{ margin: '0 auto' }}>Inizia gratis, scala quando hai bisogno di più volume e automazioni.</p>
                </div>

                <div className="pricing-grid">
                    {/* Starter */}
                    <div className="pricing-card card reveal visible">
                        <div className="plan-name">Starter</div>
                        <div className="plan-price">€0<span>/mese</span></div>
                        <p className="plan-desc">Per explorer e piccoli progetti che vogliono testare la social proof video.</p>
                        <ul className="plan-features">
                            <li><span className="chk">✓</span> Fino a 5 video/mese</li>
                            <li><span className="chk">✓</span> Widget standard</li>
                            <li><span className="chk">✓</span> Moderazione base</li>
                            <li><span className="chk">✕</span> Reward automatici</li>
                            <li><span className="chk">✕</span> Custom branding</li>
                        </ul>
                        <Link href="#cta" className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center' }}>Inizia gratis</Link>
                    </div>

                    {/* Pro - Featured */}
                    <div className="pricing-card card card-glow reveal visible reveal-delay-1 featured">
                        <div className="pricing-popular">Il più scelto</div>
                        <div className="plan-name">Pro</div>
                        <div className="plan-price">€49<span>/mese</span></div>
                        <p className="plan-desc">Tutto quello che serve per scalare la raccolta e automatizzare i reward.</p>
                        <ul className="plan-features">
                            <li><span className="chk">✓</span> Video illimitati</li>
                            <li><span className="chk">✓</span> Reward engine completo</li>
                            <li><span className="chk">✓</span> Analytics di conversione</li>
                            <li><span className="chk">✓</span> Custom branding &amp; domain</li>
                            <li><span className="chk">✓</span> Embed + carousel widget</li>
                            <li><span className="chk">✓</span> HubSpot + Zapier</li>
                        </ul>
                        <Link href="#cta" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Prova 14 giorni gratis &rarr;</Link>
                    </div>

                    {/* Enterprise */}
                    <div className="pricing-card card reveal visible reveal-delay-2">
                        <div className="plan-name">Enterprise</div>
                        <div className="plan-price" style={{ fontSize: 'var(--text-3xl)' }}>Custom</div>
                        <p className="plan-desc">Per aziende con volumi alti, team multipli e requisiti di sicurezza enterprise.</p>
                        <ul className="plan-features">
                            <li><span className="chk">✓</span> Multi-brand / workspace</li>
                            <li><span className="chk">✓</span> SSO &amp; SAML</li>
                            <li><span className="chk">✓</span> SLA garantito</li>
                            <li><span className="chk">✓</span> Integrazione CRM custom</li>
                            <li><span className="chk">✓</span> Onboarding dedicato</li>
                            <li><span className="chk">✓</span> Account manager</li>
                        </ul>
                        <Link href="#cta" className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center' }}>Contattaci</Link>
                    </div>
                </div>
            </div>
        </section>
    );
}
