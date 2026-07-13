"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@heroui/react";
import { useIsDarkMode } from "@/lib/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import { illustrations } from "@/constants/images";
import { fadeUp, stagger } from "@/lib/animations";
import { useAuthDest } from "@/hooks/useAuthDest";

export default function HeroSection() {
  const isDark = useIsDarkMode();
  const isMobile = useIsMobile();
  const authDest = useAuthDest();

  const heroBGSrc = isDark
    ? isMobile
      ? illustrations.HeroBGPortraitDark
      : illustrations.HeroBGDark
    : isMobile
      ? illustrations.HeroBGPortrait
      : illustrations.HeroBG;

  return (
    <section className="relative min-h-dvh bg-background overflow-hidden">
      {/* Text + Buttons - top overlay */}
      <motion.div
        className="absolute h-full top-0 left-0 right-0 z-10 flex flex-col items-center text-center pt-36 md:pt-44 md:pb-12 px-4 gap-6"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        <div className="flex flex-col items-center justify-between gap-3">
          <motion.h1
            className="text-[40px] lg:text-6xl text-foreground leading-tight font-medium"
            variants={fadeUp}
          >
            Exchange Skills. Build Reputation.
            <br />
            Own Your <span className="text-accent">Contributions</span>.
          </motion.h1>

          <motion.p
            className="text-base md:text-xl text-muted/90 max-w-xl"
            variants={fadeUp}
            transition={{ delay: 0.1, duration: 0.5, ease: "easeOut" }}
          >
            Every completed skill exchange creates a verifiable contribution
            record that builds your portable reputation on the network.
          </motion.p>
        </div>

        <motion.div
          className="flex flex-col md:flex-row items-center gap-3"
          variants={fadeUp}
          transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
        >
          <Link href={authDest}>
            <Button
              size="lg"
              className="rounded-full w-48 bg-accent text-accent-foreground font-semibold shadow"
            >
              {authDest === "/dashboard" ? "Go to Dashboard" : "Find a Match"}
            </Button>
          </Link>
          <Link href="#discovery">
            <Button
              variant="secondary"
              size="lg"
              className="rounded-full w-48 border-border text-foreground shadow"
            >
              Browse Community
            </Button>
          </Link>
        </motion.div>
      </motion.div>

      {/* Bottom image block */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 z-0 flex justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
      >
        {/* Single combined hero illustration */}
        <div
          className={`relative xl:-bottom-40 lg:-bottom-20 w-full ${isMobile ? "aspect-3/4" : "aspect-video"}`}
        >
          <Image
            src={heroBGSrc}
            alt="SkillSwap - Teach and Learn"
            fill
            priority
            className="object-cover object-bottom"
          />
          {/* Gradient shade overlay - fades the image bottom into the background */}
        </div>
        <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(to_top,var(--background),transparent_20%)]" />
      </motion.div>
    </section>
  );
}
