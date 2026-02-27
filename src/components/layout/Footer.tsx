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
                        <p>The video review platform with rewards for teams that want authentic social proof and measurable results.</p>
                    </div>
                    <div className="footer-col">
                        <h5>Product</h5>
                        <ul>
                            <li><a href="#features">Features</a></li>
                            <li><a href="#pricing">Pricing</a></li>
                            <li><a href="#use-cases">Use Cases</a></li>
                            <li><Link href="#">Integrations</Link></li>
                        </ul>
                    </div>
                    <div className="footer-col">
                        <h5>Company</h5>
                        <ul>
                            <li><Link href="#">About us</Link></li>
                            <li><Link href="#">Blog</Link></li>
                            <li><Link href="#">Contacts</Link></li>
                        </ul>
                    </div>
                    <div className="footer-col">
                        <h5>Legal</h5>
                        <ul>
                            <li><Link href="#">Privacy Policy</Link></li>
                            <li><Link href="#">Terms of Service</Link></li>
                            <li><Link href="#">Cookie Policy</Link></li>
                        </ul>
                    </div>
                </div>
                <div className="divider" style={{ margin: 'var(--s8) 0 var(--s5)' }}></div>
                <div className="footer-bottom">
                    <span>&copy; {new Date().getFullYear()} VR &mdash; Video Review Platform. All rights reserved.</span>
                    <span>Made with &hearts; in Italy</span>
                </div>
            </div>
        </footer>
    );
}
