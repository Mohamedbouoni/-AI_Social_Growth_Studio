"use client";

import React, { useId } from "react";
import { Area, AreaChart } from "recharts";
import { cn } from "@/lib/utils";

// Shared color tones for the dashboard data primitives
export type Tone = "sage" | "positive" | "negative" | "foreground";

const toneText: Record<Tone, string> = {
  sage: "text-sage",
  positive: "text-positive",
  negative: "text-negative",
  foreground: "text-foreground",
};

interface SparklineProps {
  data: number[];
  tone?: Tone;
  height?: number;
  /** Soft gradient under the line */
  filled?: boolean;
  className?: string;
}

export function Sparkline({
  data,
  tone = "sage",
  height = 40,
  filled = true,
  className,
}: SparklineProps) {
  // SVG ids end up inside url(#…), so keep them to safe characters
  const gradientId = `spark-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const points = data.map((value, index) => ({ index, value }));

  return (
    // Strokes use currentColor so the tone comes from the theme tokens
    <div
      aria-hidden
      className={cn("w-full", toneText[tone], className)}
      style={{ height }}
    >
      <AreaChart
        data={points}
        responsive
        style={{ width: "100%", height: "100%" }}
        margin={{ top: 2, right: 0, bottom: 2, left: 0 }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity={0.28} />
            <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke="currentColor"
          strokeWidth={2}
          fill={filled ? `url(#${gradientId})` : "transparent"}
          dot={false}
          activeDot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </div>
  );
}
