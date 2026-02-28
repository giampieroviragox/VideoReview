import Navbar from "@/components/layout/Navbar";
import Hero from "@/components/landing/Hero";
import Ticker from "@/components/landing/Ticker";
import SocialProof from "@/components/landing/SocialProof";
import Stats from "@/components/landing/Stats";
import HowItWorks from "@/components/landing/HowItWorks";
import BrandShowcase from "@/components/landing/BrandShowcase";
import Pricing from "@/components/landing/Pricing";
import CTA from "@/components/landing/CTA";
import Footer from "@/components/layout/Footer";

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <Ticker />
      <SocialProof />
      <Stats />
      <HowItWorks />
      <BrandShowcase />
      <Pricing />
      <CTA />
      <Footer />
    </main>
  );
}
