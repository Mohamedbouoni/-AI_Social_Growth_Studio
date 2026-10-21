# AI Social Growth Studio

AI content studio for YouTube, TikTok and Instagram creators, built for Tunisia first: English and Arabic (RTL), free AI models, monthly free credits, and paid plans in Tunisian dinars through Konnect (bank card, e-Dinar, Flouci wallet).

Stack: Next.js 16 · React 19 · Tailwind 4 · Supabase (auth + Postgres) · React Query · Zod.

---

## Setup

You need Node.js 20+ and a free [Supabase](https://supabase.com) project.

### 1. Install

```bash
npm install
```

### 2. Create the database (one time)

1. Open your project on supabase.com → **SQL Editor** → **New query**.
2. Paste the whole content of [`supabase/setup.sql`](supabase/setup.sql) and click **Run**.

This creates all tables, security rules and functions, and creates a workspace for any account that already signed up. (With the Supabase CLI you can run `supabase db push` instead, which applies `supabase/migrations/001`–`004`.)

> If the dashboard shows **"Setup required — The database is not set up yet"**, this step was skipped.

### 3. Fill in `.env.local`

Copy `.env.example` to `.env.local` and set:

| Variable | Where to find it | Needed for |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API | Everything |
| `SUPABASE_SERVICE_ROLE_KEY` | Same page (keep it secret, server only) | Generating, Coach, credits, payments |
| `GROQ_API_KEY` and/or `GEMINI_API_KEY` | [console.groq.com/keys](https://console.groq.com/keys), [aistudio.google.com/apikey](https://aistudio.google.com/apikey) — both free | Real AI output |
| `KONNECT_API_KEY`, `KONNECT_WALLET_ID` | [Konnect sandbox dashboard](https://dashboard.sandbox.konnect.network) | Paid plans |
| `NEXT_PUBLIC_APP_URL` | Your public site URL (`http://localhost:3000` locally) | Payment redirects and webhook |

Without any AI key, `npm run dev` uses a built-in sample AI, so you can try everything before getting keys. Production refuses to generate until a key is set.

Leave `AI_PROVIDER` empty unless you run [Ollama](https://ollama.com) locally and want to use it instead.

### 4. Run

```bash
npm run dev
```

Open http://localhost:3000, click **Get Started**, create an account and confirm the email Supabase sends you.

---

## Using the app

| Page | What you do there |
|---|---|
| **Overview** | See credits left, drafts and scheduled posts. Type an idea, pick a platform and press **Generate** to jump into the Studio. |
| **AI Studio** | Pick platform, format, niche, tone and language (English or Arabic), describe your idea, press **Generate**. You get titles/hooks/scripts/captions/hashtags shaped for that platform. Every result is saved to the Library automatically. **Repurpose** turns one idea into YouTube + TikTok + Instagram at once (paid plans). |
| **Library** | All saved content. Filter by platform, search, change status (draft → planned → published), open the viewer to copy text, or **Ask Coach about it** for feedback. Growth plan can export CSV. |
| **Calendar** | Drag drafts from the right panel onto a day (or use the date picker on phone). Scheduled items become "Planned". |
| **Analytics** | Credits used per day, by platform and by action. |
| **Billing** | Your plan, credits, renewal date and payment history. Choose a plan and pay with Konnect. |
| **Ask Coach** (floating button) | Chat with the AI growth coach: ideas, hooks, posting times, feedback. 1 credit per message. |

**Credits and plans**

| Plan | Price | Credits | Extras |
|---|---|---|---|
| Free | 0 TND | 10 / month (resets on the 1st) | 4 tones, fast AI model |
| Creator | 19 TND / 30 days | 150 | All 8 tones, smarter model, Repurpose |
| Growth | 49 TND / 30 days | 600 | Everything + library CSV export |

A generation or a Coach message costs 1 credit, Repurpose costs 3. When credits run out, the app shows the plans and sends you to Konnect to pay. Paid plans are prepaid 30-day passes — nothing renews automatically; renewing early adds 30 days.

---

## Development

```bash
npx tsc --noEmit   # type-check
npm run lint
npm run build
```

Key folders: `src/modules/ai` (free LLM chain with fallback, prompts, Coach, Repurpose), `src/modules/billing` (credits, plans, Konnect), `src/app/api` (route handlers), `src/app/dashboard` (pages), `supabase/migrations` (schema).
