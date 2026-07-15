import type { Metadata } from "next";
import {
  Public_Sans,
  Geist_Mono,
  Cinzel_Decorative,
} from "next/font/google";
import "./globals.css";
import "@/styles/mint-green.css";
import { cookies } from "next/headers";

import { Providers } from "./providers";
import type { ActiveNetwork } from "@/lib/network";
import { NETWORK_COOKIE, DEFAULT_NETWORK } from "@/lib/network";

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const cinzelDecorative = Cinzel_Decorative({
  variable: "--font-cinzel-decorative",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
});

export const metadata: Metadata = {
  title: "SkillSwap",
  description:
    "SkillSwap matches you with people who need your skill and have the skill you need",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const rawNetwork = cookieStore.get(NETWORK_COOKIE)?.value;
  const initialNetwork: ActiveNetwork =
    rawNetwork === "mainnet" ? "mainnet" : DEFAULT_NETWORK;

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${publicSans.variable} ${geistMono.variable} ${cinzelDecorative.variable} h-full antialiased`}
    >
      <body className="bg-background text-foreground font-sans min-h-full flex flex-col">
        <Providers initialNetwork={initialNetwork}>{children}</Providers>
      </body>
    </html>
  );
}
