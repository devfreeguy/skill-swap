"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button, Link } from "@heroui/react";
import NextLink from "next/link";
import { IconMenu2, IconX } from "@tabler/icons-react";

import Logo from "@/components/elements/Logo";
import ThemeToggle from "@/components/elements/ThemeToggle";

const links = [
  { label: "How it Works", href: "#how-it-works" },
  { label: "Features", href: "#features" },
  { label: "About", href: "#about" },
];

export default function PublicHeader() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!(e.target as Element).closest("nav")) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <header className="fixed top-2 md:top-4 left-0 w-full py-4 z-50">
      <nav className="max-w-5xl mx-auto px-4">
        <motion.div
          className="flex items-center justify-between rounded-full border px-4 py-2 shadow-sm backdrop-blur-md"
          style={{
            borderColor: "var(--border)",
            backgroundColor:
              "color-mix(in srgb, var(--surface) 85%, transparent)",
          }}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <Logo />

          <div className="hidden md:flex items-center gap-6">
            <Link
              href="#how-it-works"
              className="no-underline text-sm transition-colors text-muted hover:text-foreground"
            >
              How it works
            </Link>
            <Link
              href="#features"
              className="no-underline text-sm transition-colors text-muted hover:text-foreground"
            >
              Features
            </Link>
            <Link
              href="#about"
              className="no-underline text-sm transition-colors text-muted hover:text-foreground"
            >
              About
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <NextLink href="/login" className="hidden md:flex">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full border-[--accent] text-[--accent]"
              >
                Login
              </Button>
            </NextLink>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex md:hidden items-center justify-center w-8 h-8 text-foreground"
            >
              <AnimatePresence mode="wait">
                {isOpen ? (
                  <motion.div
                    key="close"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <IconX size={18} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="open"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <IconMenu2 size={18} />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>
        </motion.div>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8, scaleY: 0.95 }}
              animate={{ opacity: 1, y: 0, scaleY: 1 }}
              exit={{ opacity: 0, y: -8, scaleY: 0.95 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              style={{ transformOrigin: "top" }}
              className="md:hidden mt-1 rounded-2xl border border-[--border] bg-[--surface] backdrop-blur-md shadow-lg flex flex-col px-4 py-4 gap-1"
            >
              {links.map((link) => (
                <NextLink
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="text-sm text-muted hover:text-foreground transition-colors py-2 px-2 rounded-lg hover:bg-[--surface-secondary]"
                >
                  {link.label}
                </NextLink>
              ))}

              <div className="h-px bg-[--border] my-1" />

              <NextLink href="/login" onClick={() => setIsOpen(false)}>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full border-[--accent] text-[--accent] w-full"
                >
                  Login
                </Button>
              </NextLink>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </header>
  );
}
