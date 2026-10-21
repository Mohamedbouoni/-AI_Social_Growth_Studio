"use client";

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { ArrowUp, FileText, Loader2, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/provider";
import { fmt } from "@/lib/i18n/format";
import { apiFetch, isUpgradeError } from "@/lib/queries/client";
import { useRefreshAfterSpend } from "@/lib/queries/hooks";
import { useUpgrade } from "@/components/billing/upgrade-provider";

// =============================================================================
// AI Coach drawer
// =============================================================================
// The floating pill, the header search and any page can open Coach via
// useCoach().openCoach(prompt?, focus?). `focus` attaches a library item so
// Coach answers about that specific piece of content. Each message costs one
// credit; running out opens the upgrade dialog.
// =============================================================================

interface CoachFocus {
  projectId: string;
  title: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface CoachContextType {
  openCoach: (prompt?: string, focus?: CoachFocus) => void;
  closeCoach: () => void;
}

const CoachContext = createContext<CoachContextType | undefined>(undefined);

// Keep requests small: the API accepts at most 20 messages
const MAX_HISTORY = 12;

export function CoachProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [focus, setFocus] = useState<CoachFocus | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  const value = useMemo<CoachContextType>(
    () => ({
      openCoach: (initialPrompt, nextFocus) => {
        setPrompt(initialPrompt ?? "");
        if (nextFocus) setFocus(nextFocus);
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
        focus={focus}
        onClearFocus={() => setFocus(null)}
        messages={messages}
        onMessagesChange={setMessages}
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
  focus: CoachFocus | null;
  onClearFocus: () => void;
  messages: Message[];
  onMessagesChange: React.Dispatch<React.SetStateAction<Message[]>>;
}

export function CoachDrawer({
  open,
  onOpenChange,
  prompt,
  onPromptChange,
  focus,
  onClearFocus,
  messages,
  onMessagesChange,
}: CoachDrawerProps) {
  const { t, language } = useLanguage();
  const { openUpgrade } = useUpgrade();
  const refreshAfterSpend = useRefreshAfterSpend();
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || sending) return;

    const history: Message[] = [...messages, { role: "user", content }];
    onMessagesChange(history);
    onPromptChange("");
    setError(null);
    setSending(true);

    try {
      const { reply } = await apiFetch<{ reply: string }>("/api/assistant", {
        method: "POST",
        body: JSON.stringify({
          messages: history.slice(-MAX_HISTORY),
          language,
          projectId: focus?.projectId,
          requestId: crypto.randomUUID(),
        }),
      });
      onMessagesChange((current) => [...current, { role: "assistant", content: reply }]);
      refreshAfterSpend();
    } catch (err) {
      // Undo the optimistic message so the user can retry or upgrade
      onMessagesChange(messages);
      onPromptChange(content);
      if (isUpgradeError(err)) {
        openUpgrade(err.message);
      } else {
        setError(err instanceof Error ? err.message : t.app.somethingWrong ?? "");
      }
    } finally {
      setSending(false);
    }
  };

  const suggestions = [t.app.coachSuggestion1, t.app.coachSuggestion2, t.app.coachSuggestion3];

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
                {t.app.coachCost}
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close
              aria-label={t.shell.close}
              className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full bg-muted text-foreground transition-colors hover:bg-accent"
            >
              <X className="size-4" />
            </DialogPrimitive.Close>
          </header>

          <div ref={scrollRef} className="flex flex-1 flex-col gap-3 overflow-y-auto px-5 py-2" aria-live="polite">
            {messages.length === 0 ? (
              <div className="mt-auto space-y-3">
                <div className="bg-sage-glow rounded-xl p-5">
                  <span className="grid size-10 place-items-center rounded-full bg-card text-sage shadow-card">
                    <Sparkles className="size-5" />
                  </span>
                  <p className="mt-4 font-semibold">{t.app.coachEmptyTitle}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{t.app.coachEmptyBody}</p>
                </div>
                <div className="flex flex-col gap-2">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => send(s ?? "")}
                      className="cursor-pointer rounded-xl bg-muted px-4 py-2.5 text-start text-sm transition-colors hover:bg-accent"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    "max-w-[88%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
                    m.role === "user"
                      ? "self-end bg-primary text-primary-foreground"
                      : "self-start bg-muted text-foreground"
                  )}
                >
                  {m.content}
                </div>
              ))
            )}
            {sending && (
              <div className="inline-flex items-center gap-2 self-start rounded-2xl bg-muted px-4 py-2.5 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                {t.app.coachThinking}
              </div>
            )}
            {error && (
              <p role="alert" className="text-sm text-negative">
                {error}
              </p>
            )}
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              send(prompt);
            }}
            className="space-y-2 p-4"
          >
            {focus && (
              <div className="flex items-center gap-2 rounded-full bg-sage-softer px-3 py-1.5 text-xs text-sage">
                <FileText className="size-3.5 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{fmt(t.app.coachAboutItem, { title: focus.title })}</span>
                <button
                  type="button"
                  onClick={onClearFocus}
                  aria-label={t.shell.close}
                  className="grid size-5 shrink-0 cursor-pointer place-items-center rounded-full hover:bg-sage-soft"
                >
                  <X className="size-3" />
                </button>
              </div>
            )}
            <div className="flex h-12 items-center gap-2 rounded-full bg-muted ps-5 pe-1.5">
              <input
                ref={inputRef}
                value={prompt}
                onChange={(event) => onPromptChange(event.target.value)}
                placeholder={t.shell.coachInputPlaceholder}
                aria-label={t.shell.coachInputPlaceholder}
                maxLength={4000}
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              <button
                type="submit"
                disabled={sending || !prompt.trim()}
                aria-label={t.shell.send}
                className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-full bg-primary text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40"
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
