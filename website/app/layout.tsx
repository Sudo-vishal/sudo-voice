import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
// import VoiceAssistant from "./components/VoiceAssistant"; // TODO: fix Gemini TTS then re-enable

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SudoVoice — Voice to Text, On-Device by Default",
  description:
    "Free voice-to-text for Mac, Windows, and Chrome. Hindi, Hinglish, English. On-device by default — your audio recordings never leave your machine. Sign in for cross-device transcript sync. Built for developers and creators.",
  keywords: [
    "voice to text",
    "voice typing",
    "speech recognition",
    "whisper",
    "dictation",
    "mac",
    "windows",
    "chrome extension",
    "on-device",
    "free",
    "indian english",
    "hindi",
    "hinglish",
    "sudovoice",
  ],
  openGraph: {
    title: "SudoVoice — Stop Typing. Start Speaking.",
    description:
      "Voice-to-text for Mac, Windows, and Chrome. Hindi, Hinglish, English. Free forever. No subscription.",
    url: "https://sudovoice.com",
    siteName: "SudoVoice",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SudoVoice — Voice to Text, On-Device by Default",
    description: "Voice-to-text for Mac, Windows & Chrome. Hindi/Hinglish/English. Free.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased bg-[#070D16] text-white`}>
        <Analytics />
        {children}
        {/* <VoiceAssistant /> */}
      </body>
    </html>
  );
}
