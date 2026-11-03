import Navbar from "@/components/home/Navbar";
import Hero from "@/components/home/Hero";
import HowItWorks from "@/components/home/HowItWorks";
import WhyUs from "@/components/home/WhyUs";
import Services from "@/components/home/Services";
import DeskPreview from "@/components/home/DeskPreview";
import Footer from "@/components/home/Footer";
import TrustCard from "@/components/shared/TrustCard";
import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { getState, setActiveTenant, useStore } from "@/lib/store";
import { siteClass } from "@/config/trades";

export default function Home() {
  const tenant = useStore((s) => s.tenant);
  const trade = tenant.trade;
  const [params] = useSearchParams();
  const wanted = params.get("tenant");
  // /site?tenant=luma-skin opens that business's own site (the med spa), same as the chat link.
  useEffect(() => {
    const st = getState();
    if (wanted && st.tenants[wanted] && st.tenant?.id !== wanted) setActiveTenant(wanted);
  }, [wanted]);
  return (
    <div className={`${siteClass(trade)} min-h-screen bg-background`}>
      <Navbar />
      <Hero />
      <HowItWorks />
      <DeskPreview />
      <Services />
      <TrustCard tenant={tenant} />
      <WhyUs />
      <Footer />
    </div>
  );
}
