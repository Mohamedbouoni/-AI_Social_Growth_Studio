"use client";

import React from "react";
import { Wrench } from "lucide-react";
import { ApiError } from "@/lib/queries/client";
import { useUsage } from "@/lib/queries/hooks";

/**
 * Shown when the API reports an incomplete installation (missing tables or
 * keys). The server message names the exact fix, so it is shown verbatim.
 */
export function SetupBanner() {
  const { error } = useUsage();
  if (!(error instanceof ApiError) || error.code !== "SETUP_REQUIRED") return null;

  return (
    <div role="alert" className="mb-6 flex items-start gap-3 rounded-xl bg-negative-soft p-4 text-sm text-negative">
      <Wrench className="mt-0.5 size-5 shrink-0" />
      <div className="space-y-1">
        <p className="font-semibold">Setup required</p>
        <p>{error.message}</p>
        <p className="text-xs opacity-80">See README.md → “Setup” for every step.</p>
      </div>
    </div>
  );
}
