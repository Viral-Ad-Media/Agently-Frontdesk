
import Navbar from "@/components/home/Navbar";
import Hero from "@/components/home/Hero";
import HowItWorks from "@/components/home/HowItWorks";
import ArtisanGrid from "@/components/home/ArtisanGrid";
import WhyUs from "@/components/home/WhyUs";
import ComingSoon from "@/components/home/ComingSoon";
import Footer from "@/components/home/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <HowItWorks />
      <ArtisanGrid />
      <WhyUs />
      <ComingSoon />
      <Footer />
    </div>
  );
}