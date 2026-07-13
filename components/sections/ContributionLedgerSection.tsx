"use client";

import { motion } from "framer-motion";
import { Chip } from "@heroui/react";
import SectionWrapper from "@/components/layouts/SectionWrapper";
import { fadeUp, stagger } from "@/lib/animations";

const records = [
  {
    id: "#00231",
    skill: "React Fundamentals",
    teacher: "Daniel",
    learner: "Sarah",
    date: "Jan 15, 2026",
  },
  {
    id: "#00198",
    skill: "Solidity Basics",
    teacher: "Maya",
    learner: "Kwame",
    date: "Jan 08, 2026",
  },
  {
    id: "#00156",
    skill: "UI/UX Design",
    teacher: "Carlos",
    learner: "Priya",
    date: "Dec 22, 2025",
  },
];


function ContributionCard({
  record,
}: {
  record: (typeof records)[0];
}) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-5 flex flex-col gap-4 h-full">
      <div className="flex items-start justify-between gap-3">
        <span className="font-mono text-xs text-muted pt-0.5">{record.id}</span>
        <Chip color="success" variant="soft" size="sm">
          Verified
        </Chip>
      </div>

      <div>
        <p className="text-base font-semibold text-foreground leading-snug">
          {record.skill}
        </p>
      </div>

      <div className="flex items-center gap-2 text-sm mt-auto">
        <div className="w-6 h-6 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-[10px] font-bold flex-shrink-0">
          {record.teacher[0]}
        </div>
        <span className="font-medium text-foreground">{record.teacher}</span>
        <span className="text-muted">→</span>
        <div className="w-6 h-6 rounded-full bg-surface border border-border flex items-center justify-center text-[10px] font-bold text-foreground flex-shrink-0">
          {record.learner[0]}
        </div>
        <span className="font-medium text-foreground">{record.learner}</span>
      </div>

      <p className="text-xs text-muted border-t border-border pt-3">{record.date}</p>
    </div>
  );
}

export default function ContributionLedgerSection() {
  return (
    <SectionWrapper id="ledger">
      <motion.div
        className="flex flex-col items-center text-center gap-3 mb-12"
        variants={fadeUp}
        whileInView="visible"
        initial="hidden"
        viewport={{ once: true, amount: 0.4 }}
      >
        <Chip color="accent" variant="soft" size="sm">
          Contribution Ledger
        </Chip>
        <h2 className="text-3xl md:text-4xl font-bold text-foreground">
          Every Exchange Leaves a Record
        </h2>
        <p className="text-base text-muted max-w-lg">
          Completed exchanges are logged as verifiable contribution records.
          Your history is transparent, portable, and permanently yours.
        </p>
      </motion.div>

      {/* Record cards */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
        variants={stagger}
        whileInView="visible"
        initial="hidden"
        viewport={{ once: true, amount: 0.3 }}
      >
        {records.map((record) => (
          <motion.div key={record.id} variants={fadeUp} className="h-full">
            <ContributionCard record={record} />
          </motion.div>
        ))}
      </motion.div>

    </SectionWrapper>
  );
}
