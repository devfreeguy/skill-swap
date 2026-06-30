"use client";

import { motion } from "framer-motion";
import SectionWrapper from "@/components/layouts/SectionWrapper";
import { fadeUp, stagger } from "@/lib/animations";
import {
  IconWallet,
  IconFileCheck,
  IconShieldCheck,
  IconHistory,
} from "@tabler/icons-react";

const pillars = [
  {
    icon: IconWallet,
    title: "Wallet-Based Identity",
    description:
      "Connect with any Cardano-compatible wallet. Your identity is your address - no centralized login required.",
  },
  {
    icon: IconFileCheck,
    title: "On-Chain-Ready Records",
    description:
      "Contribution records are structured for future Cardano blockchain anchoring. The data layer is ready when the protocol is.",
  },
  {
    icon: IconShieldCheck,
    title: "Future-Proof Reputation",
    description:
      "Your reputation travels with your wallet address. Any compatible protocol can read and verify your contribution history.",
  },
  {
    icon: IconHistory,
    title: "Verifiable Exchange History",
    description:
      "Every exchange is anchored to an ADA transaction hash. Permanent, traceable, and independent of SkillSwap's servers.",
  },
];

export default function CardanoSection() {
  return (
    <SectionWrapper id="cardano">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-start">
        {/* Left: positioning text */}
        <motion.div
          className="flex flex-col gap-6"
          variants={fadeUp}
          whileInView="visible"
          initial="hidden"
          viewport={{ once: true, amount: 0.4 }}
        >
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-semibold uppercase tracking-widest text-accent">
              Infrastructure
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Powered by Cardano
            </h2>
          </div>
          <p className="text-base text-muted leading-relaxed">
            SkillSwap is built on Cardano not for marketing, but because
            verifiable proof of contribution requires a credible, energy-efficient
            foundation. Your exchange history is structured to be anchored,
            portable, and independently verifiable.
          </p>
          <div className="h-px bg-border" />
          <p className="text-sm text-muted leading-relaxed">
            The ADA-gated swap request model serves a functional purpose:
            it ensures every exchange request that reaches you was made with
            intent. No spam, no ghosting.
          </p>
          <div className="flex items-center gap-3 mt-2">
            <div className="h-1.5 w-1.5 rounded-full bg-accent" />
            <p className="text-xs text-muted font-medium">
              ADA payments verified via Blockfrost before any swap is created
            </p>
          </div>
        </motion.div>

        {/* Right: feature pillars */}
        <motion.div
          className="flex flex-col gap-3"
          variants={stagger}
          whileInView="visible"
          initial="hidden"
          viewport={{ once: true, amount: 0.3 }}
        >
          {pillars.map((pillar) => (
            <motion.div
              key={pillar.title}
              className="flex items-start gap-4 bg-surface border border-border rounded-xl p-4"
              variants={fadeUp}
            >
              <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-accent text-accent-foreground flex items-center justify-center">
                <pillar.icon size={18} />
              </div>
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-semibold text-foreground">
                  {pillar.title}
                </p>
                <p className="text-sm text-muted leading-relaxed">
                  {pillar.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </SectionWrapper>
  );
}
