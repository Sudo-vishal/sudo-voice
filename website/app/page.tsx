import LightStreaks from "./components/LightStreaks";
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
import AmbientGlow from "./components/AmbientGlow";

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="relative z-10">
        {/* Hero with light streaks */}
        <div className="relative">
          <LightStreaks />
          <Hero />
        </div>

        {/* Live Demo — try voice in browser */}
        <div className="relative overflow-hidden">
          <SectionDivider />
          <AmbientGlow position="center" color="blue" size={600} />
          <AmbientGlow position="top-left" color="purple" size={350} />
          <LiveDemo />
        </div>

        {/* How It Works */}
        <div className="relative overflow-hidden">
          <SectionDivider />
          <AmbientGlow position="top-right" color="blue" size={500} />
          <AmbientGlow position="bottom-left" color="purple" size={400} />
          <HowItWorks />
        </div>

        {/* Features */}
        <div className="relative overflow-hidden">
          <SectionDivider />
          <AmbientGlow position="top-left" color="purple" size={450} />
          <AmbientGlow position="bottom-right" color="blue" size={500} />
          <Features />
        </div>

        {/* Time Savings Calculator */}
        <div className="relative overflow-hidden">
          <SectionDivider />
          <AmbientGlow position="center" color="blue" size={600} />
          <AmbientGlow position="top-right" color="purple" size={400} />
          <Calculator />
        </div>

        {/* Models */}
        <div className="relative overflow-hidden">
          <SectionDivider />
          <AmbientGlow position="center" color="purple" size={600} />
          <ModelTable />
        </div>

        {/* Comparison */}
        <div className="relative overflow-hidden">
          <SectionDivider />
          <AmbientGlow position="top-right" color="pink" size={400} />
          <AmbientGlow position="bottom-left" color="blue" size={450} />
          <Comparison />
        </div>

        {/* Download */}
        <div className="relative overflow-hidden">
          <SectionDivider />
          <AmbientGlow position="center" color="blue" size={700} />
          <Download />
        </div>

        {/* Feedback Form */}
        <div className="relative overflow-hidden">
          <SectionDivider />
          <AmbientGlow position="bottom-left" color="purple" size={400} />
          <FeedbackForm />
        </div>

        {/* Support & Feedback */}
        <div className="relative overflow-hidden">
          <SectionDivider />
          <AmbientGlow position="top-right" color="blue" size={350} />
          <Support />
        </div>
      </main>
      <Footer />
    </>
  );
}
