# Serify — Practice Page Spec
> This spec replaces the Practice Mode spec and the Verify Mode spec entirely. Practice is one unified page with multiple tools. Feed this alongside all other Serify spec files.

---

## Overview

Practice is where you apply and test knowledge. One page, six tools, all working the same way — type a topic or pick from your Vault, get something useful immediately.

No guided chains. No prerequisites. No steps to unlock. Every tool works on day one for a brand new user who has never done a session in Serify. Every tool also works with Vault concepts for users who have history.

The design philosophy: land on Practice, pick a tool, start in under 10 seconds.

---

## The Six Tools

| Tool | What It Does | Best For |
|---|---|---|
| **Practice Test** | Open-ended questions on any topic, graded | Testing existing knowledge fast |
| **Quick Quiz** | Short focused questions on specific concepts | Rapid retention check |
| **Timed Exam** | Full exam simulation with a countdown timer | Exam prep under pressure |
| **Real Scenario** | Apply knowledge to a realistic situation | Testing application not just recall |
| **Flashcards** | Generated card deck for a topic or concept set | Building familiarity with weak areas |
| **Spaced Review** | Review due concepts from your Vault | Maintaining long-term retention |

---

## The Page

### Layout

```
┌────────────────────────────────────────────────────────────────────┐
│  Practice                                                          │
│  Apply and test what you know.                                     │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Due for Review                          [Start Review →]   │   │
│  │  5 concepts due today  ·  ~8 minutes                        │   │
│  └─────────────────────────────────────────────────────────────┘   │
│  (only shown when concepts are due)                                │
│                                                                    │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │  📝               │  │  ⚡               │  │  ⏱               │  │
│  │  Practice Test   │  │  Quick Quiz      │  │  Timed Exam      │  │
│  │                  │  │                  │  │                  │  │
│  │  Test what you   │  │  Rapid check on  │  │  Full exam under │  │
│  │  think you know  │  │  a concept       │  │  time pressure   │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
│                                                                    │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │  🌍               │  │  🃏               │  │  🔄               │  │
│  │  Real Scenario   │  │  Flashcards      │  │  Spaced Review   │  │
│  │                  │  │                  │  │                  │  │
│  │  Apply to real   │  │  Build famili-   │  │  Review due      │  │
│  │  situations      │  │  arity fast      │  │  Vault concepts  │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
│                                                                    │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Recent Practice                                    See all →      │
│                                                                    │
│  Practice Test · Spanish Conjugations    Nov 14  Strong    [↩]    │
│  Timed Exam · Calculus Derivatives       Nov 12  Mixed     [↩]    │
│  Scenario · Machine Learning             Nov 10  Solid     [↩]    │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### Due for Review Banner

Only shows when the user has Vault concepts due for spaced review. Sits above the tool grid. One line description, one button. If nothing is due the banner is completely hidden — no empty state, no placeholder.

### Tool Cards

Six cards in a 3×2 grid. Each card:
- Icon (large, centered top)
- Tool name (Instrument Serif, 16px)
- One-line description (DM Sans muted, 13px)
- Hover state: subtle green border, card lifts slightly
- Click: opens the tool input inline below the grid

On mobile: 2×3 grid (two columns, three rows).

### Recent Practice

Last 3 practice sessions. Each row shows tool type, topic, date, performance state, and a replay button that re-runs the same tool on the same topic.

---

## How Every Tool Starts — The Input Pattern

Every tool uses the same input pattern when clicked. The tool cards fade slightly and an input panel slides in below the grid:

```
┌────────────────────────────────────────────────────────────────────┐
│  📝 Practice Test                                          [×]     │
│                                                                    │
│  What topic do you want to be tested on?                           │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  e.g. "Spanish present tense", "derivatives", "WWI causes"  │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  Or choose from your Vault:                                        │
│  [Positional Encoding]  [Backpropagation]  [View all →]           │
│  (only shown if user has Vault concepts)                           │
│                                                                    │
│  Difficulty:  [Auto ▾]                                             │
│                                                                    │
│                              [Generate →  ⚡ 5 tokens]             │
└────────────────────────────────────────────────────────────────────┘
```

**Free text input:** Always primary. Works for any topic. No session history required.

**Vault selector:** Secondary. Shows up to 5 recent Vault concepts as chips. "View all →" opens a searchable Vault picker. Only visible if the user has Vault concepts.

**Difficulty selector:** Auto (default — inferred from Vault mastery if available, otherwise medium), Easy, Medium, Hard. Only shown for tools where difficulty is meaningful (Practice Test, Quick Quiz, Timed Exam). Hidden for Flashcards and Scenario.

**Token cost:** Shown on the Generate button. Different per tool (see token costs section).

**[×] button:** Closes the input panel and returns to the tool grid.

---

## Tool 1 — Practice Test

### What It Is

An open-ended test on any topic. The core Verify experience — "I think I know this. Let's find out." No timer. No prerequisites. Works on anything.

**Token cost:** 8 tokens

### Generation

```typescript
const practiceTestPrompt = `
Generate a practice test for Serify.

Topic: ${topic}
Difficulty: ${difficulty}
User's Vault mastery on related concepts (if any): ${vaultContext}

Generate 6-8 open-ended questions that:
- Cover the breadth of the topic, not just one aspect
- Require explanation in the user's own words — not yes/no or fill-in-the-blank
- Progress from foundational to applied
- Are answerable in 3-6 sentences each by someone with solid knowledge
- Are appropriate for the difficulty level selected

Return JSON:
{
  "test_title": string,
  "topic_normalized": string,
  "estimated_minutes": number,
  "questions": [
    {
      "id": string,
      "text": string,
      "target_concept": string,
      "question_type": "definition" | "mechanism" | "application" | "synthesis",
      "difficulty": 1 | 2 | 3
    }
  ]
}
`;
```

### Interface

One question at a time. Progress dots at the top. No timer. User can navigate back and revise.

```
┌────────────────────────────────────────────────────────────────────┐
│  Practice Test · Spanish Present Tense          ● ● ○ ○ ○ ○       │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Question 2 of 6                                                   │
│                                                                    │
│  Explain the difference between regular -AR, -ER, and -IR          │
│  verb conjugations. Give one example of each.                      │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                                                              │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  [← Back]                                     [Next →]            │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

After final question: "Submit Test →" button.

### Results

```
┌────────────────────────────────────────────────────────────────────┐
│  Practice Test Results                                             │
│  Spanish Present Tense · 6 questions                               │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Overall: Mixed — 3 strong, 2 developing, 1 gap                   │
│                                                                    │
│  By concept:                                                       │
│  ⬤  Regular verb endings          Solid                           │
│  ⬤  Irregular verbs               Shaky    → [Practice this →]    │
│  ⬤  Stem-changing verbs           Missing  → [Practice this →]    │
│  ⬤  Reflexive verbs               Developing                      │
│                                                                    │
│  Question breakdown:                                               │
│  Q1 ✓  Clear explanation of -AR endings...                        │
│  Q2 ✓  Good examples, minor gaps in...                            │
│  Q3 ✗  Irregular verbs — you listed haber but missed...           │
│                                                                    │
│  [Practice weak concepts →]    [Try again →]    [Done]            │
└────────────────────────────────────────────────────────────────────┘
```

**"Practice weak concepts →"** launches the Quick Quiz tool pre-loaded with the gap concepts from this test. Natural bridge from testing to practicing.

**"Try again →"** generates a new test on the same topic with different questions.

Vault updated with concept mastery states from this test.

---

## Tool 2 — Quick Quiz

### What It Is

A short, focused quiz on a specific concept or small topic. 5 questions. Fast. For rapid retention checks between sessions.

**Token cost:** 3 tokens

### Generation

Same pattern as Practice Test but shorter and more focused. 5 questions, all targeting one concept or a tight cluster of related concepts.

### Interface

Same as Practice Test but with a cleaner, more compact feel. Progress shown as "3 / 5" not dots.

### Results

Simpler than Practice Test — just a pass/fail per question with one-line feedback on each. No full concept breakdown. Total time under 2 minutes.

---

## Tool 3 — Timed Exam

### What It Is

A full exam under time pressure. The pressure is the point — knowledge that holds up in a timed exam is knowledge you actually have.

**Token cost:** 10 tokens

### Setup

Before starting, user picks:

```
Timed Exam Setup

Topic: [already filled from input]

Format:
○  Standard       Mixed questions            45 min
○  Problem Set    Stepped difficulty         30 min
○  Essay          Long-form prompts          60 min
○  Case Study     Scenario-based             45 min
○  Technical      Problem-solving + explain  45 min

Questions: [8 ▾]   (5 / 8 / 10 / 12 / 15)

[Start Exam →]
```

### Interface

Full screen. No sidebar. No nav. Locked once started.

```
┌────────────────────────────────────────────────────────────────────┐
│  Calculus Derivatives — Standard Exam          ⏱  38:42           │
│  ● ● ● ○ ○ ○ ○ ○                                                   │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Question 3 of 8                                                   │
│                                                                    │
│  A particle's position is described by s(t) = 3t³ - 2t² + t.     │
│  Find the velocity and acceleration at t = 2, and determine        │
│  whether the particle is speeding up or slowing down.             │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                                                              │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  [← Previous]                              [Next Question →]       │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

Timer turns amber at 5 minutes remaining. Red at 1 minute. Auto-submits at zero.

### Results

Full exam report — overall performance, per-concept breakdown, per-question feedback, regressions flagged if concepts exist in Vault.

---

## Tool 4 — Real Scenario

### What It Is

A realistic situation where the user must apply their knowledge. Not "explain X" — "here's a problem in the real world, solve it using X."

**Token cost:** 5 tokens

### Generation

Domain-appropriate scenarios based on topic. The AI infers the domain from the topic and generates a scenario in the right style.

| Domain Detected | Scenario Style |
|---|---|
| Programming / CS | Debugging, system design, code review |
| Medicine / Biology | Patient case, lab interpretation |
| Math / Physics | Applied problem, failure analysis |
| Economics / Business | Case analysis, strategic decision |
| History / Humanities | Source analysis, argument construction |
| Language | Real conversation or writing task |
| Law | Case analysis, legal reasoning |
| General | "You are [role]. [Situation]. What do you do?" |

### Interface

Single scenario, single text response. No multiple parts. Clean.

```
┌────────────────────────────────────────────────────────────────────┐
│  Real Scenario · Machine Learning                                  │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  You're a data scientist at a fintech startup. Your fraud          │
│  detection model has 99.2% accuracy but your head of risk          │
│  is unhappy — she says it's missing too many actual fraud          │
│  cases. Using your knowledge of precision, recall, and             │
│  classification thresholds, explain what's happening and           │
│  how you'd address it.                                             │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                                                              │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│                                         [Submit Response →]        │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### Evaluation

Four dimensions, specific feedback:

1. **Concept identification** — did they identify the right concepts as relevant?
2. **Mechanism accuracy** — did they explain the mechanism correctly?
3. **Application quality** — did they apply it to this specific situation?
4. **Solution viability** — are their proposed solutions workable?

---

## Tool 5 — Flashcards

### What It Is

An AI-generated flashcard deck for any topic or set of concepts. Built for building familiarity, not testing it. Use before a Practice Test or Quiz.

**Token cost:** 2 tokens

### Generation

Generates 10-20 cards depending on topic breadth. Cards target the key concepts of the topic — not trivia, not edge cases. The things you actually need to know.

Card types:
- **Definition** — what is this concept?
- **Mechanism** — how does this work?
- **Example** — what does this look like in practice?
- **Distinction** — how is this different from X?

### Interface

Flip cards. Front shows prompt. Tap to reveal. Mark correct or needs review. Cards marked needs review cycle back.

```
┌────────────────────────────────────────────────────────────────────┐
│  Flashcards · Spanish Present Tense        12 / 18                 │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│                                                                    │
│              What is the stem-changing pattern                     │
│              for verbs like "poder" (o→ue)?                        │
│                                                                    │
│                                                                    │
│                        [Reveal →]                                  │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

After all cards seen once: show a summary of which cards were marked needs review, option to run through just those cards again.

After completion: "Ready to test yourself? [Take a Quick Quiz →]" — natural bridge to Quiz.

---

## Tool 6 — Spaced Review

### What It Is

Reviews due Vault concepts at the optimal moment for long-term retention. Written explanation required — not card flipping.

**Token cost:** 0 tokens (always free)

### Behavior

Only shows concepts that are due based on the review schedule. If no concepts are due, the tool card shows:

```
🔄 Spaced Review
Nothing due right now.
Next review: in 3 days
```

Still clickable — opens the tool input where user can manually select concepts to review early.

### Interface

One concept at a time. Explanation prompt rotates angles each review.

```
┌────────────────────────────────────────────────────────────────────┐
│  Spaced Review  ·  3 of 5 concepts                                 │
│  Last reviewed 7 days ago                                          │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Positional Encoding                                               │
│                                                                    │
│  Explain this concept as if you're teaching it to someone          │
│  who understands basic neural networks but has never               │
│  seen transformers.                                                │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│                                              [Submit →]            │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

Strong response → schedule advanced. Weak response → rescheduled to tomorrow. Three consecutive strong responses → concept graduates to Mastered.

---

## Natural Tool Bridges

After each tool completes, Serify suggests the logical next tool. These are not forced — always dismissible — but they create a natural pull through the toolkit.

```
Practice Test → "Practice weak concepts?" → Quick Quiz (on gaps)
Quick Quiz → "Ready to apply this?" → Real Scenario
Real Scenario → "Lock this in?" → Spaced Review scheduled
Flashcards → "Test your retention?" → Quick Quiz
Timed Exam → "Work on weak areas?" → Flashcards (on gaps)
Spaced Review → "Test broader understanding?" → Practice Test
```

The bridge appears as a single card at the bottom of the results screen — never a popup, never a redirect. The user chooses to follow it or not.

---

## PDF Export

Any Practice Test or Timed Exam can be exported as a clean printable PDF. Questions only, no answers. Always free — 0 tokens.

Export button appears on the results screen:

```
[Export as PDF →]  Free
```

PDF format:
- Clean professional layout
- Topic and date at top
- Numbered questions with blank answer space
- Time limit printed if from Timed Exam
- Serify wordmark small in footer

---

## Adaptive Difficulty

All tools (except Flashcards and Spaced Review) use adaptive difficulty. Invisible to the user.

**Starting level:**
- Auto (default): If Vault data exists for the topic, start at the mastery state of the weakest related concept. If no Vault data, start at Medium.
- Easy / Medium / Hard: User-selected override.

**Within-session adaptation:**
After every 2 responses, the AI adjusts the next question's difficulty:
- 2 consecutive strong → next question harder
- 2 consecutive weak → next question easier
- Mixed → stay at current level

**Difficulty levels:**
1. Define and describe
2. Explain the mechanism
3. Apply to a scenario
4. Synthesize across concepts
5. Edge cases and limitations

---

## Mastered State

Mastered is achievable through Spaced Review only. Three consecutive successful spaced reviews on a concept → Mastered.

Mastered concepts:
- Show a ⭐ in the Vault
- Still appear in Spaced Review but at very long intervals (90 days)
- Never shown in "Focus on these" gap suggestions on the dashboard
- Counted in the user's total mastery stats

---

## Printable Test Without Completing In-App

User can generate a printable practice test without answering it in Serify. Use case: printing for a study group or a tutor to grade manually.

From the Practice page, a small link below the tool grid:

```
Just want a printable test? Generate one without completing it in Serify →
```

Opens the same topic input, generates questions, exports directly to PDF. No session created, no tokens deducted until they actually generate (same cost as Practice Test).

---

## Routes

```
/practice                    → Practice page (tool grid + recent)
/practice/test/:id           → Practice Test session
/practice/quiz/:id           → Quick Quiz session
/practice/exam/:id           → Timed Exam session
/practice/scenario/:id       → Real Scenario session
/practice/flashcards/:id     → Flashcard session
/practice/review             → Spaced Review session
/practice/results/:id        → Any session results page
```

---

## Token Costs Summary

| Tool | Tokens | Notes |
|---|---|---|
| Practice Test | 8 | Generation + evaluation |
| Quick Quiz | 3 | Generation + evaluation |
| Timed Exam | 10 | Generation + evaluation |
| Real Scenario | 5 | Generation + evaluation |
| Flashcards | 2 | Generation only |
| Spaced Review | 0 | Always free |
| PDF Export | 0 | Always free |

---

## Database Schema

```sql
-- Unified practice sessions table
CREATE TABLE practice_sessions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),

  tool VARCHAR(20) NOT NULL,
  -- 'test' | 'quiz' | 'exam' | 'scenario' | 'flashcards' | 'review'

  -- Input
  topic VARCHAR(255),
  topic_normalized VARCHAR(255),
  source VARCHAR(20) DEFAULT 'free_text',
  -- 'free_text' | 'vault' | 'session'
  source_concept_ids UUID[],
  source_session_id UUID,

  -- Config
  difficulty VARCHAR(10) DEFAULT 'auto',
  -- 'auto' | 'easy' | 'medium' | 'hard'
  exam_format VARCHAR(20),
  -- for Timed Exam only
  time_limit_minutes INTEGER,
  -- for Timed Exam only
  question_count INTEGER,

  -- Content
  generated_content JSONB,
  -- questions array, cards array, scenario text etc.

  -- Results
  status VARCHAR(20) DEFAULT 'in_progress',
  -- 'in_progress' | 'completed' | 'timed_out' | 'abandoned'
  overall_performance VARCHAR(20),
  -- 'strong' | 'mixed' | 'developing' | 'weak'
  results JSONB,
  -- per-concept and per-question breakdown

  -- Tokens
  tokens_consumed INTEGER DEFAULT 0,

  -- Timing
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  time_spent_seconds INTEGER,

  -- Vault
  concept_ids_updated UUID[]
);

-- Individual responses (questions and scenario)
CREATE TABLE practice_responses (
  id UUID PRIMARY KEY,
  practice_session_id UUID REFERENCES practice_sessions(id),
  user_id UUID REFERENCES users(id),

  question_id VARCHAR(50),
  question_text TEXT,
  target_concept VARCHAR(255),
  question_type VARCHAR(20),
  difficulty_level INTEGER,

  user_response TEXT,
  response_quality VARCHAR(20),
  -- 'strong' | 'developing' | 'weak' | 'blank'
  ai_feedback TEXT,
  evaluation_dimensions JSONB,
  -- for scenario: {identification, mechanism, application, solution}

  question_number INTEGER,
  time_spent_seconds INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Flashcard sessions
CREATE TABLE flashcard_sessions (
  id UUID PRIMARY KEY,
  practice_session_id UUID REFERENCES practice_sessions(id),
  user_id UUID REFERENCES users(id),

  cards JSONB NOT NULL,
  total_cards INTEGER,
  cards_correct INTEGER DEFAULT 0,
  cards_needs_review INTEGER DEFAULT 0,

  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Spaced review schedule
CREATE TABLE review_schedule (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  concept_id UUID REFERENCES knowledge_nodes(id),

  next_review_date DATE NOT NULL,
  review_interval_days INTEGER NOT NULL,
  consecutive_successful_reviews INTEGER DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,

  last_reviewed_at TIMESTAMP,
  last_response_quality VARCHAR(20),

  is_mastered BOOLEAN DEFAULT FALSE,
  mastered_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id, concept_id)
);

-- PDF exports
CREATE TABLE practice_exports (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  practice_session_id UUID REFERENCES practice_sessions(id),
  export_type VARCHAR(20),
  file_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Sidebar Navigation

```
Home
New Session
✦ Learn
Practice          ← one item, goes to /practice
Sessions
Concept Vault
Settings
```

Practice replaces the separate Verify and Practice Mode items. One destination, all tools inside.

---

## Launch Checklist — Practice Page

**Page and Tool Grid**
- [ ] Tool grid renders correctly 3×2 on desktop, 2×3 on mobile
- [ ] Due for review banner shows when concepts are due, hidden when not
- [ ] Clicking a tool card opens the input panel below the grid
- [ ] Input panel shows free text input and optional Vault chips
- [ ] Vault chips only show if user has Vault concepts
- [ ] Difficulty selector shows for Test, Quiz, Exam — hidden for Flashcards, Scenario, Review
- [ ] Token cost shows correctly on Generate button per tool
- [ ] [×] closes input panel and returns to grid
- [ ] Recent practice shows last 3 sessions with replay button

**Practice Test**
- [ ] Generates 6-8 open-ended questions covering topic breadth
- [ ] One question at a time with progress dots
- [ ] User can navigate back and revise answers
- [ ] Results show overall performance and per-concept breakdown
- [ ] "Practice weak concepts →" pre-loads Quick Quiz with gap concepts
- [ ] "Try again →" generates new questions on same topic
- [ ] Vault updated with mastery states from test results
- [ ] 8 tokens deducted on generation + evaluation

**Quick Quiz**
- [ ] Generates 5 focused questions on topic
- [ ] Results show pass/fail per question with one-line feedback
- [ ] Natural bridge to Real Scenario shown after completion
- [ ] 3 tokens deducted

**Timed Exam**
- [ ] Setup screen shows format and question count options
- [ ] Full screen mode on start — no sidebar, no nav
- [ ] Timer counts down, amber at 5 min, red at 1 min
- [ ] Auto-submits at zero
- [ ] Full exam report with regressions flagged
- [ ] Vault states updated after exam
- [ ] 10 tokens deducted

**Real Scenario**
- [ ] Domain correctly inferred from topic
- [ ] Domain-appropriate scenario style used
- [ ] Evaluation covers all four dimensions
- [ ] Feedback specific to what the user wrote
- [ ] Natural bridge to Spaced Review shown after completion
- [ ] 5 tokens deducted

**Flashcards**
- [ ] Generates 10-20 cards appropriate to topic breadth
- [ ] Four card types generated (definition, mechanism, example, distinction)
- [ ] Flip animation works
- [ ] "Needs review" cards cycle back
- [ ] Summary shows which cards were marked needs review
- [ ] Natural bridge to Quick Quiz shown after completion
- [ ] 2 tokens deducted

**Spaced Review**
- [ ] Only due concepts shown (based on review_schedule table)
- [ ] Explanation prompt rotates — never same angle twice for same concept
- [ ] Strong response advances schedule correctly
- [ ] Weak response resets interval to 1 day
- [ ] Two consecutive weak responses suggests Flow Mode for that concept
- [ ] Three consecutive strong responses → Mastered state
- [ ] 0 tokens always — never gated

**PDF Export**
- [ ] Export button on Practice Test and Timed Exam results
- [ ] Questions-only PDF with blank answer space
- [ ] Clean professional layout with topic and date
- [ ] Time limit printed on Timed Exam exports
- [ ] 0 tokens always
- [ ] "Generate printable test without completing" link works

**Adaptive Difficulty**
- [ ] Auto difficulty uses Vault mastery when available
- [ ] Auto difficulty defaults to medium when no Vault data
- [ ] Two consecutive strong → harder next question
- [ ] Two consecutive weak → easier next question
- [ ] Difficulty ceiling at level 5, floor at level 1

**Tool Bridges**
- [ ] Bridge card shows at bottom of results — never a popup
- [ ] Correct bridge shown for each tool completion
- [ ] Bridge is dismissible
- [ ] Following bridge pre-loads target tool with correct topic/gaps

**Mastered State**
- [ ] Three consecutive successful reviews → Mastered
- [ ] Mastered flag written to review_schedule and knowledge_nodes
- [ ] ⭐ shown on Mastered concepts in Vault
- [ ] Mastered concepts not shown in dashboard gap suggestions

**Vault Integration**
- [ ] All tools that evaluate responses update Vault mastery states
- [ ] Concepts created in Vault if topic matches existing concepts
- [ ] New concepts added to Vault when topic introduces new ones
- [ ] Source tagged correctly: 'practice_test' | 'quiz' | 'exam' | 'scenario' | 'review'

**Routes**
- [ ] All six tool routes work correctly
- [ ] Results page accessible from recent practice history
- [ ] Replay button re-runs same tool on same topic
