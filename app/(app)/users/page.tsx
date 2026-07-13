"use client";

import LemniscateLoader from "@/components/layouts/Loader";
import UserCard, { type UserCardData } from "@/components/cards/UserCard";
import FeaturedMatchCard, {
  type FeaturedMatchData,
} from "@/components/cards/FeaturedMatchCard";
import { parseSkills } from "@/lib/skills";
import { matchPercent } from "@/lib/utils";
import type { MatchType } from "@/lib/matching";
import FilterPill from "@/components/users/FilterPill";
import { Button, Card } from "@heroui/react";
import { IconStar, IconTrendingUp } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

type MatchUser = UserCardData & {
  score: number;
  type: MatchType;
  teachOverlap: string[];
  learnOverlap: string[];
};

// ─── Page ────────────────────────────────────────────────────────────────────

export default function DiscoverPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserCardData[]>([]);
  const [matches, setMatches] = useState<MatchUser[]>([]);
  const [topSkills, setTopSkills] = useState<{ name: string; count: number }[]>([]);
  const [search, setSearch] = useState("");
  const [onlyPerfect, setOnlyPerfect] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/users").then((r) => r.json()),
      fetch("/api/users/matches").then((r) => r.json()),
      fetch("/api/users/top-skills").then((r) => r.json()),
    ])
      .then(([me, userData, matchData, skillData]) => {
        if (cancelled) return;
        if (me.error) {
          router.replace("/login");
          return;
        }
        setUsers(Array.isArray(userData) ? userData : []);
        setMatches(Array.isArray(matchData) ? matchData : []);
        setTopSkills(Array.isArray(skillData) ? skillData : []);
        setLoading(false);
      })
      .catch(() => { if (!cancelled) router.replace("/login"); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading)
    return <LemniscateLoader loading text="Loading..." overlayOpacity={1} />;

  // Featured perfect matches (top 2 with PERFECT_MATCH type)
  const featuredMatches: FeaturedMatchData[] = matches
    .filter((m) => m.type === "PERFECT_MATCH")
    .slice(0, 2)
    .map((m) => ({ ...m, matchPct: matchPercent(m.score) }));

  // Network grid - all users, filtered by search
  const q = search.toLowerCase().trim();
  const filtered = users.filter((u) => {
    if (!q) return true;
    return (
      u.name.toLowerCase().includes(q) ||
      [...parseSkills(u.teachSkill), ...parseSkills(u.learnSkill)].some((s) =>
        s.toLowerCase().includes(q),
      )
    );
  });

  // If "Match Type: Perfect" is toggled, further filter to match IDs
  const perfectIds = new Set(
    matches.filter((m) => m.type === "PERFECT_MATCH").map((m) => m.id),
  );
  const gridUsers = onlyPerfect
    ? filtered.filter((u) => perfectIds.has(u.id))
    : filtered;

  return (
    <div className="flex flex-1 min-h-0">
      {/* ── Main content ──────────────────────────────────────────── */}
      <div className="flex-1 px-6 py-6 flex flex-col gap-8 overflow-y-auto min-w-0">
        {/* Heading */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Discover Talent
          </h1>
          <p className="text-muted mt-1">
            Find people to learn from and exchange skills with.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <FilterPill
            label="Match Type: Perfect"
            active={onlyPerfect}
            onClick={() => setOnlyPerfect((v) => !v)}
          />
        </div>

        {/* Featured Perfect Matches */}
        {featuredMatches.length > 0 && (
          <section>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-4">
              <IconStar size={20} className="text-warning" />
              Featured Perfect Matches
            </h2>
            <div className="flex flex-col gap-3">
              {featuredMatches.map((m) => (
                <FeaturedMatchCard key={m.id} match={m} />
              ))}
            </div>
          </section>
        )}

        {/* Explore the Network */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              Explore the Network
            </h2>
            <span className="text-sm text-muted">
              {gridUsers.length} people
            </span>
          </div>

          {/* Search (inline for this section) */}
          <div className="relative mb-4 max-w-sm">
            <input
              type="text"
              placeholder="Filter by name or skill..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent/50 transition-colors"
            />
          </div>

          {gridUsers.length === 0 ? (
            <Card className="bg-surface border border-border rounded-2xl p-12 text-center text-muted">
              {search ? `No results for "${search}".` : "No users found."}
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {gridUsers.map((u) => (
                <UserCard key={u.id} user={u} />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ── Right sidebar ─────────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-72 shrink-0 border-l border-border px-5 py-6 gap-6 overflow-y-auto">
        {/* Top Skills */}
        <section>
          <div className="flex items-center gap-2 mb-1">
            <IconTrendingUp size={18} className="text-accent" />
            <h3 className="font-semibold text-foreground">Top Skills</h3>
          </div>
          <p className="text-xs text-muted mb-4">
            Most popular skills across the network.
          </p>

          {topSkills.length === 0 ? (
            <p className="text-xs text-muted">No skills data yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {topSkills.map((skill, i) => (
                <div key={skill.name} className="flex items-center gap-3">
                  <span className="text-sm text-muted w-4 shrink-0">{i + 1}</span>
                  <div className="flex-1 flex items-center gap-2 min-w-0">
                    <div className="size-8 rounded-lg bg-surface border border-border flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-muted">
                        {skill.name.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-foreground truncate">
                      {skill.name}
                    </span>
                  </div>
                  <span className="text-xs text-muted tabular-nums">{skill.count}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Can't find a skill? */}
        <Card className="bg-surface border border-border rounded-2xl p-4 flex flex-col gap-3">
          <p className="text-sm font-semibold text-accent">
            Can&apos;t find a skill?
          </p>
          <p className="text-sm text-muted">
            Post a request to the community board so others can offer to help.
          </p>
          <Button variant="outline" size="sm" className="w-full">
            Post a Request
          </Button>
        </Card>
      </aside>
    </div>
  );
}
