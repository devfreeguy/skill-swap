"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Button, Chip } from "@heroui/react";
import SectionWrapper from "@/components/layouts/SectionWrapper";
import { fadeUp, stagger } from "@/lib/animations";
import { IconEye, IconArrowsExchange, IconBookmark } from "@tabler/icons-react";
import ScrollArea from "@/components/elements/ScrollArea";
import { useAuthDest } from "@/hooks/useAuthDest";

const users = [
  {
    initials: "MA",
    name: "Maya A.",
    teaches: "Solidity",
    wants: "Graphic Design",
    contributions: 12,
  },
  {
    initials: "KB",
    name: "Kwame B.",
    teaches: "UI/UX Design",
    wants: "Python",
    contributions: 8,
  },
  {
    initials: "PC",
    name: "Priya C.",
    teaches: "Machine Learning",
    wants: "Cardano Dev",
    contributions: 21,
  },
  {
    initials: "CD",
    name: "Carlos D.",
    teaches: "Spanish",
    wants: "React",
    contributions: 5,
  },
  {
    initials: "SE",
    name: "Sarah E.",
    teaches: "Photography",
    wants: "Video Editing",
    contributions: 14,
  },
  {
    initials: "JF",
    name: "James F.",
    teaches: "Smart Contracts",
    wants: "3D Modeling",
    contributions: 9,
  },
];

function UserCard({ user, authDest }: { user: (typeof users)[0]; authDest: string }) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-5 flex flex-col gap-4 min-w-55 md:min-w-0 w-full">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-sm font-bold select-none">
          {user.initials}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            {user.name}
          </p>
          <p className="text-xs text-muted">
            {user.contributions} contributions
          </p>
        </div>
      </div>

      {/* Skills */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted w-14 shrink-0">Teaches</span>
          <Chip color="accent" variant="soft" size="sm">
            {user.teaches}
          </Chip>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted w-14 shrink-0">Wants</span>
          <Chip size="sm">{user.wants}</Chip>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-auto">
        <Link href={authDest} className="flex-1">
          <Button
            size="sm"
            className="w-full gap-1.5 text-xs bg-accent text-accent-foreground"
          >
            <IconArrowsExchange size={13} />
            Exchange
          </Button>
        </Link>

        <Link href={authDest}>
          <Button
            variant="tertiary"
            size="sm"
            aria-label="Save user"
            isIconOnly
            className="aspect-square w-fit"
          >
            <IconBookmark size={13} />
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function DiscoverySection() {
  const authDest = useAuthDest();
  return (
    <SectionWrapper id="discovery">
      <motion.div
        className="flex flex-col items-center text-center gap-3 mb-10"
        variants={fadeUp}
        whileInView="visible"
        initial="hidden"
        viewport={{ once: true, amount: 0.4 }}
      >
        <Chip color="accent" variant="soft" size="sm">
          Community
        </Chip>
        <h2 className="text-3xl md:text-4xl font-bold text-foreground">
          Browse the Network
        </h2>
        <p className="text-base text-muted max-w-lg">
          No perfect match yet? Explore who&apos;s on the network. See what
          skills are available and request exchanges directly.
        </p>
      </motion.div>

      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        variants={stagger}
        whileInView="visible"
        initial="hidden"
        viewport={{ once: true, amount: 0.2 }}
      >
        {users.map((user) => (
          <motion.div key={user.name} variants={fadeUp} className="w-full">
            <UserCard user={user} authDest={authDest} />
          </motion.div>
        ))}
      </motion.div>
    </SectionWrapper>
  );
}
