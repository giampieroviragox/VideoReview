"use client";

export default function Pricing() {
  return (
    <section className="pricing-section" id="pricing">
      <p className="landing-section-label">Pricing</p>
      <h2 className="landing-section-title">
        Private beta access,
        <br />
        free for early teams.
      </h2>
      <p className="landing-section-sub" style={{ margin: "0 auto" }}>
        Everyone who joins the waitlist and gets into the private beta
        unlocks the full PRO plan for free.
      </p>

      <div
        className="pricing-cards"
        style={{
          gridTemplateColumns: "minmax(280px, 520px)",
          justifyContent: "center",
        }}
      >
        <div className="price-card featured">
          <div className="plan-name">Pro</div>
          <div className="plan-price">
            $0<span>/free during beta</span>
          </div>
          <p className="plan-desc">
            The complete PRO plan unlocked for every approved waitlist member during the private beta.
          </p>
          <ul className="plan-features">
            <li><span className="chk">✓</span> Unlimited videos</li>
            <li><span className="chk">✓</span> Full reward engine</li>
            <li><span className="chk">✓</span> Analytics</li>
            <li><span className="chk">✓</span> Custom branding</li>
            <li><span className="chk">✓</span> Embed and widgets</li>
            <li><span className="chk">✓</span> Unlimited webhook integrations</li>
          </ul>
          <a
            href="#cta"
            className="price-cta coral"
            style={{ width: "100%", display: "inline-flex", justifyContent: "center" }}
          >
            Join the waitlist &rarr;
          </a>
        </div>
      </div>
    </section>
  );
}
