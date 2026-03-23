# Serify — AI Context Document

## What it is

Serify is a diagnostic learning platform that helps people develop genuine understanding, not surface-level familiarity. It analyzes content the user has consumed (YouTube videos, articles, pasted text, PDFs) and uses AI to probe their understanding with targeted questions, identify misconceptions, and surface the gaps between what they *think* they know and what they actually know.

The core insight is that traditional quizzes test recall. Serify tests *conceptual depth* — it generates scenario-based, application-layer questions and evaluates freeform answers to produce a nuanced picture of what's solid, what's shaky, and what's missing.

---

## Core User Flows

### 1. Session (Analyze Mode)
1. User pastes a URL, YouTube link, or raw text
2. AI extracts 4–6 key concepts from the content (with relationships and importance weights)
3. AI generates a mix of Retrieval, Application, and Misconception Probe questions per concept
4. User answers questions in a focused session
5. AI evaluates their answers and produces a feedback report with:
   - **Depth Score** (0–100)
   - **Strength Map** (per-concept: solid / developing / shaky / revisit)
   - **Focus Suggestions** (actionable next steps)

### 2. Learn Mode
1. User types a topic/goal (e.g. "How transformers work")
2. AI builds a structured curriculum: modules, lessons, key concepts per lesson
3. User works through lessons using interactive learning materials:
   - **Flashcards** — term-definition cards, spaced based on Got It / Shaky responses
   - **Practice Quiz** — multiple-choice questions with instant explanations
   - **Explain It To Me** — AI generates a clear explanation of a concept
   - **Deep Dive** — AI generates an extended analysis + comprehension question
   - **Feynman Challenge** — user explains a concept in their own words; AI grades it
   - **AI Tutor** — freeform chat with a concept-aware tutor

### 3. Flow Mode
An adaptive session built around a curriculum. The AI asks one question at a time, adapts difficulty and concept focus based on performance, and guides the user toward mastery before moving on.

---

## Technical Architecture

- **Framework**: Next.js (Pages Router), TypeScript
- **Styling**: Tailwind CSS with a custom CSS variable design system (light/dark tokens)
- **AI**: Google Gemini 2.5 Flash — all prompts return structured JSON, parsed with a custom utility
- **Backend**: Supabase (PostgreSQL + Auth)
  - Auth: email/password + Google OAuth (PKCE flow)
  - RLS enabled on all tables
- **Economy**: A "Sparks" credit system — each AI action costs Sparks (deducted via a PostgreSQL RPC to prevent race conditions). Three pools: trial (expires in 14 days), top-up (purchased), subscription (monthly allowance).
- **Monetization**: Stripe for subscriptions (Pro at $12/mo) and one-time top-up packs

## Current Feature Set (What's Built)

- ✅ Content ingestion (text, URL detection with content type tagging)
- ✅ Concept extraction and session creation
- ✅ Assessment question generation (Retrieval, Application, Misconception Probe types)
- ✅ Freeform answer evaluation with depth scoring and strength map
- ✅ Session feedback report page with concept breakdown
- ✅ Sessions library with mastery bar per session
- ✅ Concept Vault — cross-session knowledge graph with mastery tracking
- ✅ Learn Mode curriculum builder
- ✅ All 6 learning material modes (flashcards, practice, explain, deepdive, feynman, tutor)
- ✅ Flow Mode — adaptive AI-driven learning sessions
- ✅ Spark credit economy with deduction, top-up, trial expiry
- ✅ Stripe billing (subscriptions + one-time packs)
- ✅ Onboarding flow (persona + learning goals)
- ✅ Public session sharing with OG image generation
- ✅ Settings: account, learning preferences, spark history
- ✅ Dashboard: smart input, resume banner, recent sessions, spark balance, focus concepts

---

## Key Design Decisions / Opinion Pieces

- **Why AI evaluates freeform answers, not MCQ only**: Multiple-choice masks gaps. A user can score 80% while understanding almost nothing. Forced freeform surfaces the illusion of competence.
- **Why Sparks (credits) instead of a usage cap**: Credits create intentionality — users think before running AI. It also enables a fairer monetization model (pay for what you use) without arbitrary session limits.
- **Why Gemini 2.5 Flash**: Low latency is critical for interactive learning. Evaluation and question generation need to feel instant or the flow breaks.
- **Why a Vault (cross-session concept graph)**: Sessions are episodic. The Vault makes knowledge accumulate. A concept seen across 5 sessions should feel more solid than one seen once.

---

## Things I'd Value Feedback On

- **Product positioning**: Is "diagnostic learning" a compelling category, or does this need a simpler description?
- **Onboarding funnel**: Users start with 15 trial Sparks and an onboarding persona screen. Is this the right first experience?
- **Spark pricing**: Is a credit system the right monetization primitive for a learning tool, or will it feel punitive?
- **Feature sprawl**: Serify has 6 learning modes, Flow Mode, Vault, and Analyze. Is this too much? What should be simplified or cut?
- **The "illusion of competence" framing**: Is this a resonant hook for marketing, or is it too academic?
- **Retention mechanic**: Currently the only pull-back is a "Focus on these" widget on the dashboard showing shaky concepts. What else should drive return visits?
- **B2B angle**: Universities, bootcamps, and corporate L&D teams are obvious buyers. Does the current feature set translate to that context?
