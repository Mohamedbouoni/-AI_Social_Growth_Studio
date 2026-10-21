import React from "react";
import { cn } from "@/lib/utils";
import type { Tone } from "./sparkline";

const toneStroke: Record<Tone, { track: string; bar: string }> = {
  sage: { track: "stroke-sage-soft", bar: "stroke-sage" },
  positive: { track: "stroke-positive-soft", bar: "stroke-positive" },
  negative: { track: "stroke-negative-soft", bar: "stroke-negative" },
  foreground: { track: "stroke-muted", bar: "stroke-foreground" },
};

interface RingGaugeProps {
  /** 0–100 */
  value: number;
  /** Outer size in px */
  size?: number;
  thickness?: number;
  tone?: Tone;
  /** Center content; defaults to the rounded percentage */
  label?: React.ReactNode;
  /** Small line under the label */
  caption?: React.ReactNode;
  /** Accessible name, e.g. "Credits used" */
  "aria-label"?: string;
  className?: string;
}

export function RingGauge({
  value,
  size = 96,
  thickness = 10,
  tone = "sage",
  label,
  caption,
  "aria-label": ariaLabel,
  className,
}: RingGaugeProps) {
  const percent = Math.min(100, Math.max(0, value));
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const colors = toneStroke[tone];

  return (
    <div
      role="meter"
      aria-valuenow={Math.round(percent)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
      className={cn("relative inline-grid shrink-0 place-items-center", className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0 -rotate-90"
        aria-hidden
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={thickness}
          className={colors.track}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - percent / 100)}
          className={cn(colors.bar, "transition-[stroke-dashoffset] duration-700 ease-out")}
        />
      </svg>
      <div className="relative flex flex-col items-center leading-none">
        <span
          className="font-bold tracking-tight tabular-nums"
          style={{ fontSize: Math.round(size * 0.22) }}
        >
          {label ?? `${Math.round(percent)}%`}
        </span>
        {caption && (
          <span className="mt-1 text-[11px] font-medium text-muted-foreground">
            {caption}
          </span>
        )}
      </div>
    </div>
  );
}
