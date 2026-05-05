"use client";

import { motion } from "framer-motion";
import SectionWrapper from "@/components/layouts/SectionWrapper";
import StepCard from "@/components/elements/StepCard";
import { IconUser, IconTransfer, IconCircleCheck } from "@tabler/icons-react";
import { fadeUp, stagger } from "@/lib/animations";

const steps = [
  {
    step: "01",
    icon: IconUser,
    title: "Tell Us What You've Got",
    description:
      "Register and drop your skills in two lines. What you can teach. What you want to learn. Your profile is ready.",
  },
  {
    step: "02",
    icon: IconTransfer,
    title: "We Find Your Match",
    description:
      "Our engine surfaces people whose skills align with yours, both ways. No searching. No filtering. Just your matches, waiting.",
  },
  {
    step: "03",
    icon: IconCircleCheck,
    title: "Swap. Prove. Grow.",
    description:
      "Request a swap with a small ADA commitment. Complete the exchange. Walk away with a verified proof record tied to your wallet.",
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
          Three steps between you and your next skill exchange.
        </p>
      </motion.div>

      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        variants={stagger}
        whileInView="visible"
        initial="hidden"
        viewport={{ once: true, amount: 0.4 }}
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
