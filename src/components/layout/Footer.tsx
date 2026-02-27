"use client";

import Link from "next/link";

export default function Footer() {
    return (
        <footer>
            <div className="wrap">
                <div className="footer-grid">
                    <div className="footer-brand">
                        <Link href="/" className="logo">
                            <div className="logo-mark">▶</div>
                            VR
                        </Link>
                        <p>La piattaforma di video review con reward per team che vogliono social proof autentica e risultati misurabili.</p>
                    </div>
                    <div className="footer-col">
                        <h5>Prodotto</h5>
                        <ul>
                            <li><Link href="#features">Features</Link></li>
                            <li><Link href="#pricing">Pricing</Link></li>
                            <li><Link href="#casi-uso">Use Cases</Link></li>
                            <li><Link href="#">Integrazioni</Link></li>
                        </ul>
                    </div>
                    <div className="footer-col">
                        <h5>Azienda</h5>
                        <ul>
                            <li><Link href="#">Chi siamo</Link></li>
                            <li><Link href="#">Blog</Link></li>
                            <li><Link href="#">Contatti</Link></li>
                        </ul>
                    </div>
                    <div className="footer-col">
                        <h5>Legale</h5>
                        <ul>
                            <li><Link href="#">Privacy Policy</Link></li>
                            <li><Link href="#">Terms of Service</Link></li>
                            <li><Link href="#">Cookie Policy</Link></li>
                        </ul>
                    </div>
                </div>
                <div className="divider" style={{ margin: 'var(--s8) 0 var(--s5)' }}></div>
                <div className="footer-bottom">
                    <span>&copy; {new Date().getFullYear()} VR &mdash; Video Review Platform. Tutti i diritti riservati.</span>
                    <span>Made with &hearts; in Italy</span>
                </div>
            </div>
        </footer>
    );
}
