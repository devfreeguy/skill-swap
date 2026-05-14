"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type LemniscateLoaderProps = {
  loading?: boolean;

  text?: string;

  /**
   * Background opacity (0 → 1)
   */
  overlayOpacity?: number;

  /**
   * Blur backdrop
   */
  blur?: boolean;

  /**
   * SVG size
   */
  size?: number;

  /**
   * Additional classes
   */
  className?: string;

  /**
   * Override loader color
   */
  color?: string;

  /**
   * Override background
   */
  background?: string;
};

const config = {
  particleCount: 86,
  trailSpan: 0.37,
  durationMs: 2400,
  rotationDurationMs: 6000,
  pulseDurationMs: 8600,
  strokeWidth: 4.2,
  rotate: false,
  lemniscateA: 16,
  lemniscateBoost: 6.5,
};

type Particle = {
  x: number;
  y: number;
  radius: number;
  opacity: number;
};

function normalizeProgress(progress: number) {
  return ((progress % 1) + 1) % 1;
}

function getDetailScale(time: number) {
  const pulseProgress =
    (time % config.pulseDurationMs) / config.pulseDurationMs;

  const pulseAngle = pulseProgress * Math.PI * 2;

  return 0.52 + ((Math.sin(pulseAngle + 0.55) + 1) / 2) * 0.48;
}

function getRotation(time: number) {
  if (!config.rotate) return 0;

  return (
    -((time % config.rotationDurationMs) / config.rotationDurationMs) * 360
  );
}

function getPoint(progress: number, detailScale: number) {
  const t = progress * Math.PI * 2;

  const scale = config.lemniscateA + detailScale * config.lemniscateBoost;

  const denom = 1 + Math.sin(t) ** 2;

  return {
    x: 50 + (scale * Math.cos(t)) / denom,
    y: 50 + (scale * Math.sin(t) * Math.cos(t)) / denom,
  };
}

function buildPath(detailScale: number, steps = 480) {
  return Array.from({ length: steps + 1 }, (_, index) => {
    const point = getPoint(index / steps, detailScale);

    return `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`;
  }).join(" ");
}

function getParticle(
  index: number,
  progress: number,
  detailScale: number,
): Particle {
  const tailOffset = index / (config.particleCount - 1);

  const point = getPoint(
    normalizeProgress(progress - tailOffset * config.trailSpan),
    detailScale,
  );

  const fade = Math.pow(1 - tailOffset, 0.56);

  return {
    x: point.x,
    y: point.y,
    radius: 0.9 + fade * 2.7,
    opacity: 0.04 + fade * 0.96,
  };
}

export default function Loader({
  loading = true,
  text = "Loading",
  overlayOpacity = 0.8,
  blur = true,
  size = 256,
  className = "",
  color = "var(--accent)",
  background = "var(--background)",
}: LemniscateLoaderProps) {
  const animationRef = useRef<number | null>(null);

  const startTimeRef = useRef<number>(0);

  const [pathData, setPathData] = useState("");

  const [particles, setParticles] = useState<Particle[]>([]);

  const [rotation, setRotation] = useState(0);

  const particleIndexes = useMemo(
    () => Array.from({ length: config.particleCount }, (_, i) => i),
    [],
  );

  useEffect(() => {
    if (!loading) return;

    const render = (now: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = now;
      }

      const time = now - startTimeRef.current;

      const progress = (time % config.durationMs) / config.durationMs;

      const detailScale = getDetailScale(time);

      setRotation(getRotation(time));

      setPathData(buildPath(detailScale));

      setParticles(
        particleIndexes.map((index) =>
          getParticle(index, progress, detailScale),
        ),
      );

      animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [loading, particleIndexes]);

  if (!loading) return null;

  return (
    <div
      className={`
        fixed inset-0 z-9999
        flex flex-col items-center justify-center
        transition-all duration-300
        ${blur ? "backdrop-blur-md" : ""}
        ${className}
      `}
      style={{
        background: background,
        opacity: overlayOpacity,
      }}
    >
      <div
        className="relative flex items-center justify-center"
        style={{
          width: size,
          height: size,
          color,
        }}
      >
        <svg
          viewBox="0 0 100 100"
          fill="none"
          className="w-full h-full overflow-visible"
        >
          <g transform={`rotate(${rotation} 50 50)`}>
            <path
              d={pathData}
              stroke="currentColor"
              strokeWidth={config.strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.1"
              fill="none"
            />

            {particles.map((particle, index) => (
              <circle
                key={index}
                cx={particle.x}
                cy={particle.y}
                r={particle.radius}
                opacity={particle.opacity}
                fill="currentColor"
              />
            ))}
          </g>
        </svg>
      </div>

      {text && (
        <p className="mt-6 text-xs uppercase tracking-[0.3em] text-foreground">
          {text}
        </p>
      )}
    </div>
  );
}
