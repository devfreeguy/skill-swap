"use client";

type LemniscateLoaderProps = {
  loading?: boolean;
  text?: string;
  hint?: string;
  overlayOpacity?: number;
  blur?: boolean;
  size?: number;
  className?: string;
  color?: string;
  background?: string;
  onCancel?: () => void;
};

/**
 * Lightweight full-screen loading overlay. A pure-CSS spinner (no JS animation
 * loop, no per-frame work) so it costs effectively nothing to show.
 */
export default function Loader({
  loading = true,
  text = "Loading",
  hint,
  overlayOpacity = 0.8,
  blur = true,
  size = 48,
  className = "",
  color = "var(--accent)",
  background = "var(--background)",
  onCancel,
}: LemniscateLoaderProps) {
  if (!loading) return null;

  return (
    <div
      className={`
        fixed inset-0 z-9999
        flex flex-col items-center justify-center gap-0
        transition-all duration-300
        ${blur ? "backdrop-blur-md" : ""}
        ${className}
      `}
      style={{ background, opacity: overlayOpacity }}
    >
      <span
        role="status"
        aria-label={text || "Loading"}
        className="inline-block animate-spin rounded-full border-solid border-current border-t-transparent"
        style={{
          width: size,
          height: size,
          color,
          borderWidth: Math.max(2, Math.round(size / 12)),
        }}
      />

      {text && (
        <p className="mt-6 text-xs uppercase tracking-[0.3em] text-foreground">
          {text}
        </p>
      )}

      {hint && (
        <p className="mt-3 max-w-xs text-center text-sm leading-relaxed text-muted">
          {hint}
        </p>
      )}

      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="mt-6 text-xs text-muted hover:text-foreground underline underline-offset-2 transition-colors"
        >
          Cancel
        </button>
      )}
    </div>
  );
}
