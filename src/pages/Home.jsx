import Navbar from "@/components/home/Navbar";
import Hero from "@/components/home/Hero";
import HowItWorks from "@/components/home/HowItWorks";
import WhyUs from "@/components/home/WhyUs";
import Footer from "@/components/home/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <HowItWorks />
      <WhyUs />
      <Footer />
    </div>
  );
}
