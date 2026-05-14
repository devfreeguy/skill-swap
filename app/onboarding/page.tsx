"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import type { Key } from "@heroui/react";
import {
  Alert,
  Autocomplete,
  Button,
  Card,
  EmptyState,
  Label,
  ListBox,
  SearchField,
  Tag,
  TagGroup,
  useFilter,
} from "@heroui/react";
import Logo from "@/components/elements/Logo";
import LemniscateLoader from "@/components/layouts/Loader";
import { fadeUp, stagger } from "@/lib/animations";
import skillsData from "@/assets/data/skills.json";
import { IconX } from "@tabler/icons-react";

const ALL_SKILLS: string[] = skillsData.skills;

type SessionUser = {
  name: string;
  teachSkill?: string | null;
  learnSkill?: string | null;
};

function SkillSelector({
  label,
  selected,
  onChange,
}: {
  label: string;
  selected: string[];
  onChange: (skills: string[]) => void;
}) {
  const { contains } = useFilter({ sensitivity: "base" });

  return (
    <Autocomplete
      fullWidth
      placeholder="Type to search skills..."
      selectionMode="multiple"
      value={selected as Key[]}
      onChange={(keys) => onChange(keys != null ? (keys as string[]) : [])}
    >
      <Label>{label}</Label>
      <Autocomplete.Trigger className="bg-background min-h-none">
        <Autocomplete.Value>
          {({ defaultChildren, isPlaceholder, state }) => {
            if (isPlaceholder || state.selectedItems.length === 0) {
              return defaultChildren;
            }
            return (
              <TagGroup
                size="sm"
                onRemove={(keys) =>
                  onChange(selected.filter((s) => !keys.has(s)))
                }
              >
                <TagGroup.List>
                  {state.selectedItems.map((item) => (
                    <Tag key={item.key as string} id={item.key as string}>
                      {item.key as string}
                    </Tag>
                  ))}
                </TagGroup.List>
              </TagGroup>
            );
          }}
        </Autocomplete.Value>
        <Autocomplete.ClearButton />
        <Autocomplete.Indicator />
      </Autocomplete.Trigger>

      <Autocomplete.Popover>
        <Autocomplete.Filter filter={contains}>
          <SearchField
            name="search"
            aria-label="Search skills"
            variant="secondary"
          >
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Search skills..." />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
          <ListBox
            renderEmptyState={() => <EmptyState>No skills found</EmptyState>}
          >
            {ALL_SKILLS.slice(0, 20).map((skill) => (
              <ListBox.Item key={skill} id={skill} textValue={skill}>
                {skill}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Autocomplete.Filter>
      </Autocomplete.Popover>
    </Autocomplete>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [teachSkills, setTeachSkills] = useState<string[]>([]);
  const [learnSkills, setLearnSkills] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          router.replace("/login");
          return;
        }
        if (data.teachSkill && data.learnSkill) {
          router.replace("/dashboard");
          return;
        }
        setUser(data);
        setAuthLoading(false);
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  async function handleSubmit() {
    setError("");
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teachSkills, learnSkills }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }
      router.push("/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (authLoading) {
    return <LemniscateLoader loading text="Loading..." overlayOpacity={1} />;
  }

  return (
    <main className="min-h-dvh flex items-center justify-center bg-background px-4 py-16">
      <LemniscateLoader
        loading={isSubmitting}
        text="Saving..."
        overlayOpacity={1}
      />

      <motion.div
        className="w-full max-w-lg"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={fadeUp}>
          <Card className="bg-[--surface] border border-[--border] rounded-2xl p-8 flex flex-col gap-6 overflow-visible">
            <div className="flex justify-center">
              <Logo />
            </div>

            <div className="flex flex-col gap-2 text-center">
              <h1 className="text-2xl font-bold text-foreground">
                Welcome, {user?.name}!
              </h1>
              <p className="text-sm text-muted">
                Tell us what you can teach and what you want to learn. You can
                always update this later from your profile.
              </p>
            </div>

            <SkillSelector
              label="What can you teach?"
              selected={teachSkills}
              onChange={setTeachSkills}
            />

            <SkillSelector
              label="What do you want to learn?"
              selected={learnSkills}
              onChange={setLearnSkills}
            />

            {error && (
              <Alert status="danger">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Description>{error}</Alert.Description>
                </Alert.Content>
              </Alert>
            )}

            <Button
              onPress={handleSubmit}
              isPending={isSubmitting}
              className="w-full rounded-full bg-accent text-accent-foreground font-semibold"
            >
              {isSubmitting ? "Saving..." : "Find My Matches"}
            </Button>

            <Link
              href="/dashboard"
              className="text-sm text-muted hover:text-foreground text-center transition-colors"
            >
              Skip for now
            </Link>
          </Card>
        </motion.div>
      </motion.div>
    </main>
  );
}
