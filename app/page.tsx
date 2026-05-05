import { Metadata } from "next";

import HeroSection from "@/components/sections/HeroSection";
import StatsSection from "@/components/sections/StatsSection";
import HowItWorksSection from "@/components/sections/HowItWorksSection";
import FeaturesSection from "@/components/sections/FeaturesSection";
import CTASection from "@/components/sections/CTASection";
import PublicHeader from "@/components/layouts/PublicHeader";
import PublicFooter from "@/components/layouts/PublicFooter";

export const metadata: Metadata = {
  title: "SkillSwap - Trade Skills, Not Money",
  description:
    "Join SkillSwap, the community where you trade skills instead of cash. Teach what you know, learn what you don't. Start swapping today!",
};

export default function HomePage() {
  return (
    <main className="min-h-full">
      <PublicHeader />
      <HeroSection />
      <StatsSection />
      <HowItWorksSection />
      <FeaturesSection />
      <CTASection />
      <PublicFooter />
    </main>
  );
}
