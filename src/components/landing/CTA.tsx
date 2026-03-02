import Link from "next/link";

export default function CTA() {
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

          <div className="cta-form">
            <Link href="/sign-up" className="landing-cta-submit">
              Join the Waitlist &rarr;
            </Link>
          </div>

          <p className="cta-legal">No spam. Only launch news. Privacy guaranteed.</p>
        </div>
      </div>
    </section>
  );
}
