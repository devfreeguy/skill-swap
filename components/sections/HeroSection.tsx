"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@heroui/react";
import { useIsDarkMode } from "@/lib/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import { illustrations } from "@/constants/images";
import { fadeUp, stagger } from "@/lib/animations";

export default function HeroSection() {
  const isDark = useIsDarkMode();
  const isMobile = useIsMobile();

  const heroBGSrc = isDark
    ? isMobile
      ? illustrations.HeroBGPortraitDark
      : illustrations.HeroBGDark
    : isMobile
      ? illustrations.HeroBGPortrait
      : illustrations.HeroBG;

  return (
    <section className="relative min-h-dvh bg-background overflow-hidden bg-linear-to-b from-background via-background via-80% to-[#2B5139]">
      {/* Text + Buttons — top overlay */}
      <motion.div
        className="absolute top-0 left-0 right-0 z-10 flex flex-col items-center text-center pt-36 md:pt-44 px-4 gap-6"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        <div className="flex flex-col items-center gap-3 max-w-2xl">
          <motion.h1
            className="text-[40px] md:text-6xl text-foreground leading-tight"
            variants={fadeUp}
          >
            Teach What You <span className="text-accent">Know</span>.<br></br>{" "}
            Learn What You <span className="text-accent">Don&apos;t</span>.
          </motion.h1>
          <motion.p
            className="text-base md:text-lg text-muted max-w-xl"
            variants={fadeUp}
            transition={{ delay: 0.1, duration: 0.5, ease: "easeOut" }}
          >
            SkillSwap matches you with people who need your skill and have the
            skill you need.
          </motion.p>
        </div>

        <motion.div
          className="flex flex-col items-center gap-3"
          variants={fadeUp}
          transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
        >
          <Link href="/register">
            <Button
              size="lg"
              className="rounded-full w-48 bg-accent text-accent-foreground font-semibold"
            >
              Get Started
            </Button>
          </Link>
          <Link href="#how-it-works">
            <Button
              variant="secondary"
              size="lg"
              className="rounded-full w-48 border-border text-foreground"
            >
              See How It Works
            </Button>
          </Link>
        </motion.div>
      </motion.div>

      {/* Bottom image block */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 z-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
      >
        {/* Gradient overlay — blends image into background */}
        <div
          className="absolute top-0 left-0 right-0 h-2/3 z-10"
          style={{
            background:
              "linear-gradient(to bottom, var(--background) 0%, transparent 100%)",
          }}
        />

        {/* Single combined hero illustration */}
        <div
          className={`relative w-full ${isMobile ? "aspect-3/4" : "aspect-video"}`}
        >
          <Image
            src={heroBGSrc}
            alt="SkillSwap — Teach and Learn"
            fill
            className="object-cover object-bottom rounded-b-3xl"
            priority
          />
        </div>
      </motion.div>
    </section>
  );
}
