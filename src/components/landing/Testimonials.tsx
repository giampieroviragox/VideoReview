"use client";

export default function Testimonials() {
    return (
        <section className="section" id="testimonials">
            <div className="wrap">
                <div className="section-header reveal visible">
                    <div className="tag section-tag"><span className="tag-dot animate-pulse"></span>Testimonials</div>
                    <h2 className="heading section-title">What they say about us (on video).</h2>
                    <p className="section-sub">Over 500 teams use VR to collect social proof every day.</p>
                </div>
                <div className="testimonials-grid">
                    <div className="testimonial-card card reveal visible">
                        <div className="quote-icon">“</div>
                        <p className="testimonial-text">VR has radically changed how we manage testimonials. We get high-quality videos from customers without having to chase them for weeks.</p>
                        <div className="testimonial-author">
                            <div className="avatar">AM</div>
                            <div>
                                <div className="author-name">Alex M.</div>
                                <div className="author-role">Founder @ TechFlow</div>
                            </div>
                        </div>
                    </div>
                    <div className="testimonial-card card reveal visible reveal-delay-1">
                        <div className="quote-icon">“</div>
                        <p className="testimonial-text">The reward integration was the game-changer. Our response rate for review requests jumped from 5% to 22% in a single month.</p>
                        <div className="testimonial-author">
                            <div className="avatar" style={{ background: 'var(--brand)' }}>SL</div>
                            <div>
                                <div className="author-name">Sarah L.</div>
                                <div className="author-role">Head of Growth @ ShopUp</div>
                            </div>
                        </div>
                    </div>
                    <div className="testimonial-card card reveal visible reveal-delay-2">
                        <div className="quote-icon">“</div>
                        <p className="testimonial-text">Being able to approve videos and see them appear instantly on our landing page is magical. New user trust has skyrocketed.</p>
                        <div className="testimonial-author">
                            <div className="avatar" style={{ background: 'var(--ink-4)' }}>DP</div>
                            <div>
                                <div className="author-name">David P.</div>
                                <div className="author-role">Product Manager @ EduBase</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
