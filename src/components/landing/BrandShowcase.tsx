"use client";

const brands = [
  {
    color: "#3B5BDB",
    initials: "AC",
    name: "ACME Corp",
    sub: "ti ha invitato a parlare di loro",
    question: "Cosa ti ha convinto a sceglierci?",
  },
  {
    color: "#0D9488",
    initials: "FN",
    name: "FinovaTech",
    sub: "ti ha invitato a parlare di loro",
    question: "Come descriveresti la tua esperienza?",
  },
  {
    color: "#7C3AED",
    initials: "ST",
    name: "StudioMake",
    sub: "ti ha invitato a parlare di loro",
    question: "Cosa diresti a chi non ci conosce ancora?",
  },
  {
    color: "#EA580C",
    initials: "GS",
    name: "GrowSpark",
    sub: "ti ha invitato a parlare di loro",
    question: "Qual è il risultato più bello che hai ottenuto?",
  },
];

export default function BrandShowcase() {
  return (
    <section className="landing-brand-section">
      <div className="landing-brand-inner">
        <p className="landing-section-label">White-label</p>
        <h2 className="landing-section-title">Built for every brand.</h2>
        <p className="landing-section-sub">
          The same clean experience, dressed in any color. Your customers will never know it&apos;s VR.
        </p>

        <div className="landing-brand-cards">
          {brands.map((brand) => (
            <div key={brand.name} className="landing-brand-preview">
              <div className="landing-brand-preview-header" style={{ background: brand.color }}></div>
              <div className="landing-brand-preview-body">
                <div className="landing-brand-preview-top">
                  <div className="landing-brand-preview-logo" style={{ background: brand.color }}>
                    {brand.initials}
                  </div>
                  <div>
                    <div className="landing-brand-preview-name">{brand.name}</div>
                    <div className="landing-brand-preview-sub">{brand.sub}</div>
                  </div>
                </div>

                <div className="landing-brand-preview-q">“{brand.question}”</div>
                <div className="landing-brand-preview-btn" style={{ background: brand.color }}>
                  Rispondi e ricevi il reward →
                </div>
                <div className="landing-brand-preview-powered">Powered by VR</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
