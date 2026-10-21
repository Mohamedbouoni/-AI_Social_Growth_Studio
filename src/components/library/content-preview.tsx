"use client";

import React from "react";
import type { GeneratedContent } from "@/modules/ai/schemas";

// Field labels come from translations as field_<key> (see modules/ai/schemas.ts)
type Labels = Record<string, string>;
const fieldLabel = (labels: Labels, key: string) => labels[`field_${key}`] ?? key;

const CHIP_FIELDS = new Set(["tags", "hashtags", "suggestedSounds"]);

/** Read-only rendering of one generated variant, for the library viewer. */
export function ContentPreview({ content, labels }: { content: GeneratedContent; labels: Labels }) {
  const fields = Object.entries(content.content as Record<string, unknown>);

  return (
    <dl className="space-y-4">
      {fields.map(([key, value]) => {
        if (value === undefined || value === null || value === "") return null;
        const label = fieldLabel(labels, key);

        let body: React.ReactNode;
        if (key === "slides" && Array.isArray(value)) {
          body = (
            <ol className="space-y-2">
              {(value as { heading: string; body: string }[]).map((slide, i) => (
                <li key={i} className="rounded-xl bg-muted p-3">
                  <p className="text-xs font-semibold text-muted-foreground">{i + 1}</p>
                  <p className="font-semibold">{slide.heading}</p>
                  <p className="text-sm">{slide.body}</p>
                </li>
              ))}
            </ol>
          );
        } else if (Array.isArray(value) && CHIP_FIELDS.has(key)) {
          body = (
            <div className="flex flex-wrap gap-1.5">
              {(value as string[]).map((v) => (
                <span key={v} className="rounded-full bg-sage-softer px-2.5 py-1 text-xs text-sage">
                  {v}
                </span>
              ))}
            </div>
          );
        } else if (Array.isArray(value)) {
          body = (
            <ul className="list-disc space-y-1 ps-5 text-sm">
              {(value as string[]).map((v) => (
                <li key={v}>{v}</li>
              ))}
            </ul>
          );
        } else {
          body = <p className="text-sm whitespace-pre-wrap">{String(value)}</p>;
        }

        return (
          <div key={key}>
            <dt className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</dt>
            <dd>{body}</dd>
          </div>
        );
      })}
    </dl>
  );
}

/** Plain-text version for copying to the clipboard */
export function contentToText(content: GeneratedContent, labels: Labels): string {
  return Object.entries(content.content as Record<string, unknown>)
    .map(([key, value]) => {
      const label = fieldLabel(labels, key);
      if (key === "slides" && Array.isArray(value)) {
        return `${label}:\n${(value as { heading: string; body: string }[])
          .map((s, i) => `${i + 1}. ${s.heading} — ${s.body}`)
          .join("\n")}`;
      }
      return `${label}:\n${Array.isArray(value) ? value.join(CHIP_FIELDS.has(key) ? " " : "\n") : value}`;
    })
    .join("\n\n");
}
