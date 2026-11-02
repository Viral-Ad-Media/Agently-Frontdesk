import Navbar from "@/components/home/Navbar";
import Hero from "@/components/home/Hero";
import HowItWorks from "@/components/home/HowItWorks";
import WhyUs from "@/components/home/WhyUs";
import Footer from "@/components/home/Footer";
import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { getState, setActiveTenant, useStore } from "@/lib/store";

export default function Home() {
  const trade = useStore((s) => s.tenant.trade);
  const [params] = useSearchParams();
  const wanted = params.get("tenant");
  // /site?tenant=luma-skin opens that business's own site (the med spa), same as the chat link.
  useEffect(() => {
    const st = getState();
    if (wanted && st.tenants[wanted] && st.tenant?.id !== wanted) setActiveTenant(wanted);
  }, [wanted]);
  return (
    <div className={`site-${trade === "medspa" ? "medspa" : "roofing"} min-h-screen bg-background`}>
      <Navbar />
      <Hero />
      <HowItWorks />
      <WhyUs />
      <Footer />
    </div>
  );
}
