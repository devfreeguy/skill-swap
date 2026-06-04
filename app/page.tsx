import { Metadata } from "next";

import PublicHeader from "@/components/layouts/PublicHeader";
import PublicFooter from "@/components/layouts/PublicFooter";
import HeroSection from "@/components/sections/HeroSection";
import PerfectMatchSection from "@/components/sections/PerfectMatchSection";
import StatsSection from "@/components/sections/StatsSection";
import HowItWorksSection from "@/components/sections/HowItWorksSection";
import ContributionLedgerSection from "@/components/sections/ContributionLedgerSection";
import FeaturesSection from "@/components/sections/FeaturesSection";
import CardanoSection from "@/components/sections/CardanoSection";
import DiscoverySection from "@/components/sections/DiscoverySection";
import CTASection from "@/components/sections/CTASection";

export const metadata: Metadata = {
  title: "SkillSwap — Exchange Skills. Build Reputation.",
  description:
    "A peer-to-peer skill exchange network where every completed exchange creates a verifiable contribution record and builds your portable reputation on Cardano.",
};

export default function HomePage() {
  return (
    <main className="min-h-full">
      <PublicHeader />
      <HeroSection />
      <PerfectMatchSection />
      <StatsSection />
      <HowItWorksSection />
      <ContributionLedgerSection />
      <FeaturesSection />
      <CardanoSection />
      <DiscoverySection />
      <CTASection />
      <PublicFooter />
    </main>
  );
}
