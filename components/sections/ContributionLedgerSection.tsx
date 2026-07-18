"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Chip } from "@heroui/react";
import SectionWrapper from "@/components/layouts/SectionWrapper";
import { fadeUp, stagger } from "@/lib/animations";

type RecentSwap = {
  id: string;
  skill: string;
  initiatorName: string;
  receiverName: string;
  completedAt: string;
  verified: boolean;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function ContributionCard({ record }: { record: RecentSwap }) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-5 flex flex-col gap-4 h-full">
      <div className="flex items-start justify-between gap-3">
        <span className="font-mono text-xs text-muted pt-0.5">{record.id}</span>
        <Chip color={record.verified ? "success" : undefined} variant="soft" size="sm">
          {record.verified ? "Verified" : "Completed"}
        </Chip>
      </div>

      <p className="text-base font-semibold text-foreground leading-snug">
        {record.skill}
      </p>

      <div className="flex items-center gap-2 text-sm mt-auto">
        <div className="w-6 h-6 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-[10px] font-bold flex-shrink-0">
          {record.initiatorName[0].toUpperCase()}
        </div>
        <span className="font-medium text-foreground">
          {record.initiatorName.split(" ")[0]}
        </span>
        <span className="text-muted">→</span>
        <div className="w-6 h-6 rounded-full bg-surface border border-border flex items-center justify-center text-[10px] font-bold text-foreground flex-shrink-0">
          {record.receiverName[0].toUpperCase()}
        </div>
        <span className="font-medium text-foreground">
          {record.receiverName.split(" ")[0]}
        </span>
      </div>

      <p className="text-xs text-muted border-t border-border pt-3">
        {formatDate(record.completedAt)}
      </p>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="bg-surface border border-border rounded-2xl p-5 flex flex-col gap-4 h-full animate-pulse">
      <div className="flex items-start justify-between gap-3">
        <div className="h-3 w-14 rounded bg-border" />
        <div className="h-5 w-16 rounded-full bg-border" />
      </div>
      <div className="h-4 w-3/4 rounded bg-border" />
      <div className="flex items-center gap-2 mt-auto">
        <div className="w-6 h-6 rounded-full bg-border" />
        <div className="h-3 w-14 rounded bg-border" />
        <div className="h-3 w-4 rounded bg-border" />
        <div className="w-6 h-6 rounded-full bg-border" />
        <div className="h-3 w-14 rounded bg-border" />
      </div>
      <div className="border-t border-border pt-3">
        <div className="h-3 w-20 rounded bg-border" />
      </div>
    </div>
  );
}

export default function ContributionLedgerSection() {
  const [records, setRecords] = useState<RecentSwap[] | null>(null);

  useEffect(() => {
    fetch("/api/swaps/recent")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setRecords(data);
      })
      .catch(() => setRecords([]));
  }, []);

  const showSkeletons = records === null;
  const isEmpty = records !== null && records.length === 0;

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

      {isEmpty ? null : (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
          variants={stagger}
          whileInView="visible"
          initial="hidden"
          viewport={{ once: true, amount: 0.3 }}
        >
          {showSkeletons
            ? [0, 1, 2].map((i) => (
                <motion.div key={i} variants={fadeUp} className="h-full">
                  <CardSkeleton />
                </motion.div>
              ))
            : records.map((record) => (
                <motion.div key={record.id} variants={fadeUp} className="h-full">
                  <ContributionCard record={record} />
                </motion.div>
              ))}
        </motion.div>
      )}
    </SectionWrapper>
  );
}
