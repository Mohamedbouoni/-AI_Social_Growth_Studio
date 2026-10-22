"use client";

import React, { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/provider";

export function CopyButton({ text, label, className }: { text: string; label?: string; className?: string }) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={label ?? t.app.copy}
      className={cn(
        "inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-muted px-3 text-xs font-medium transition-colors hover:bg-accent",
        className
      )}
    >
      {copied ? <Check className="size-3.5 text-positive" /> : <Copy className="size-3.5" />}
      {label && <span>{copied ? t.app.copied : label}</span>}
    </button>
  );
}
