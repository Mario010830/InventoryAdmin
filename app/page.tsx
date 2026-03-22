import "./landing.css";
import {
  Navbar,
  Hero,
  Features,
  CatalogSection,
  StatsSection,
  HowItWorks,
  CtaSection,
  Footer,
} from "@/components/landing";

export default function Home() {
  return (
    <>
      <Navbar />
      <Hero />
      <Features />
      <CatalogSection />
      <StatsSection />
      <HowItWorks />
      <CtaSection />
      <Footer />
    </>
  );
}
