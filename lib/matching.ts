import { parseSkills } from "./skills";

export type MatchType = "PERFECT_MATCH" | "STRONG_MATCH" | "DISCOVERY";

export interface MatchResult {
  score: number;
  type: MatchType;
  teachOverlap: string[];
  learnOverlap: string[];
}

export function scoreMatch(
  me: { teachSkill?: string | null; learnSkill?: string | null },
  candidate: { teachSkill?: string | null; learnSkill?: string | null }
): MatchResult {
  const myTeach = parseSkills(me.teachSkill);
  const myLearn = parseSkills(me.learnSkill);
  const theirTeach = parseSkills(candidate.teachSkill);
  const theirLearn = parseSkills(candidate.learnSkill);

  const learnOverlap = myLearn.filter((s) => theirTeach.includes(s));
  const teachOverlap = myTeach.filter((s) => theirLearn.includes(s));

  const score = learnOverlap.length * 2 + teachOverlap.length;
  const type: MatchType =
    learnOverlap.length > 0 && teachOverlap.length > 0
      ? "PERFECT_MATCH"
      : learnOverlap.length > 0 || teachOverlap.length > 0
        ? "STRONG_MATCH"
        : "DISCOVERY";

  return { score, type, teachOverlap, learnOverlap };
}
