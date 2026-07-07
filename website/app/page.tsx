import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import AppMarquee from "./components/AppMarquee";
import StatsBand from "./components/StatsBand";
import LiveDemo from "./components/LiveDemo";
import HowItWorks from "./components/HowItWorks";
import Features from "./components/Features";
import Calculator from "./components/Calculator";
import ModelTable from "./components/ModelTable";
import Comparison from "./components/Comparison";
import Download from "./components/Download";
import FeedbackForm from "./components/FeedbackForm";
import Support from "./components/Support";
import Footer from "./components/Footer";
import SectionDivider from "./components/SectionDivider";
import Reveal from "./components/Reveal";

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="relative z-10">
        <Hero />

        <AppMarquee />
        <StatsBand />

        <SectionDivider index="01" label="try it in your browser" />
        <Reveal><LiveDemo /></Reveal>

        <SectionDivider index="02" label="how it works" />
        <HowItWorks />

        <SectionDivider index="03" label="features" />
        <Features />

        <SectionDivider index="04" label="time saved" />
        <Reveal><Calculator /></Reveal>

        <SectionDivider index="05" label="models" />
        <Reveal><ModelTable /></Reveal>

        <SectionDivider index="06" label="vs. the others" />
        <Reveal><Comparison /></Reveal>

        <SectionDivider index="07" label="download" />
        <Reveal><Download /></Reveal>

        <SectionDivider index="08" label="feedback" />
        <Reveal><FeedbackForm /></Reveal>

        <SectionDivider index="09" label="support" />
        <Reveal><Support /></Reveal>
      </main>
      <Footer />
    </>
  );
}
