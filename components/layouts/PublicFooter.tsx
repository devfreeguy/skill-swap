"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  IconBrandX,
  IconBrandGithub,
  IconBrandDiscord,
} from "@tabler/icons-react";
import Logo from "@/components/elements/Logo";
import { fadeUp, fadeIn } from "@/lib/animations";

const links = [
  { label: "How it Works", href: "#how-it-works" },
  { label: "Features", href: "#features" },
  { label: "Register", href: "/register" },
  { label: "Login", href: "/login" },
];

const socials = [
  { icon: IconBrandX, href: "https://x.com" },
  { icon: IconBrandGithub, href: "https://github.com" },
  { icon: IconBrandDiscord, href: "https://discord.com" },
];

export default function PublicFooter() {
  return (
    <footer className="bg-background border-t border-border">
      <motion.div
        className="max-w-6xl mx-auto px-4 md:px-8 pt-16 pb-8 flex flex-col md:flex-row justify-between gap-12"
        variants={fadeUp}
        whileInView="visible"
        initial="hidden"
        viewport={{ once: true, amount: 0.4 }}
      >
        <div>
          <Logo />
        </div>

        <div className="flex flex-col gap-3">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-muted hover:text-foreground transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </motion.div>

      <div className="overflow-hidden px-4 md:px-8 pb-2">
        <motion.p
          className="text-[18vw] font-bold leading-none text-surface sm:text-center tracking-tight select-none"
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          viewport={{ once: true, amount: 0.4 }}
        >
          SkillSwap
        </motion.p>
      </div>

      <motion.div
        className="border-t border-border"
        variants={fadeIn}
        whileInView="visible"
        initial="hidden"
        viewport={{ once: true, amount: 0.4 }}
      >
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {socials.map((s) => (
              <a
                key={s.href}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted hover:text-foreground transition-colors"
              >
                <s.icon size={18} />
              </a>
            ))}
          </div>

          <p className="text-xs text-muted font-medium">Built on Cardano.</p>

          <p className="text-xs text-muted">
            © 2026 SkillSwap. All rights reserved.
          </p>
        </div>
      </motion.div>
    </footer>
  );
}
