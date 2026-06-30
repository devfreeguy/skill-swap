"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@heroui/react";
import SectionWrapper from "@/components/layouts/SectionWrapper";
import { illustrations } from "@/constants/images";
import { fadeUp } from "@/lib/animations";

export default function CTASection() {
  return (
    <SectionWrapper id="cta">
      <motion.div
        className="relative rounded-2xl overflow-hidden bg-[#01060C] min-h-105 border"
        initial={{ opacity: 0, scale: 0.97 }}
        whileInView={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        viewport={{ once: true, amount: 0.4 }}
      >
        <div className="absolute bottom-0 left-0 right-0 h-2/3">
          <Image
            src={illustrations.CTAimage}
            alt="SkillSwap"
            fill
            className="object-cover object-bottom"
          />
        </div>

        <div
          className="absolute bottom-0 left-0 right-0 h-2/3"
          style={{
            background: "linear-gradient(to top, transparent 0%, #01060C 100%)",
          }}
        />

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center gap-6 px-6 py-16">
          <p className="text-xs font-medium uppercase tracking-widest text-white/50">
            Start Building Your Reputation
          </p>

          <motion.h2
            className="text-3xl md:text-5xl font-bold text-white max-w-2xl leading-tight"
            variants={fadeUp}
            whileInView="visible"
            initial="hidden"
            viewport={{ once: true, amount: 0.4 }}
            transition={{ delay: 0.1, duration: 0.5, ease: "easeOut" }}
          >
            Build Your Reputation. One Exchange at a Time.
          </motion.h2>

          <motion.div
            className="flex flex-col items-center gap-6"
            variants={fadeUp}
            whileInView="visible"
            initial="hidden"
            viewport={{ once: true, amount: 0.4 }}
            transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
          >
            <p className="text-base text-white/60 max-w-lg">
              Every exchange you complete becomes a verifiable contribution
              record. Your reputation is earned, not claimed.
            </p>

            <div className="flex items-center gap-4 flex-wrap justify-center">
              <Link href="/login">
                <Button
                  size="lg"
                  className="rounded-full bg-white text-[#01060C] font-semibold px-8"
                >
                  Find a Match
                </Button>
              </Link>
              <Link href="#how-it-works">
                <Button
                  variant="outline"
                  size="lg"
                  className="rounded-full border-white text-white px-8"
                >
                  How It Works
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </SectionWrapper>
  );
}
