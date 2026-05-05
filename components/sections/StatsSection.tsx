"use client";

import { useEffect, useRef } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  animate,
  useInView,
} from "framer-motion";
import SectionWrapper from "@/components/layouts/SectionWrapper";
import { cn } from "@/lib/utils";
import { Card } from "@heroui/react";
import { IconBriefcase, IconTransform, IconUsers } from "@tabler/icons-react";
import { fadeUp, stagger } from "@/lib/animations";

const stats = [
  { Icon: IconUsers, rawValue: 1200, suffix: "+", label: "Users" },
  { Icon: IconTransform, rawValue: 340, suffix: "+", label: "Swaps" },
  { Icon: IconBriefcase, rawValue: 80, suffix: "+", label: "Skills" },
];

function StatValue({
  rawValue,
  suffix,
}: {
  rawValue: number;
  suffix: string;
}) {
  const count = useMotionValue(0);
  const formatted = useTransform(count, (v) => {
    const n = Math.round(v);
    return (n >= 1000 ? n.toLocaleString() : String(n)) + suffix;
  });
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (inView) {
      animate(count, rawValue, { duration: 1.5, ease: "easeOut" });
    }
  }, [inView, count, rawValue]);

  return <motion.span ref={ref}>{formatted}</motion.span>;
}

export default function StatsSection() {
  return (
    <SectionWrapper
      id="stats"
      className="bg-[#2B5139] rounded-b-3xl [&_>div]:p-4! md:p-12!"
    >
      <motion.div
        className="grid grid-cols-2 md:grid-cols-3 place-items-center gap-4 md:gap-6"
        variants={stagger}
        whileInView="visible"
        initial="hidden"
        viewport={{ once: true, amount: 0.4 }}
      >
        {stats.map(({ Icon, rawValue, suffix, label }, i) => (
          <motion.div
            key={label}
            className={cn("w-full", i === 0 ? "col-span-2 md:col-span-1" : "")}
            variants={fadeUp}
          >
            <Card className="w-full md:w-64 p-4 md:p-6 flex-row items-center bg-surface border border-border">
              <div className="flex items-center justify-center aspect-square p-3 rounded-xl bg-accent">
                <Icon className="text-accent-foreground" size={24} />
              </div>

              <div className="flex flex-col gap-1">
                <p className="text-xs md:text-sm text-muted">{label}</p>
                <p className="text-3xl text-foreground">
                  <StatValue rawValue={rawValue} suffix={suffix} />
                </p>
              </div>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </SectionWrapper>
  );
}
