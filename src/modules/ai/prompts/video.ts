// =============================================================================
// Video Studio — analysis prompt
// =============================================================================

import type { ChatMessage, ContentPart } from "../provider";
import type { VideoPackage } from "../video-schemas";

const OUTPUT_SHAPE = `{
  "detected": { "language": "<ISO 639-1 of the speech>", "languageName": "", "dialect": "<e.g. Tunisian Arabic, or empty>", "niche": "", "subNiche": "", "tone": "<Educational | Storytelling | High-energy hype | Controversial | Casual | ...>", "energy": "low|medium|high" },
  "core": { "takeaway": "", "problem": "", "audience": "" },
  "chapters": [ { "time": "0:00", "title": "Hook" } ],
  "youtube": {
    "titles": [ { "style": "Curiosity", "text": "" }, { "style": "Authority", "text": "" }, { "style": "How-to", "text": "" }, { "style": "Bold statement", "text": "" }, { "style": "List", "text": "" } ],
    "description": "<SEO description: strong first 2 lines, key takeaways, then the chapters as timestamps>",
    "tags": [ "<up to 30 tags, broad + specific>" ],
    "hashtags": [ "#<5 targeted hashtags>" ],
    "thumbnails": [ { "headline": "<2-4 words>", "expression": "<face/emotion guidance>", "layout": "<composition>" } ]
  },
  "short": {
    "hooks": [ { "style": "Pattern interrupt", "text": "" }, { "style": "Negativity bias", "text": "" }, { "style": "Curiosity gap", "text": "" } ],
    "caption": "",
    "hashtags": { "viral": [ "#" ], "niche": [ "#" ], "micro": [ "#" ] },
    "overlays": [ "<on-screen text for the first 3 seconds>" ]
  },
  "social": { "xThread": [ "<tweet 1>", "<tweet 2>" ], "linkedinPost": "" },
  "cueSheet": [ { "time": "0:00", "action": "cut | zoom | b-roll | caption | music | sfx", "note": "" } ],
  "hook": { "score": 0, "reasons": [ "" ], "improvedHook": "" }
}`;

export function buildVideoMessages(transcriptText: string, frames: string[]): ChatMessage[] {
  const system = `You are an elite YouTube, TikTok and Instagram growth strategist and video editor.
You receive the timestamped transcript of a creator's video${frames.length ? " and a few frames from it" : ""}.

Produce the creator's complete publishing package:
- Detect the spoken language (including Arabic dialects such as Tunisian Darija) and write ALL creative text (titles, descriptions, hooks, captions, posts) in that same language. Tags may mix in English search terms.
- Chapters and cue-sheet times MUST come from the transcript timestamps, formatted m:ss.
- YouTube titles: 40-65 characters, high click-through without misleading clickbait, one per style.
- Hook score: estimate 0-100 how well the first 10 seconds will hold viewers, judged on the actual opening lines. Be honest; most videos score 40-70. Give concrete reasons and a rewritten, stronger opening line.
- Cue sheet: practical editing instructions (where to cut dead air, zoom for emphasis, add b-roll, captions or music).
- Never invent facts, numbers or claims that are not in the video.

Return ONLY valid JSON with exactly this shape (no markdown):
${OUTPUT_SHAPE}`;

  const userText = `TRANSCRIPT:\n${transcriptText}`;
  const user: ChatMessage["content"] = frames.length
    ? [
        { type: "text", text: userText },
        ...frames.map((url): ContentPart => ({ type: "image_url", image_url: { url } })),
      ]
    : userText;

  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

/** Offline sample for development without an AI key (validated against the schema). */
export function sampleVideoPackage(): VideoPackage {
  return {
    detected: {
      language: "en",
      languageName: "English",
      dialect: "",
      niche: "Content creation",
      subNiche: "Video planning",
      tone: "Educational",
      energy: "medium",
    },
    core: {
      takeaway: "Plan every video with a hook-first, three-step framework.",
      problem: "Creators lose viewers in the first seconds and spend hours planning.",
      audience: "Beginner and growing YouTube creators",
    },
    chapters: [
      { time: "0:00", title: "Why most videos die early" },
      { time: "0:10", title: "The three-step framework" },
      { time: "0:20", title: "Step 1: Hook first" },
      { time: "0:30", title: "Step 2: Cut ruthlessly" },
      { time: "0:40", title: "Step 3: One clear action" },
    ],
    youtube: {
      titles: [
        { style: "Curiosity", text: "Why Your First 10 Seconds Are Killing Your Views" },
        { style: "Authority", text: "The Framework I Use to Plan Every Video in 1 Hour" },
        { style: "How-to", text: "How to Plan a YouTube Video That People Finish" },
        { style: "Bold statement", text: "Stop Editing First. Write Your Hook Before Anything" },
        { style: "List", text: "3 Steps to Plan Videos That Keep Viewers Watching" },
      ],
      description:
        "Most creators lose half their viewers in the first 10 seconds. Here is the three-step framework I use to plan every video in under an hour.\n\nKey takeaways:\n- Write the hook first\n- Cut every sentence that does not move the story\n- End with one clear action\n\n0:00 Why most videos die early\n0:10 The three-step framework\n0:20 Step 1: Hook first\n0:30 Step 2: Cut ruthlessly\n0:40 Step 3: One clear action",
      tags: ["youtube tips", "video planning", "how to plan a youtube video", "youtube hook", "content creator tips", "grow on youtube"],
      hashtags: ["#youtubetips", "#contentcreator", "#videoediting", "#creatortips", "#youtubegrowth"],
      thumbnails: [
        { headline: "STOP DOING THIS", expression: "Shocked, pointing at the text", layout: "Face right, bold red text left" },
        { headline: "1 HOUR PLAN", expression: "Confident smile", layout: "Face left, clock icon and text right" },
        { headline: "10 SECONDS", expression: "Serious, eyebrows raised", layout: "Close-up face, big number overlay" },
      ],
    },
    short: {
      hooks: [
        { style: "Pattern interrupt", text: "Delete your intro. Right now." },
        { style: "Negativity bias", text: "This one habit is why nobody finishes your videos." },
        { style: "Curiosity gap", text: "I plan every video in under an hour. Here's the trick." },
      ],
      caption: "Your first 10 seconds decide everything. Save this framework for your next video 👇",
      hashtags: {
        viral: ["#fyp", "#viral", "#foryou"],
        niche: ["#youtubetips", "#contentcreator"],
        micro: ["#videoplanning", "#hookwriting"],
      },
      overlays: ["Your intro is killing your views", "3 steps. 1 hour.", "Watch till step 3"],
    },
    social: {
      xThread: [
        "Most videos die in the first 10 seconds. Here's the 3-step framework I use to plan every video in under an hour 🧵",
        "1/ Write the hook first. If the promise isn't clear, nothing else matters.",
        "2/ Cut every sentence that doesn't move the story forward.",
        "3/ End with ONE clear action. Not five.",
      ],
      linkedinPost:
        "Most videos lose half their audience in the first 10 seconds.\n\nThe fix isn't better editing. It's planning:\n1. Write the hook first\n2. Cut what doesn't move the story\n3. End with one clear action\n\nWhich step do you skip most often?",
    },
    cueSheet: [
      { time: "0:00", action: "zoom", note: "Punch in on the first sentence for emphasis" },
      { time: "0:10", action: "caption", note: "Show '3 STEPS' as a bold on-screen title" },
      { time: "0:20", action: "b-roll", note: "Show a notebook with the hook written first" },
      { time: "0:30", action: "cut", note: "Remove the pause before 'Step two'" },
      { time: "0:40", action: "music", note: "Lift the music for the call to action" },
    ],
    hook: {
      score: 68,
      reasons: [
        "Opens with a clear problem in the first sentence",
        "Promise arrives at 10s; bring it into the first 3 seconds",
        "No visual change in the opening; add a zoom or text",
      ],
      improvedHook: "Your first 10 seconds are killing your views. Here's the 1-hour fix.",
    },
  };
}
