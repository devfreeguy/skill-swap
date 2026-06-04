"use client";

import {
  useRef,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type Orientation = "vertical" | "horizontal";

/**
 * hover  – scrollbar fades in on container hover (default)
 * always – scrollbar is always visible when content overflows
 * auto   – scrollbar visible whenever content overflows, regardless of hover
 */
type ScrollbarVisibility = "hover" | "always" | "auto";

export interface ScrollAreaProps {
  children: ReactNode;
  /** Scroll direction. @default "vertical" */
  orientation?: Orientation;
  /** When the custom scrollbar is shown. @default "hover" */
  visibility?: ScrollbarVisibility;
  /** Track + thumb thickness in px. @default 6 */
  scrollbarSize?: number;
  /** Outer wrapper — controls dimensions and overflow clipping */
  className?: string;
  /** Inner scrollable viewport */
  viewportClassName?: string;
  /** Scrollbar track className */
  trackClassName?: string;
  /** Scrollbar thumb className */
  thumbClassName?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MIN_THUMB_PX = 28;

// ─── Animations ───────────────────────────────────────────────────────────────

const trackMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.16, ease: "easeOut" },
} as const;

// ─── Component ────────────────────────────────────────────────────────────────

export default function ScrollArea({
  children,
  orientation = "vertical",
  visibility = "hover",
  scrollbarSize = 6,
  className,
  viewportClassName,
  trackClassName,
  thumbClassName,
}: ScrollAreaProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const [thumbSize, setThumbSize] = useState(MIN_THUMB_PX);
  const [thumbOffset, setThumbOffset] = useState(0);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const isVertical = orientation === "vertical";

  // ── Thumb geometry ──────────────────────────────────────────────────────────

  const computeThumb = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;

    if (isVertical) {
      const overflow = el.scrollHeight > el.clientHeight + 1;
      setHasOverflow(overflow);
      if (!overflow) return;

      const ratio = el.clientHeight / el.scrollHeight;
      const size = Math.max(ratio * el.clientHeight, MIN_THUMB_PX);
      const maxOffset = el.clientHeight - size;
      const fraction =
        el.scrollTop / Math.max(1, el.scrollHeight - el.clientHeight);

      setThumbSize(size);
      setThumbOffset(fraction * maxOffset);
    } else {
      const overflow = el.scrollWidth > el.clientWidth + 1;
      setHasOverflow(overflow);
      if (!overflow) return;

      const ratio = el.clientWidth / el.scrollWidth;
      const size = Math.max(ratio * el.clientWidth, MIN_THUMB_PX);
      const maxOffset = el.clientWidth - size;
      const fraction =
        el.scrollLeft / Math.max(1, el.scrollWidth - el.clientWidth);

      setThumbSize(size);
      setThumbOffset(fraction * maxOffset);
    }
  }, [isVertical]);

  // ── Scroll listener ─────────────────────────────────────────────────────────

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    el.addEventListener("scroll", computeThumb, { passive: true });
    return () => el.removeEventListener("scroll", computeThumb);
  }, [computeThumb]);

  // ── ResizeObserver – recompute when container or content resizes ─────────────

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    computeThumb();
    const ro = new ResizeObserver(computeThumb);
    ro.observe(el);
    return () => ro.disconnect();
  }, [computeThumb]);

  // ── Drag-to-scroll ──────────────────────────────────────────────────────────

  const dragOrigin = useRef({ mouse: 0, scroll: 0 });

  const onThumbPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      const el = viewportRef.current;
      if (!el) return;

      dragOrigin.current = {
        mouse: isVertical ? e.clientY : e.clientX,
        scroll: isVertical ? el.scrollTop : el.scrollLeft,
      };
      setIsDragging(true);
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [isVertical],
  );

  const onThumbPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!isDragging) return;
      const el = viewportRef.current;
      if (!el) return;

      const delta =
        (isVertical ? e.clientY : e.clientX) - dragOrigin.current.mouse;

      const maxScroll = isVertical
        ? el.scrollHeight - el.clientHeight
        : el.scrollWidth - el.clientWidth;
      const trackSize = isVertical ? el.clientHeight : el.clientWidth;
      const scrollableTrack = Math.max(1, trackSize - thumbSize);
      const scrollPerPx = maxScroll / scrollableTrack;

      const next = Math.max(
        0,
        Math.min(maxScroll, dragOrigin.current.scroll + delta * scrollPerPx),
      );

      if (isVertical) {
        el.scrollTop = next;
      } else {
        el.scrollLeft = next;
      }
    },
    [isDragging, isVertical, thumbSize],
  );

  const onThumbPointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      setIsDragging(false);
    },
    [],
  );

  // ── Track click – jump to position ─────────────────────────────────────────

  const onTrackClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).dataset.thumb === "true") return;
      const el = viewportRef.current;
      const track = trackRef.current;
      if (!el || !track) return;

      const rect = track.getBoundingClientRect();
      const maxScroll = isVertical
        ? el.scrollHeight - el.clientHeight
        : el.scrollWidth - el.clientWidth;

      if (isVertical) {
        const fraction = (e.clientY - rect.top) / rect.height;
        el.scrollTop = fraction * maxScroll;
      } else {
        const fraction = (e.clientX - rect.left) / rect.width;
        el.scrollLeft = fraction * maxScroll;
      }
    },
    [isVertical],
  );

  // ── Visibility logic ────────────────────────────────────────────────────────

  const scrollbarVisible =
    hasOverflow &&
    (visibility === "always" ||
      visibility === "auto" ||
      (visibility === "hover" && (isHovered || isDragging)));

  // ── Styles ──────────────────────────────────────────────────────────────────

  const viewportStyle: CSSProperties = {
    scrollbarWidth: "none",
    msOverflowStyle: "none",
    overflowY: isVertical ? "auto" : "hidden",
    overflowX: isVertical ? "hidden" : "auto",
  };

  // Track sits flush against the edge, inset by 2px from container borders
  const trackStyle: CSSProperties = isVertical
    ? { right: 2, top: 2, bottom: 2, width: scrollbarSize }
    : { bottom: 2, left: 2, right: 2, height: scrollbarSize };

  // Thumb is sized and offset along the primary axis
  const thumbStyle: CSSProperties = isVertical
    ? {
        top: 0,
        left: 0,
        width: "100%",
        height: thumbSize,
        transform: `translateY(${thumbOffset}px)`,
      }
    : {
        top: 0,
        left: 0,
        height: "100%",
        width: thumbSize,
        transform: `translateX(${thumbOffset}px)`,
      };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        if (!isDragging) setIsHovered(false);
      }}
    >
      {/* ── Viewport ── */}
      <div
        ref={viewportRef}
        className={cn(
          "[&::-webkit-scrollbar]:hidden",
          "h-full w-full",
          viewportClassName,
        )}
        style={viewportStyle}
      >
        {children}
      </div>

      {/* ── Custom scrollbar ── */}
      <AnimatePresence>
        {scrollbarVisible && (
          <motion.div
            ref={trackRef}
            key="track"
            role="scrollbar"
            aria-orientation={orientation}
            aria-valuemin={0}
            aria-valuemax={100}
            className={cn(
              "absolute rounded-full z-20 cursor-pointer select-none",
              trackClassName,
            )}
            style={{
              ...trackStyle,
              backgroundColor:
                "color-mix(in srgb, var(--border) 40%, transparent)",
            }}
            {...trackMotion}
            onClick={onTrackClick}
          >
            <motion.div
              data-thumb="true"
              className={cn(
                "absolute rounded-full",
                isDragging ? "cursor-grabbing" : "cursor-grab",
                thumbClassName,
              )}
              style={{
                ...thumbStyle,
                backgroundColor: isDragging
                  ? "var(--accent)"
                  : "var(--border)",
              }}
              animate={{
                opacity: isDragging ? 1 : isHovered ? 0.9 : 0.55,
                // subtle scale pulse on grab: vertical scales Y, horizontal X
                scaleX: isDragging && !isVertical ? 1 : 1,
                scaleY: isDragging && isVertical ? 1 : 1,
              }}
              whileTap={{ opacity: 1 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              onPointerDown={onThumbPointerDown}
              onPointerMove={onThumbPointerMove}
              onPointerUp={onThumbPointerUp}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
