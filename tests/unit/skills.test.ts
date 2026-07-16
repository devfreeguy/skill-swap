import { describe, it, expect } from "vitest";
import { parseSkills } from "@/lib/skills";

describe("parseSkills", () => {
  it("parses a JSON-stringified array", () => {
    expect(parseSkills('["Python","React"]')).toEqual(["Python", "React"]);
  });

  it("wraps a plain legacy string in an array", () => {
    expect(parseSkills("Python")).toEqual(["Python"]);
  });

  it("returns empty array for null", () => {
    expect(parseSkills(null)).toEqual([]);
  });

  it("returns empty array for undefined", () => {
    expect(parseSkills(undefined)).toEqual([]);
  });

  it("returns empty array for empty string", () => {
    expect(parseSkills("")).toEqual([]);
  });

  it("returns empty array for JSON empty array", () => {
    expect(parseSkills("[]")).toEqual([]);
  });

  it("handles single-element JSON array", () => {
    expect(parseSkills('["JavaScript"]')).toEqual(["JavaScript"]);
  });

  it("trims whitespace from plain string values", () => {
    const result = parseSkills("  Rust  ");
    // should not have leading/trailing spaces in the result
    expect(result[0].trim()).toBe("Rust");
  });
});
