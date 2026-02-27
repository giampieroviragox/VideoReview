import { UserButton } from "@clerk/nextjs";
import Link from "next/link";

export default function Dashboard() {
    return (
        <div className="min-h-screen bg-dark">
            <nav className="navbar">
                <div className="container nav-container">
                    <Link href="/" className="logo">
                        Rewid<span className="text-primary-accent">.</span>
                    </Link>
                    <div className="flex-row gap-4 align-center">
                        <span className="text-secondary">Dashboard</span>
                        <UserButton afterSignOutUrl="/" />
                    </div>
                </div>
            </nav>

            <main className="container pt-32">
                <div className="glass-card p-12 animate-slide-up">
                    <h1 className="text-3xl font-bold mb-4">Benvenuto nella tua Dashboard</h1>
                    <p className="text-secondary mb-8">
                        Qui potrai gestire le tue campagne di raccolta video e visualizzare le sottomissioni.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="glass-card p-6 border-primary">
                            <h3 className="text-xl font-semibold mb-2">Campagne Attive</h3>
                            <p className="text-4xl font-bold">1</p>
                        </div>
                        <div className="glass-card p-6">
                            <h3 className="text-xl font-semibold mb-2">Video Ricevuti</h3>
                            <p className="text-4xl font-bold">0</p>
                        </div>
                        <div className="glass-card p-6">
                            <h3 className="text-xl font-semibold mb-2">Spazio R2 Usato</h3>
                            <p className="text-4xl font-bold">0 MB</p>
                        </div>
                    </div>

                    <div className="mt-12 text-center">
                        <button className="btn btn-primary btn-large">
                            + Crea Nuova Campagna
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
