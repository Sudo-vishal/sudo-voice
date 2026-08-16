import type { Metadata } from "next";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import AccountClient from "./AccountClient";

export const metadata: Metadata = {
  title: "Account — SudoVoice",
  description:
    "Sign in to SudoVoice — view your plan, synced dictation history, and manage Pro across your devices.",
};

export default function AccountPage() {
  return (
    <>
      <Navbar />
      <main className="relative z-10 min-h-[70vh] pt-32 pb-20 px-6">
        <AccountClient />
      </main>
      <Footer />
    </>
  );
}
