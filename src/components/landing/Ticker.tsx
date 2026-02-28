"use client";

const testimonials = [
    { avatar: "🧠", name: "u/Curious_Walrus_4821", quote: "We started collecting stronger proof almost immediately." },
    { avatar: "🦦", name: "u/MildlyConfusedOtter76", quote: "The flow is simple, and customers actually complete it." },
    { avatar: "🎃", name: "u/Formal_Pumpkin_913", quote: "It made our reviews feel more human and more credible." },
    { avatar: "🔧", name: "u/Dry-Mechanic-2045", quote: "Setup was clean, and the video responses felt instantly more trustworthy." },
    { avatar: "🦞", name: "u/SpicyLobster_338", quote: "The reward option helped without making the experience feel forced." },
];

export default function Ticker() {
    const items = [...testimonials, ...testimonials];

    return (
        <div className="landing-marquee-section">
            <div className="landing-marquee-track">
                {items.map((item, index) => (
                    <div key={`${item.name}-${index}`} className="landing-marquee-item">
                        <div className="landing-marquee-avatar">{item.avatar}</div>
                        <span className="landing-marquee-stars">★★★★★</span>
                        <strong>{item.name}</strong>
                        <span>— “{item.quote}”</span>
                        <span className="landing-marquee-sep">·</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
