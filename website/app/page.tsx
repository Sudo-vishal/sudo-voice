import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import ManPage from "./components/ManPage";
import LiveDemo from "./components/LiveDemo";
import HelpFlags from "./components/HelpFlags";
import PipelineTrace from "./components/PipelineTrace";
import ModelsLs from "./components/ModelsLs";
import DiffCompare from "./components/DiffCompare";
import ChangelogTeaser from "./components/ChangelogTeaser";
import PricingSnippet from "./components/PricingSnippet";
import Download from "./components/Download";
import HomeFAQ from "./components/HomeFAQ";
import FeedbackForm from "./components/FeedbackForm";
import Support from "./components/Support";
import CTABlock from "./components/CTABlock";
import Footer from "./components/Footer";
import SectionDivider from "./components/SectionDivider";
import Reveal from "./components/Reveal";

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="relative z-10">
        <Hero />

        <SectionDivider index="01" label="manual" />
        <ManPage />

        <SectionDivider index="02" label="try it in your browser" />
        <Reveal><LiveDemo /></Reveal>

        <SectionDivider index="03" label="flags" />
        <HelpFlags />

        <SectionDivider index="04" label="latency trace" />
        <PipelineTrace />

        <SectionDivider index="05" label="models on disk" />
        <ModelsLs />

        <SectionDivider index="06" label="diff vs. the others" />
        <DiffCompare />

        <SectionDivider index="07" label="release log" />
        <ChangelogTeaser />

        <SectionDivider index="08" label="tiers.conf" />
        <PricingSnippet />

        <SectionDivider index="09" label="download" />
        <Download />

        <SectionDivider index="10" label="faq" />
        <HomeFAQ />

        <SectionDivider index="11" label="feedback" />
        <FeedbackForm />

        <SectionDivider index="12" label="support" />
        <Support />

        <CTABlock />
      </main>
      <Footer />
    </>
  );
}
