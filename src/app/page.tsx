import Navbar from "@/components/layout/Navbar";
import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import Pricing from "@/components/landing/Pricing";
import FAQ from "@/components/landing/FAQ";

export default function Home() {
  return (
    <main className="min-h-screen bg-dark">
      <Navbar />
      <Hero />
      <Features />
      <Pricing />
      <FAQ />

      <footer className="py-12 border-t border-glass text-center text-secondary">
        <div className="container">
          <p>© 2026 Rewid. Tutti i diritti riservati.</p>
        </div>
      </footer>
    </main>
  );
}
