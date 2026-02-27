"use client";

import Link from "next/link";
import { SignInButton, SignUpButton, UserButton, SignedIn, SignedOut } from "@clerk/nextjs";

export default function Navbar() {
    return (
        <nav className="navbar">
            <div className="container nav-container">
                <Link href="/" className="logo">
                    Rewid<span className="text-primary-accent">.</span>
                </Link>

                <div className="nav-links">
                    <Link href="#how-it-works" className="nav-link">Come funziona</Link>
                    <Link href="#pricing" className="nav-link">Prezzi</Link>
                    <Link href="#faq" className="nav-link">FAQ</Link>
                </div>

                <div className="auth-actions">
                    <SignedOut>
                        <div className="flex-row gap-4">
                            <SignInButton mode="modal">
                                <button className="nav-link bg-none border-none pointer">Accedi</button>
                            </SignInButton>
                            <SignUpButton mode="modal">
                                <button className="btn btn-primary">Registrati</button>
                            </SignUpButton>
                        </div>
                    </SignedOut>
                    <SignedIn>
                        <div className="flex-row gap-4 align-center">
                            <Link href="/dashboard" className="nav-link">Dashboard</Link>
                            <UserButton afterSignOutUrl="/" />
                        </div>
                    </SignedIn>
                </div>
            </div>
        </nav>
    );
}
