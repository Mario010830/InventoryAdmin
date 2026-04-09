import "./landing.css";
import {
  CatalogSection,
  CtaSection,
  Features,
  Footer,
  Hero,
  HowItWorks,
  Navbar,
  StatsSection,
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
