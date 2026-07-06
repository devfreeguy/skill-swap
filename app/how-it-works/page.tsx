import type { Metadata } from "next";

import PublicHeader from "@/components/layouts/PublicHeader";
import PublicFooter from "@/components/layouts/PublicFooter";
import { renderMarkdown } from "@/lib/markdown";
import content from "@/data/how-it-works.json";

export const metadata: Metadata = {
  title: "How It Works - SkillSwap",
  description: content.subtitle,
};

type Section = { id: string; heading: string; body: string };

export default function HowItWorksPage() {
  const sections = content.sections as Section[];

  return (
    <main className="min-h-full bg-background">
      <PublicHeader />

      {/* Hero */}
      <section className="w-full border-b border-border">
        <div className="mx-auto max-w-4xl px-4 pt-32 pb-12 text-center md:px-8 md:pt-40 md:pb-16">
          <h1 className="text-4xl font-bold text-foreground md:text-5xl">
            {content.title}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted md:text-lg">
            {content.subtitle}
          </p>
        </div>
      </section>

      {/* Body: sticky table of contents + rendered article */}
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-12 px-4 py-12 md:px-8 md:py-16 lg:grid-cols-[220px_1fr]">
        <aside className="hidden lg:block">
          <nav className="sticky top-28 flex flex-col gap-1">
            <p className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">
              On this page
            </p>
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="rounded-lg px-2 py-1.5 text-sm text-muted transition-colors hover:bg-surface hover:text-foreground"
              >
                {s.heading}
              </a>
            ))}
          </nav>
        </aside>

        <article className="min-w-0 max-w-2xl">
          {sections.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-28">
              <h2 className="mt-12 mb-2 text-2xl font-bold text-foreground first:mt-0 md:text-3xl">
                {s.heading}
              </h2>
              {renderMarkdown(s.body)}
            </section>
          ))}
        </article>
      </div>

      <PublicFooter />
    </main>
  );
}
