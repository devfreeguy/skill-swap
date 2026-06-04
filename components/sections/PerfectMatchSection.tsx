"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Button, Chip } from "@heroui/react";
import SectionWrapper from "@/components/layouts/SectionWrapper";
import { fadeUp, stagger } from "@/lib/animations";
import { IconArrowsExchange } from "@tabler/icons-react";

const YOU = { teaches: "React", wants: "Aiken" };
const MATCH = { name: "David M.", teaches: "Aiken", wants: "React" };

function SkillRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-background rounded-xl px-3 py-2.5">
      <p className="text-[10px] font-medium uppercase tracking-widest text-muted mb-0.5">
        {label}
      </p>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

export default function PerfectMatchSection() {
  return (
    <SectionWrapper id="match">
      <div className="flex flex-col items-center gap-12">
        <motion.div
          className="flex flex-col items-center text-center gap-3"
          variants={fadeUp}
          whileInView="visible"
          initial="hidden"
          viewport={{ once: true, amount: 0.4 }}
        >
          <Chip color="accent" variant="soft" size="sm">
            Bidirectional Matching
          </Chip>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            Every Match Works Both Ways
          </h2>
          <p className="text-base text-muted max-w-lg">
            The system only surfaces matches where both users can teach what
            the other wants to learn. No one-sided connections, no cold
            outreach.
          </p>
        </motion.div>

        <motion.div
          className="flex flex-col md:flex-row items-center gap-4 md:gap-6 w-full justify-center"
          variants={stagger}
          whileInView="visible"
          initial="hidden"
          viewport={{ once: true, amount: 0.4 }}
        >
          {/* Your profile card */}
          <motion.div
            className="bg-surface border-2 border-accent rounded-2xl p-5 flex flex-col gap-3 w-full max-w-[240px]"
            variants={fadeUp}
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-accent">
              You
            </p>
            <div className="flex flex-col gap-2">
              <SkillRow label="Teaches" value={YOU.teaches} />
              <SkillRow label="Wants" value={YOU.wants} />
            </div>
          </motion.div>

          {/* Connector */}
          <motion.div
            className="flex flex-col items-center gap-1.5 flex-shrink-0"
            variants={fadeUp}
          >
            <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
              <IconArrowsExchange size={18} className="text-accent-foreground" />
            </div>
            <div className="flex flex-col items-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-accent">
                Perfect Match
              </p>
              <p className="text-[10px] text-muted">Both sides align</p>
            </div>
          </motion.div>

          {/* Match's profile card */}
          <motion.div
            className="bg-surface border border-border rounded-2xl p-5 flex flex-col gap-3 w-full max-w-[240px]"
            variants={fadeUp}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted">
                {MATCH.name}
              </p>
              <Chip color="success" variant="soft" size="sm">
                Verified
              </Chip>
            </div>
            <div className="flex flex-col gap-2">
              <SkillRow label="Teaches" value={MATCH.teaches} />
              <SkillRow label="Wants" value={MATCH.wants} />
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          variants={fadeUp}
          whileInView="visible"
          initial="hidden"
          viewport={{ once: true, amount: 0.4 }}
        >
          <Link href="/register">
            <Button
              size="lg"
              className="rounded-full bg-accent text-accent-foreground font-semibold px-10"
            >
              Request Exchange
            </Button>
          </Link>
        </motion.div>
      </div>
    </SectionWrapper>
  );
}
