export function parseSkills(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((s): s is string => typeof s === "string" && s.length > 0);
    return raw.length > 0 ? [raw] : [];
  } catch {
    return raw.length > 0 ? [raw] : [];
  }
}
