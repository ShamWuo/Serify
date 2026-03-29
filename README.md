# Serify — The Architect's Pen for Genuine Mastery

Serify is an AI-powered deep learning assistant designed to bridge the gap between passive consumption and active mastery. Using a "lofi-chill" design system and state-of-the-art diagnostic reasoning, Serify helps you architect your own knowledge vault, track your mastery over complex topics, and navigate personalized study roadmaps.

---

## 🧠 Core Pillars

### 1. The Concept Vault
The heart of your learning journey. Every session, quiz, and roadmap contributes to your **Concept Vault**—a structured repository of your evolving knowledge.
- **Mastery Mapping**: Visualize your strength across fundamental pillars and niche sub-concepts.
- **Mastery States**: Dynamically tracked as `mastered`, `solid`, `developing`, `shaky`, or `revisit`.
- **Knowledge Persistence**: Your progress is retained across all learning modes.

### 2. Roadmap Architect (Conversational Refinement)
Transform daunting goals into strategic study journeys with our AI-assisted **Blueprint Architect**.
- **Blueprint Architecting**: Refine your study plan in a dedicated two-column conversational interface. Edit topics inline or chat with the AI to optimize complexity, depth, and duration.
- **Intelligent Planning**: AI-generated curricula tailored to your target date and goal.
- **Adaptive Rescheduling**: Timeline shifts? Missed a day? The engine recalibrates your schedule to keep you on track.
- **High-Yield Focus**: Prioritizes topics based on importance and your current mastery.

### 3. Interactive Learning Flow
Step away from static videos and PDFs. Engage in an **Interactive Flow** that adapts to your responses.
- **Contextual Guidance**: The AI "Orients" you into the topic, "Builds Layers" of understanding, and "Anchors" concepts with retrieval practice.
- **Diagnostic Probing**: Specifically targets the "illusion of competence" with misconception-detecting questions.
- **Rich Media Support**: Integrated KaTeX for math and beautiful Markdown for technical clarity.

### 4. Ingest Station
Bring your own material from anywhere.
- **YouTube Support**: Instant distillation of video lectures into study-ready concepts.
- **PDF & Web Processing**: Turn long-form articles and textbooks into interactive assessments.
- **Raw Reflection**: Quickly jot down notes or copy-paste text for immediate diagnostic feedback.

---

## 🎨 Design System: The Architect's Pen (Minimalist Overhaul)
Serify features a bespoke, distraction-free design language focused on deep work:
- **Header-less Interface**: Removed all redundant page headers and decorative titles to maximize focus on your learning tasks.
- **Action-Oriented Layouts**: Navigation and context are integrated directly into functional components.
- **Lofi-Chill Aesthetic**: Clean, high-contrast patterns designed for absolute focus and zero distractions.
- **Paper-Grid Primitives**: UI that feels like a precision blueprint for your mind.

---

## 🛠 Tech Stack

- **Framework**: Next.js 15 (Pages Router)
- **Language**: TypeScript (Strict)
- **Styling**: Tailwind CSS + Custom Design Tokens
- **AI Engine**: Google Gemini 2.0 Flash & Pro
- **Database**: Supabase (PostgreSQL + RLS)
- **Auth**: Supabase Auth (PKCE Flow)
- **Billing**: Stripe (Subscription Management)
- **Visuals**: Lucide React + Framer Motion

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Supabase Project
- Google Gemini API Key

### Installation
```bash
# Clone the repository
git clone https://github.com/ShamWuo/Serify.git
cd Serify

# Install dependencies
npm install

# Setup environment
cp env.example .env.local

# Run development server
npm run dev
```

### Environment Variables
Configure your `.env.local` with the following:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `GEMINI_API_KEY`
- `STRIPE_SECRET_KEY` (Optional, for billing)

---

## 🏁 Deployment
Serify is optimized for deployment on **Vercel**. Ensure all environment variables are mirrored in your Vercel project settings.

---

## ⚖️ License
Serify is a proprietary educational platform. All rights reserved.
