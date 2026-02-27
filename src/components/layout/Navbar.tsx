"use client";

import Link from "next/link";
import { SignInButton, SignUpButton, UserButton, useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";

export default function Navbar() {
    const { isSignedIn } = useUser();
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 40);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <nav className={scrolled ? 'scrolled' : ''}>
            <div className="wrap">
                <div className="nav-inner">
                    <Link href="/" className="logo">
                        <div className="logo-mark">▶</div>
                        VR
                    </Link>

                    <ul className="nav-links" style={{ margin: 0, padding: 0 }}>
                        <li><Link href="#come-funziona">Come funziona</Link></li>
                        <li><Link href="#features">Features</Link></li>
                        <li><Link href="#pricing">Pricing</Link></li>
                        <li><Link href="#casi-uso">Use Cases</Link></li>
                    </ul>

                    <div className="nav-cta">
                        {!isSignedIn ? (
                            <>
                                <SignInButton mode="modal">
                                    <button className="btn btn-ghost" style={{ padding: '10px 20px', fontSize: '11px' }}>Login</button>
                                </SignInButton>
                                <SignUpButton mode="modal">
                                    <button className="btn btn-primary" style={{ padding: '10px 20px', fontSize: '11px' }}>Inizia gratis &rarr;</button>
                                </SignUpButton>
                            </>
                        ) : (
                            <>
                                <Link href="/dashboard" className="btn btn-ghost" style={{ padding: '10px 20px', fontSize: '11px' }}>Dashboard</Link>
                                <UserButton afterSignOutUrl="/" />
                            </>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}
