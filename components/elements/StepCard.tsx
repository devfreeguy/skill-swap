import React from "react";

interface StepCardProps {
  step: string;
  title: string;
  description: string;
  icon: React.ElementType;
}

export default function StepCard({
  step,
  title,
  description,
  icon: Icon,
}: StepCardProps) {
  return (
    <div className="relative w-full">

      {/* Corner notch SVG — top right only */}
      <svg
        width="80"
        height="80"
        viewBox="0 0 80 80"
        className="absolute top-0 right-0 z-0"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M 0,0 L 48,0 Q 80,0 80,48 L 80,80 L 0,80 Z"
          fill="var(--surface)"
        />
        <path
          d="M 48,0 L 80,0 L 80,48 Q 80,0 48,0 Z"
          fill="var(--background)"
        />
      </svg>

      {/* Full card background */}
      <div
        className="absolute inset-0 rounded-2xl z-0"
        style={{ backgroundColor: "var(--surface)" }}
      />

      {/* Floating icon box — top-right, above notch */}
      <div className="absolute top-2 right-2 z-20 w-14 h-14 rounded-2xl bg-accent text-accent-foreground flex items-center justify-center">
        <Icon size={24} />
      </div>

      {/* Card content */}
      <div className="relative z-10 p-6 pt-8 flex flex-col gap-4 min-h-[220px]">
        <p className="text-xs font-medium text-muted uppercase tracking-widest">
          STEP {step}
        </p>
        <h3 className="text-xl font-bold text-foreground leading-snug max-w-[75%]">
          {title}
        </h3>
        <p className="text-sm text-muted leading-relaxed">{description}</p>
      </div>

    </div>
  );
}
