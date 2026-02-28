"use client";

const testimonials = [
    { avatar: "😊", name: "Marco R.", quote: "Prodotto fantastico, lo uso ogni giorno" },
    { avatar: "🧑‍💼", name: "Sara M.", quote: "Ha trasformato il nostro onboarding" },
    { avatar: "👩‍🎨", name: "Luca B.", quote: "Clienti che non avrei mai pensato di raggiungere" },
    { avatar: "🧑‍🔬", name: "Alice V.", quote: "Setup in 5 minuti, risultati in una settimana" },
    { avatar: "👨‍💻", name: "Gianni F.", quote: "Le video recensioni convertono 3 volte di più" },
    { avatar: "👩‍🏫", name: "Chiara P.", quote: "Il reward ha fatto la differenza" },
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
