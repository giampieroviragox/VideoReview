"use client";

export default function HowItWorks() {
    return (
        <section className="section" id="how-it-works">
            <div className="wrap">
                <div className="section-header reveal visible">
                    <div className="tag section-tag"><span className="tag-dot animate-pulse"></span>How it works</div>
                    <h2 className="heading section-title">Three steps. Zero friction.</h2>
                    <p className="section-sub">Built for marketing and product teams that want results without technical overhead.</p>
                </div>
                <div className="steps-grid">
                    <div className="step-card card card-glow reveal visible">
                        <div className="step-num">01</div>
                        <h3 className="step-title">Invite your customers</h3>
                        <p className="step-desc">Create a video collection campaign in 2 clicks. Personalize the message, choose the customer segment, and define the optional reward to offer in exchange for the review.</p>
                    </div>
                    <div className="step-card card card-glow reveal visible reveal-delay-1">
                        <div className="step-num">02</div>
                        <h3 className="step-title">Customer records &amp; sends</h3>
                        <p className="step-desc">Direct link, no account needed. The customer records the video from the browser in 60 seconds &mdash; no app to download. Guided UI with optional prompts to maximize quality.</p>
                    </div>
                    <div className="step-card card card-glow reveal visible reveal-delay-2">
                        <div className="step-num">03</div>
                        <h3 className="step-title">Publish, measure, convert</h3>
                        <p className="step-desc">Approve with one click, embed anywhere with 1 line of code. Integrated analytics show the real impact on conversions for every video review.</p>
                    </div>
                </div>
            </div>
        </section>
    );
}

