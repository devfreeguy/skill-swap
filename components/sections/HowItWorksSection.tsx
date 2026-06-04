"use client";

import { motion } from "framer-motion";
import SectionWrapper from "@/components/layouts/SectionWrapper";
import StepCard from "@/components/elements/StepCard";
import {
  IconUser,
  IconTargetArrow,
  IconCurrencyBitcoin,
  IconTransfer,
  IconCircleCheck,
  IconCertificate,
} from "@tabler/icons-react";
import { fadeUp, stagger } from "@/lib/animations";

const steps = [
  {
    step: "01",
    icon: IconUser,
    title: "Set Your Skills",
    description:
      "Register and declare two things: what you can teach, and what you want to learn. Your profile is your position in the network.",
  },
  {
    step: "02",
    icon: IconTargetArrow,
    title: "Find a Match",
    description:
      "The system surfaces only bidirectional matches — users who teach what you want and want what you teach. No one-sided connections.",
  },
  {
    step: "03",
    icon: IconCurrencyBitcoin,
    title: "Request Exchange",
    description:
      "Submit an ADA-gated swap request. The small commitment filters uncommitted users. Every request that reaches you is intentional.",
  },
  {
    step: "04",
    icon: IconTransfer,
    title: "Complete Session",
    description:
      "Deliver your skill to your match. Receive theirs. Both sides fulfil their side of the exchange before the record is created.",
  },
  {
    step: "05",
    icon: IconCircleCheck,
    title: "Submit Proof",
    description:
      "Both parties confirm delivery independently. When both sides confirm, the system moves to verification. No single party controls this.",
  },
  {
    step: "06",
    icon: IconCertificate,
    title: "Earn Your Record",
    description:
      "A verified contribution record is created with the exchange details, ADA transaction hash, and timestamp. It belongs to you.",
  },
];

export default function HowItWorksSection() {
  return (
    <SectionWrapper id="how-it-works">
      <motion.div
        className="flex flex-col items-center text-center gap-3 mb-16"
        variants={fadeUp}
        whileInView="visible"
        initial="hidden"
        viewport={{ once: true, amount: 0.4 }}
      >
        <h2 className="text-3xl md:text-4xl font-bold text-foreground">
          How It Works
        </h2>
        <p className="text-base text-muted max-w-lg">
          Six steps from profile to verified contribution record.
        </p>
      </motion.div>

      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        variants={stagger}
        whileInView="visible"
        initial="hidden"
        viewport={{ once: true, amount: 0.2 }}
      >
        {steps.map((step) => (
          <motion.div key={step.step} variants={fadeUp}>
            <StepCard
              step={step.step}
              icon={step.icon}
              title={step.title}
              description={step.description}
            />
          </motion.div>
        ))}
      </motion.div>
    </SectionWrapper>
  );
}
