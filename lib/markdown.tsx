import React from "react";

/**
 * A small, dependency-free Markdown renderer that returns React elements
 * (never raw HTML — no `dangerouslySetInnerHTML`, so it's XSS-safe). It covers
 * the subset used by our content JSON: headings, paragraphs, ordered/unordered
 * lists, blockquotes, horizontal rules, and inline **bold**, *italic*,
 * `code`, and [links](url).
 *
 * Content is authored by us (in `data/*.json`), so this deliberately handles a
 * known feature set rather than every adversarial edge case.
 */

// ── Inline parsing ────────────────────────────────────────────────────────────

type InlineMatch = {
  index: number;
  length: number;
  node: React.ReactNode;
};

// Ordered by precedence: code first (its contents aren't further parsed), then
// links, then bold, then italic.
const INLINE_RULES: {
  regex: RegExp;
  render: (m: RegExpExecArray, key: string) => React.ReactNode;
}[] = [
  {
    regex: /`([^`]+)`/,
    render: (m, key) => (
      <code
        key={key}
        className="rounded bg-surface px-1.5 py-0.5 font-mono text-[0.85em] text-accent"
      >
        {m[1]}
      </code>
    ),
  },
  {
    regex: /\[([^\]]+)\]\(([^)]+)\)/,
    render: (m, key) => {
      const external = /^https?:\/\//.test(m[2]);
      return (
        <a
          key={key}
          href={m[2]}
          {...(external
            ? { target: "_blank", rel: "noopener noreferrer" }
            : {})}
          className="font-medium text-accent underline underline-offset-2 hover:opacity-80"
        >
          {parseInline(m[1], key)}
        </a>
      );
    },
  },
  {
    regex: /\*\*([^*]+)\*\*/,
    render: (m, key) => (
      <strong key={key} className="font-semibold text-foreground">
        {parseInline(m[1], key)}
      </strong>
    ),
  },
  {
    regex: /(?:\*([^*]+)\*|_([^_]+)_)/,
    render: (m, key) => (
      <em key={key} className="italic">
        {parseInline(m[1] ?? m[2], key)}
      </em>
    ),
  },
];

/** Turn inline markdown into React nodes. */
function parseInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let remaining = text;
  let cursor = 0;

  while (remaining.length > 0) {
    // Find the earliest-matching inline rule.
    let earliest: (InlineMatch & { ruleIndex: number }) | null = null;
    for (let r = 0; r < INLINE_RULES.length; r++) {
      const m = INLINE_RULES[r].regex.exec(remaining);
      if (m && (earliest === null || m.index < earliest.index)) {
        const key = `${keyPrefix}-${cursor}-${r}`;
        earliest = {
          index: m.index,
          length: m[0].length,
          node: INLINE_RULES[r].render(m, key),
          ruleIndex: r,
        };
      }
    }

    if (!earliest) {
      nodes.push(remaining);
      break;
    }

    if (earliest.index > 0) {
      nodes.push(remaining.slice(0, earliest.index));
    }
    nodes.push(earliest.node);
    remaining = remaining.slice(earliest.index + earliest.length);
    cursor++;
  }

  return nodes;
}

// ── Block parsing ─────────────────────────────────────────────────────────────

const HEADING_CLASS: Record<number, string> = {
  1: "text-3xl md:text-4xl font-bold text-foreground mt-10 mb-4",
  2: "text-2xl md:text-3xl font-bold text-foreground mt-10 mb-4",
  3: "text-xl md:text-2xl font-semibold text-foreground mt-8 mb-3",
  4: "text-lg font-semibold text-foreground mt-6 mb-2",
};

/** Render a Markdown string into React elements. */
export function renderMarkdown(markdown: string): React.ReactNode {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Blank line → skip.
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Horizontal rule.
    if (/^(-{3,}|\*{3,})$/.test(line.trim())) {
      blocks.push(<hr key={key++} className="my-8 border-border" />);
      i++;
      continue;
    }

    // Heading.
    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      const Tag = `h${level}` as "h1" | "h2" | "h3" | "h4";
      blocks.push(
        <Tag key={key++} className={HEADING_CLASS[level]}>
          {parseInline(heading[2], `h${key}`)}
        </Tag>
      );
      i++;
      continue;
    }

    // Blockquote (consecutive `> ` lines).
    if (/^>\s?/.test(line)) {
      const quote: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quote.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      blocks.push(
        <blockquote
          key={key++}
          className="my-5 border-l-2 border-accent pl-4 text-muted italic"
        >
          {parseInline(quote.join(" "), `q${key}`)}
        </blockquote>
      );
      continue;
    }

    // Ordered list (consecutive `1. ` lines).
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ""));
        i++;
      }
      blocks.push(
        <ol
          key={key++}
          className="my-4 flex list-decimal flex-col gap-2 pl-6 text-muted marker:text-accent"
        >
          {items.map((it, idx) => (
            <li key={idx} className="pl-1 leading-relaxed">
              {parseInline(it, `ol${key}-${idx}`)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Unordered list (consecutive `- ` or `* ` lines).
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ""));
        i++;
      }
      blocks.push(
        <ul
          key={key++}
          className="my-4 flex list-disc flex-col gap-2 pl-6 text-muted marker:text-accent"
        >
          {items.map((it, idx) => (
            <li key={idx} className="pl-1 leading-relaxed">
              {parseInline(it, `ul${key}-${idx}`)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Paragraph (gather consecutive non-blank, non-block lines).
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^(#{1,4})\s+/.test(lines[i]) &&
      !/^>\s?/.test(lines[i]) &&
      !/^\d+\.\s+/.test(lines[i]) &&
      !/^[-*]\s+/.test(lines[i]) &&
      !/^(-{3,}|\*{3,})$/.test(lines[i].trim())
    ) {
      para.push(lines[i]);
      i++;
    }
    blocks.push(
      <p key={key++} className="my-4 leading-relaxed text-muted">
        {parseInline(para.join(" "), `p${key}`)}
      </p>
    );
  }

  return blocks;
}
