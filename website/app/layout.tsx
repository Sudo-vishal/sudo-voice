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
  title: "SudoVoice — Your Voice, with Root Access",
  description:
    "Offline voice typing for Windows, macOS, and Android. Whisper runs on your machine, an LLM strips the filler, clean text lands at your cursor in any app. Free, open source, no subscription.",
  keywords: [
    "voice to text",
    "voice typing",
    "speech recognition",
    "whisper",
    "dictation",
    "windows",
    "mac",
    "android",
    "on-device",
    "free",
    "indian english",
    "hindi",
    "hinglish",
    "sudovoice",
  ],
  openGraph: {
    title: "SudoVoice — Your Voice, with Root Access",
    description:
      "Offline voice typing that types at your cursor in any app. Whisper on-device + LLM cleanup. Free forever, open source, no subscription.",
    url: "https://sudovoice.com",
    siteName: "SudoVoice",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SudoVoice — Your Voice, with Root Access",
    description: "Offline voice typing that types at your cursor. On-device Whisper + LLM cleanup. Free.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased bg-[#04070F] text-white`}>
        <Analytics />
        {children}
        {/* <VoiceAssistant /> */}
      </body>
    </html>
  );
}
