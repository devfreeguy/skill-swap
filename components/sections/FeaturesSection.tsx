"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import SectionWrapper from "@/components/layouts/SectionWrapper";
import { illustrations } from "@/constants/images";
import { fadeUp, fadeLeft, stagger } from "@/lib/animations";
import {
  IconTargetArrow,
  IconShieldCheck,
  IconCurrencyBitcoin,
  IconLink,
} from "@tabler/icons-react";

const features = [
  {
    icon: IconTargetArrow,
    title: "Perfect Match Detection",
    description:
      "Finds users who teach what you want and want what you teach, both ways. Not one-sided discovery.",
  },
  {
    icon: IconShieldCheck,
    title: "Proof of Skill Swap",
    description:
      "Every completed exchange generates a verifiable record with ADA tx hash, skills exchanged, and timestamp. Your history, permanently traceable.",
  },
  {
    icon: IconCurrencyBitcoin,
    title: "ADA-Gated Swap Requests",
    description:
      "A small ADA fee filters out time-wasters. Every request is intentional, no spam, no ghosting.",
  },
  {
    icon: IconLink,
    title: "Blockchain-Ready Records",
    description:
      "Proof records are structured for future Cardano anchoring. Your skill exchanges become on-chain credentials over time.",
  },
];

export default function FeaturesSection() {
  return (
    <SectionWrapper id="features">
      <motion.div
        className="flex flex-col items-center text-center gap-3 mb-12"
        variants={fadeUp}
        whileInView="visible"
        initial="hidden"
        viewport={{ once: true, amount: 0.4 }}
      >
        <h2 className="text-3xl md:text-4xl font-bold text-foreground">
          Built Different
        </h2>
        <p className="text-base text-muted max-w-lg">
          Four features you will not find anywhere else.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_340px] gap-4">
        {/* Feature cards — below image on mobile, left on desktop */}
        <motion.div
          className="order-last md:order-first grid lg:grid-cols-2 gap-4"
          variants={stagger}
          whileInView="visible"
          initial="hidden"
          viewport={{ once: true, amount: 0.4 }}
        >
          {features.map((f, i) => (
            <motion.div
              key={i}
              className="bg-surface border border-border rounded-2xl p-5 flex flex-col gap-3"
              variants={fadeUp}
            >
              <div className="w-10 h-10 rounded-xl bg-accent text-accent-foreground flex items-center justify-center">
                <f.icon size={20} />
              </div>
              <h3 className="text-base font-semibold text-foreground">
                {f.title}
              </h3>
              <p className="text-sm text-muted leading-relaxed">
                {f.description}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Image — first on mobile, right on desktop */}
        <motion.div
          className="order-first md:order-last relative rounded-2xl overflow-hidden border border-border aspect-9/16 md:aspect-auto md:min-h-full w-full"
          variants={fadeLeft}
          whileInView="visible"
          initial="hidden"
          viewport={{ once: true, amount: 0.4 }}
        >
          <Image
            src={illustrations.FeaturesPortrait}
            alt="SkillSwap Features"
            fill
            className="object-cover object-center"
          />
        </motion.div>
      </div>
    </SectionWrapper>
  );
}
