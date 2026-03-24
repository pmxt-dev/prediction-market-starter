import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import Providers from "@/components/Providers";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "PMXT — Prediction Market Trading",
    template: "%s | PMXT",
  },
  description:
    "Trade prediction markets at the best available price. PMXT aggregates odds across exchanges so you always get the best deal on any outcome.",
  keywords: [
    "prediction markets",
    "trading",
    "polymarket",
    "event contracts",
    "forecasting",
    "pmxt",
  ],
  openGraph: {
    title: "PMXT — Prediction Market Trading",
    description:
      "Trade prediction markets at the best available price. PMXT aggregates odds across exchanges so you always get the best deal on any outcome.",
    siteName: "PMXT",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "PMXT — Prediction Market Trading",
    description:
      "Trade prediction markets at the best available price. PMXT aggregates odds across exchanges.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${jakarta.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
