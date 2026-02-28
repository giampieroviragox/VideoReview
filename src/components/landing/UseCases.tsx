"use client";

const useCases = [
  {
    icon: "⚡",
    kicker: "SaaS · Freemium",
    title: "Free → Premium\nwith review reward",
    description:
      "Invite free users to record a video review. In exchange, unlock 30 days of your Pro plan and turn happy users into conversion proof.",
    pills: ["🎁 Reward: 30d Premium", "📈 Trial conversion uplift"],
  },
  {
    icon: "🛒",
    kicker: "E-commerce · Post-purchase",
    title: "Automatic post-purchase\nvideo UGC",
    description:
      "Send a review request after delivery, collect real product footage, and publish it where buyers need extra trust before they purchase.",
    pills: ["💳 Reward: 15% coupon", "🎬 Authentic UGC"],
  },
  {
    icon: "🏢",
    kicker: "Agency · B2B",
    title: "Video case studies\nfor agency clients",
    description:
      "Turn client feedback into polished proof for proposals, sales decks, and landing pages. Structured prompts make every testimonial easier to reuse.",
    pills: ["🏆 No reward — relationship", "📋 Guided prompts"],
  },
  {
    icon: "🎓",
    kicker: "EdTech · Community",
    title: "Testimonials from\ntop students",
    description:
      "Invite your most engaged users to share their transformation story and reuse those videos across community growth, launches, and enrollment pages.",
    pills: ["🎓 Reward: advanced course", "✨ Emotional social proof"],
  },
];

export default function UseCases() {
  return (
    <section className="landing-use-cases-section" id="use-cases">
      <div className="landing-use-cases-inner">
        <p className="landing-section-label">Use cases</p>
        <h2 className="landing-section-title">
          Works for every
          <br />
          business model.
        </h2>
        <p className="landing-section-sub">
          Fixed or dynamic rewards, manual or automatic invites. VR adapts to your
          workflow.
        </p>

        <div className="landing-use-cases-grid">
          {useCases.map((item) => (
            <article key={item.title} className="landing-use-case-card">
              <div className="landing-use-case-icon">{item.icon}</div>
              <p className="landing-use-case-kicker">{item.kicker}</p>
              <h3 className="landing-use-case-title">
                {item.title.split("\n").map((line) => (
                  <span key={line}>
                    {line}
                    <br />
                  </span>
                ))}
              </h3>
              <p className="landing-use-case-desc">{item.description}</p>
              <div className="landing-use-case-pills">
                {item.pills.map((pill) => (
                  <span key={pill} className="landing-use-case-pill">
                    {pill}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
