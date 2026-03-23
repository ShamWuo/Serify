# Serify Agent Guide (AGENTS.md)

Welcome to the **Serify** codebase. This guide is designed to help AI coding assistants understand the project structure, tech stack, coding conventions, and core business logic to contribute effectively.

## 🚀 Project Overview
Serify is an AI-powered deep learning assistant that helps users achieve genuine mastery over complex topics. It uses a "Concept Vault" to track user knowledge, provides diagnostic assessments, generates personalized curricula, and offers interactive "Flow" learning sessions.

---

## 🛠 Tech Stack
- **Frontend Framework:** Next.js 15 (using the `pages/` directory).
- **Language:** TypeScript.
- **Styling:** Tailwind CSS (with a custom design system using CSS variables in `globals.css`).
- **Backend/Database:** Supabase (Auth, PostgreSQL, Row Level Security).
- **AI Engine:** Google Gemini AI (via `@google/generative-ai` and `ai` SDK).
- **Billing:** Stripe (Subscriptions, Webhooks).
- **Icons:** Lucide React.
- **Math Rendering:** KaTeX (`react-markdown` with `remark-math` and `rehype-katex`).
- **Testing:** Vitest with `jsdom`.

---

## 📂 Directory Structure
- `/pages`: Next.js pages and API routes.
- `/components`: UI components, organized by domain (dashboard, assistant, billing, etc.).
- `/lib`: Core business logic and service integrations.
    - `serify-ai.ts`: Main AI logic (concept extraction, assessment generation, etc.).
    - `supabase.ts`: Supabase client initialization (includes a custom mutex for token refreshing).
    - `stripe.ts` & `pages/api/webhooks/stripe.ts`: Billing integration.
    - `usage.ts`: Usage tracking and enforcement.
- `/contexts`: React Context providers (`AuthContext`, `AssistantContext`).
- `/hooks`: Custom React hooks (`useUsage`, `useSessionMaterials`).
- `/types`: TypeScript interfaces (core models in `serify.ts`, DB types in `db_types_new.ts`).
- `/supabase`: SQL migrations and configuration.
- `/scripts`: Utility scripts for maintenance.
- `/styles`: Global styles and Tailwind configuration.

---

## 🏗 Core Architecture & Concepts

### 1. The Concept Vault
The heart of Serify is the **Concept Vault**. It's a structured repository of everything a user knows or is learning.
- **Mastery Pillars**: Broad categories (e.g., "DNS", "Quantum Mechanics").
- **Sub-concepts**: Specific technical terms or techniques under a pillar.
- **Mastery States**: `mastered`, `solid`, `developing`, `shaky`, `revisit`.

### 2. Reflection Sessions
Users submit content (YouTube URL, PDF, Article, or Text). Serify:
1. Extracts concepts using AI (`lib/serify-ai.ts`).
2. Generates a diagnostic assessment.
3. Analyzes user answers to update mastery states in the Vault.

### 3. Flow Mode & Curriculum
- **Flow Mode**: An interactive, step-by-step teaching session that adapts to the user's level.
- **Curriculum**: A structured path generated to take a user from beginner to master of a specific goal.

### 4. Practice Mode
A suite of tools (`test`, `quiz`, `exam`, `scenario`, `flashcards`, `review`) to reinforce learning.

---

## 🔐 Coding Conventions

### TypeScript & Types
- **Strict Typing**: Always use TypeScript. Avoid `any` unless absolutely necessary (e.g., complex third-party metadata).
- **Model Reuse**: Prefer using types from `types/serify.ts` for domain logic.
- **Database Types**: Use the generated types in `types/db_types_new.ts` when interacting with Supabase.

### Components
- **Functional Components**: Use React functional components with hooks.
- **Tailwind for Styling**: Use the custom utility classes (e.g., `text-accent`, `bg-surface`, `border-border`).
- **Icons**: Use `Lucide React` for all icons.
- **Error Boundaries**: Wrap complex sections in `ErrorBoundary` (see `components/ErrorBoundary.tsx`).

### State Management
- **Context API**: Use `AuthContext` for user session and `AssistantContext` for global AI assistant state.
- **Local State**: Use `useState` and `useReducer` for component-level state.
- **Data Fetching**: Use standard `fetch` or Supabase client within hooks/components.

### API Routes
- **Standard Next.js Patterns**: API routes are in `pages/api/`.
- **Validation**: Use `Zod` for request body validation.
- **Error Handling**: Use consistent error responses (e.g., `res.status(400).json({ error: 'Message' })`).

---

## 🛢 Database & Security
- **Supabase RLS**: Every table in the `public` schema **MUST** have Row Level Security enabled. Policies should ensure users can only access their own data.
- **Migrations**: All schema changes must be added as SQL files in `supabase/migrations/`.
- **Service Role**: Use `supabaseAdmin` (from `lib/supabase.ts`) **ONLY** in server-side API routes when bypassing RLS is strictly required (e.g., webhooks, crons).

---

## 🤖 AI Integration (Gemini)
- **Model Selection**: 
    - `MODEL_FLASH` (`gemini-2.5-flash`): Used for most tasks (fast, cheap).
    - `MODEL_PRO` (`gemini-2.5-flash`): Currently mapped to the same model as flash as per developer preference, but can be scaled if needed.
- **Prompting Strategy**: We use structured JSON prompting. Always ensure the AI returns valid JSON using the `responseMimeType: 'application/json'` config.
- **Logic Location**: Keep complex AI orchestration in `lib/serify-ai.ts`.

---

## 💳 Billing & Tiers
- **Plans**: `free`, `pro`, `proplus`.
- **Enforcement**: Usage is tracked in the `usage_tracking` table and enforced via `lib/gates.ts` or `components/billing/UsageEnforcement.tsx`.
- **Stripe**: Handle all subscription lifecycle events in `pages/api/webhooks/stripe.ts`.

---

## 🧪 Development & Commands
- **Environment**: Copy `env.example` to `.env.local` and fill in the values.
- **Run Dev Server**: `npm run dev`
- **Build**: `npm run build`
- **Lint**: `npm run lint`
- **Test**: `npm run test` (runs Vitest)

---

## 🏁 Deployment
- **Platform**: Vercel.
- **Crons**: Managed via `vercel.json` (e.g., expiring trials, refreshing subscriptions).
- **Environment Variables**: Ensure all variables in `env.example` are set in the Vercel dashboard.

## 🧪 Feature Flags
- **System**: We use a feature flagging system to control the rollout of new features.
- **Location**: The `feature_flags` table in Supabase stores the state of all flags.
- **Usage**:
    - Check if a feature is enabled using `lib/feature-flags.ts`.
    - Use the `useFeatureFlag` hook in components to conditionally render UI.
    - Flags are managed via the Supabase SQL migrations and can be updated via the database or a future admin interface.

---

## Credentals:
test-user-10k@serify.app
Password123



*Note: This guide is a living document. Please update it as the architecture evolves.*
