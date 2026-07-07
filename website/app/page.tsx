import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
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

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="relative z-10">
        <Hero />

        <SectionDivider index="01" label="try it in your browser" />
        <LiveDemo />

        <SectionDivider index="02" label="how it works" />
        <HowItWorks />

        <SectionDivider index="03" label="features" />
        <Features />

        <SectionDivider index="04" label="time saved" />
        <Calculator />

        <SectionDivider index="05" label="models" />
        <ModelTable />

        <SectionDivider index="06" label="vs. the others" />
        <Comparison />

        <SectionDivider index="07" label="download" />
        <Download />

        <SectionDivider index="08" label="feedback" />
        <FeedbackForm />

        <SectionDivider index="09" label="support" />
        <Support />
      </main>
      <Footer />
    </>
  );
}
