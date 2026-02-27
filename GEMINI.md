# Serify: Context-Aware Learning Reflection Engine

Serify is a diagnostic learning platform that uses AI to move beyond simple testing. It analyzes content consumed by a user and generates intelligent, scenario-based questions to map conceptual understanding, identify misconceptions, and target the "illusion of competence."

## 🚀 Project Overview

- **Purpose**: Personalized cognitive feedback through active recall and metacognition.
- **Primary Tech Stack**: 
  - **Framework**: Next.js (Pages Router)
  - **Language**: TypeScript
  - **Styling**: Tailwind CSS
  - **AI**: Google Gemini 2.5 Flash
  - **Backend/Auth**: Supabase (PostgreSQL + Auth)
- **Architecture**: Monolithic Next.js application with client-side state management (React Hooks/Context) and server-side API routes for AI orchestration and database interaction.

## 🛠️ Building and Running

### Commands
- `npm install`: Install dependencies.
- `npm run dev`: Start the development server on `http://localhost:3000`.
- `npm run build`: Build the production application.
- `npm run lint`: Run ESLint to check for code quality issues.

### Environment Setup
Required variables in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous API key.
- `GEMINI_API_KEY`: Google Generative AI API key.
- `NEXT_PUBLIC_SITE_URL`: Base URL for OAuth redirects (e.g., `http://localhost:3000`).

## 🧠 AI & Logic Conventions

### Gemini Integration (`lib/serify-ai.ts`)
- **Model**: `gemini-2.5-flash` is used for high-speed diagnostic tasks.
- **Prompting Strategy**: Prompts are strictly structured to return **raw JSON**. A custom `parseJSON` utility strips potential markdown fences before parsing.
- **Workflows**:
  1. **Extraction**: Identifies 4-6 key concepts from source material with importance and relationship metadata.
  2. **Assessment**: Generates Retrieval, Application, and Misconception Probe questions based on extracted concepts.
  3. **Analysis**: Evaluates user answers to produce a `depthScore`, a `strengthMap`, and actionable `focusSuggestions`.

### Database & Auth (`lib/supabase.ts`)
- **Authentication**: Uses Supabase Auth with PKCE flow. Supports Google OAuth.
- **Data Model**: Core entities include `reflection_sessions`, `concepts`, `assessment_questions`, `user_answers`, and `analyses`.
- **Security**: Row Level Security (RLS) is enabled on all tables; API routes use the user's access token to interact with Supabase to ensure data isolation.

## 🎨 UI & Styling
- **Theme**: Custom design system using CSS variables defined in `styles/globals.css` (e.g., `var(--accent)`, `var(--bg)`, `var(--surface)`).
- **Layout**: `DashboardLayout` provides consistent navigation across the app.
- **Icons**: Lucide-react is the primary icon library.

## 📂 Key Directory Structure
- `/pages/api/serify/`: Core AI orchestration endpoints.
- `/lib/`: Shared utilities and AI client wrappers.
- `/contexts/`: Global application state (e.g., `AuthContext`).
- `/types/`: Domain-specific TypeScript interfaces (`serify.ts`).
- `/supabase/migrations/`: Database schema and RLS policies.
