import "./landing.css";
import {
  CatalogSection,
  CtaSection,
  Features,
  Footer,
  Hero,
  HowItWorks,
  Navbar,
  StatsSectionDesktopOnly,
} from "@/components/landing";

export default function Home() {
  return (
    <>
      <Navbar />
      <Hero />
      <Features />
      <CatalogSection />
      <StatsSectionDesktopOnly />
      <HowItWorks />
      <CtaSection />
      <Footer />
    </>
  );
}
