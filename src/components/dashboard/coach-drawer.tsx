"use client";

import React, { createContext, useContext, useMemo, useRef, useState } from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { ArrowUp, Sparkles, X } from "lucide-react";
import { useLanguage } from "@/lib/i18n/provider";

// =============================================================================
// AI Coach drawer (placeholder)
// =============================================================================
// The floating pill, the header search and later any page can open Coach via
// useCoach().openCoach(prompt?). The assistant itself arrives in Step 4.
// =============================================================================

interface CoachContextType {
  openCoach: (prompt?: string) => void;
  closeCoach: () => void;
}

const CoachContext = createContext<CoachContextType | undefined>(undefined);

export function CoachProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");

  const value = useMemo<CoachContextType>(
    () => ({
      openCoach: (initialPrompt) => {
        setPrompt(initialPrompt ?? "");
        setOpen(true);
      },
      closeCoach: () => setOpen(false),
    }),
    []
  );

  return (
    <CoachContext.Provider value={value}>
      {children}
      <CoachDrawer
        open={open}
        onOpenChange={setOpen}
        prompt={prompt}
        onPromptChange={setPrompt}
      />
    </CoachContext.Provider>
  );
}

export function useCoach() {
  const context = useContext(CoachContext);
  if (!context) {
    throw new Error("useCoach must be used within a CoachProvider");
  }
  return context;
}

interface CoachDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prompt: string;
  onPromptChange: (prompt: string) => void;
}

export function CoachDrawer({
  open,
  onOpenChange,
  prompt,
  onPromptChange,
}: CoachDrawerProps) {
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => onOpenChange(next)}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/25 transition-opacity duration-200 supports-backdrop-filter:backdrop-blur-[2px] data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <DialogPrimitive.Popup
          initialFocus={inputRef}
          className="fixed inset-y-3 end-3 z-50 flex w-[min(26rem,calc(100vw-1.5rem))] flex-col rounded-xl bg-card text-card-foreground shadow-float outline-none transition-[translate,opacity] duration-300 ease-out data-ending-style:opacity-0 data-starting-style:opacity-0 ltr:data-ending-style:translate-x-8 ltr:data-starting-style:translate-x-8 rtl:data-ending-style:-translate-x-8 rtl:data-starting-style:-translate-x-8"
        >
          <header className="flex items-start gap-3 p-5 pb-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
              <Sparkles className="size-5" />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <DialogPrimitive.Title className="text-lg leading-tight font-bold">
                {t.shell.coachTitle}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-sm text-muted-foreground">
                {t.shell.coachSubtitle}
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close
              aria-label={t.shell.close}
              className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full bg-muted text-foreground transition-colors hover:bg-accent"
            >
              <X className="size-4" />
            </DialogPrimitive.Close>
          </header>

          {/* Empty state until the assistant is wired up */}
          <div className="flex flex-1 flex-col justify-end overflow-y-auto px-5">
            <div className="bg-sage-glow rounded-xl p-5">
              <span className="grid size-10 place-items-center rounded-full bg-card text-sage shadow-card">
                <Sparkles className="size-5" />
              </span>
              <p className="mt-4 font-semibold">{t.shell.coachComingSoon}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t.shell.coachComingSoonBody}
              </p>
            </div>
          </div>

          <form onSubmit={(event) => event.preventDefault()} className="p-4">
            <div className="flex h-12 items-center gap-2 rounded-full bg-muted ps-5 pe-1.5">
              <input
                ref={inputRef}
                value={prompt}
                onChange={(event) => onPromptChange(event.target.value)}
                placeholder={t.shell.coachInputPlaceholder}
                aria-label={t.shell.coachInputPlaceholder}
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              <button
                type="submit"
                disabled
                aria-label={t.shell.send}
                className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
              >
                <ArrowUp className="size-4" />
              </button>
            </div>
          </form>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
