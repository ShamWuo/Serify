# Serify — Flashcard System Spec
> Full-featured flashcard system with Quizlet parity plus AI advantages Quizlet can't match. Feed this alongside all other Serify spec files.

---

## Overview

Serify's flashcard system matches everything Quizlet offers and goes further in three ways Quizlet can't: cards are generated from real content the user studied, every card is tied to a Vault mastery state, and the AI can explain any card on demand.

---

## Card Generation

Cards are generated from:
1. **A session** — after analyzing content, Serify generates cards for the concepts extracted
2. **A topic** — user types any topic from the Practice page, cards generated from scratch
3. **Vault concepts** — generate cards for specific concepts or a whole category
4. **Manual** — user creates cards themselves

Each card has:
- Front (question/prompt)
- Back (answer)
- Concept tag (which Vault concept this belongs to)
- Card type: Definition / Mechanism / Example / Distinction
- Star status (default: unstarred)
- Progress status: Not studied / Still learning / Know it
- Times seen
- Times correct / incorrect

---

## The Flashcard Study Interface

### Layout

Full-page focused mode when studying. No sidebar. Clean.

```
┌────────────────────────────────────────────────────────────────────┐
│  ← Back    Transformer Architecture  ·  18 cards      [Settings ⚙]│
│                                                                    │
│  ████████████░░░░░░░░  8 / 18                                      │
│                                                                    │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│                                                                    │
│            What is the role of the Query matrix                    │
│            in the attention mechanism?                             │
│                                                                    │
│                                                                    │
│                      [Tap to reveal →]                             │
│                                                                    │
├────────────────────────────────────────────────────────────────────┤
│  [← Prev]    ☆ Star    💬 Explain    [Next →]                      │
└────────────────────────────────────────────────────────────────────┘
```

---

## Core Features

### 1. Progress Tracking

Every card has one of three progress states:

| State | Label | Color |
|---|---|---|
| Not studied | Grey | Default |
| Still learning | Amber | #B8860B |
| Know it | Green | #2A5C45 |

Progress is set automatically based on the user's answers — or manually by the user at any time.

**Automatic tracking:**
- User marks "Got it" → Know it
- User marks "Still learning" → Still learning
- Card seen but no answer given → Not studied

**Progress bar** at the top of the study session shows the proportion of each state across the deck. Updates in real time as the user goes through cards.

**Turn progress tracking off:** Toggle in Settings. When off, cards cycle without recording results. Useful for quick review without affecting stats.

---

### 2. Star System

Any card can be starred with one tap. Stars serve as a manual bookmark — user decides which cards matter most.

**Study starred only:** Toggle in session settings that filters the deck to starred cards only. Useful for focusing on the most important or hardest concepts before an exam.

**Star button** appears in the bottom action bar during study. Also visible in the deck list view where the user can star cards without entering study mode.

---

### 3. Shuffle

Shuffle randomizes card order for the current study session. Toggle in session settings. State persists for the session — turning shuffle off returns to the original order at the current position.

---

### 4. Front/Back Swap

Choose what shows on the front of the card:

```
What shows on front?
○  Question (default)
○  Answer — test yourself in reverse
```

Toggle in session settings. Swapping front and back tests the user's ability to generate the prompt from the answer, not just recognize the answer from the prompt. Much harder, much more effective for durable retention.

---

### 5. Sort Options

In the deck list view (before entering study mode), the user can sort cards:

```
Sort by:
○  Original order (default)
○  Alphabetical (front text)
○  Progress — Still learning first
○  Progress — Know it first
○  Starred first
○  Random
```

---

### 6. Filter Options

Filter which cards appear in the study session:

```
Study which cards?
○  All cards (default)
○  Starred only
○  Still learning only
○  Not studied only
○  Know it only (review to confirm retention)
○  Custom — mix and match
```

Filters and shuffle can be combined. A user can study "Starred + Still learning, shuffled" in one session.

---

### 7. Card Edit

Any card can be edited — front, back, or both. Edit button in the card detail view and in the deck list.

When a card is edited, a small "Edited" tag appears. If the card was AI-generated and the user edits it, the original AI version is preserved and can be restored.

---

### 8. Deck Management

**In the deck list view:**

```
Transformer Architecture                          18 cards

  ☆  What is the role of the Query...     Know it    [Edit] [···]
  ★  How does scaled dot-product...       Still learning  [Edit] [···]
  ☆  Why is the softmax function...       Not studied  [Edit] [···]
```

Each row shows:
- Star status (tap to toggle)
- Card front text (truncated)
- Progress state
- Edit button
- ··· menu (move to another deck, delete, reset progress)

**Bulk actions** (select multiple cards):
- Star / unstar all selected
- Reset progress for selected
- Move to another deck
- Delete selected

---

## AI Features (Beyond Quizlet)

### Explain This Card

Every card has an "Explain" button in the study interface. Tapping it opens a panel that explains the concept behind the card in plain language — no token cost for this, uses Flash model.

```
💬 Explain

The Query matrix in attention is essentially asking "what am I looking
for?" Each token generates a Query vector that gets compared against
all the Key vectors in the sequence. The dot product between Q and K
determines how much attention each token should pay to every other
token. Think of it like a search query — the Query describes what
you want, the Keys describe what's available.

[Got it]    [Go deeper →  1 token]
```

"Go deeper" triggers a Tier 2 AI assistant message for a fuller explanation.

### Generate More Cards

At the end of a deck or from the deck settings, the user can ask Serify to generate more cards:

```
Generate more cards

○  Add 5 more cards on this topic
○  Generate cards for gaps only (concepts marked Still learning)
○  Generate harder cards (Level 3+ difficulty)
○  Generate example cards (one per concept)
```

AI generates the requested cards and appends them to the deck. User can review and delete any they don't want before they're saved.

### Auto-Generate from Weak Vault Concepts

From the dashboard or the Concept Vault, one button: "Generate flashcards for my weak concepts." Serify reads the Vault, finds all Shaky and Revisit concepts, and generates a focused deck. No topic input needed.

### Card Quality Improvement

In the ··· menu on any card: "Improve this card." The AI rewrites the card to be clearer, more specific, or better formatted for recall. The original version is preserved. User accepts or rejects the improvement.

---

## Session Settings Panel

Accessible from the ⚙ icon in the study header. Slides in from the right.

```
Study Settings

Progress Tracking
[●] Track progress    (toggle off for quick review)

Cards to Study
[●] All cards
[ ] Starred only
[ ] Still learning only
[ ] Not studied only

What shows on front?
[●] Question
[ ] Answer (reverse)

Order
[●] Original order
[ ] Shuffled

Show answer automatically after
[ ] 5 seconds
[ ] 10 seconds
[ ] 30 seconds
[●] Never (manual reveal)

[Apply]
```

Settings are saved per-deck. Opening the same deck again remembers your last settings.

---

## Study Modes

Beyond the standard flip card mode, three additional study modes:

### Learn Mode (within flashcards)

Adaptive card presentation. Cards marked Still learning appear more frequently than Know it cards. Cards marked Not studied appear once then get sorted into Still learning or Know it based on the user's self-report. The session ends when all cards are marked Know it.

This is the most effective mode for actually learning a deck. Recommended by default for new decks.

### Write Mode

Instead of flip cards, the user types the answer. Their typed answer is compared against the correct answer by AI — not exact string match, but semantic similarity. Partial credit given.

```
┌────────────────────────────────────────────────────────────────────┐
│  Write Mode  ·  5 / 18                                             │
│                                                                    │
│  What is the role of the Query matrix in the attention mechanism?  │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Type your answer...                                         │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                              [Submit →]            │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

After submit, shows correct answer alongside their answer with AI feedback on the gap. This mode costs 1 token per card (AI evaluation) — shown as a note before starting: "Write mode uses AI to evaluate your answers."

### Rapid Fire Mode

Timed. Cards flip automatically every N seconds (user sets: 3 / 5 / 10 seconds). No answer evaluation — pure exposure. For users who want fast review before an exam without the friction of self-grading. Progress tracking disabled automatically in this mode.

---

## Sharing

### Share Link

Every deck gets a public read-only link. Anyone with the link can flip through the deck without a Serify account. The shared view is clean — just the cards, no Serify UI.

```
serify.study/deck/abc123
```

**Shared deck view:**
- Full flip card interface
- Can be studied in the browser
- Cannot be edited — view only
- Shows "Made with Serify" watermark + signup CTA at the end of the deck

### Challenge Link

After completing a study session with progress tracking on, the user can share a challenge: "Can you beat my score?"

The recipient opens the link, studies the same deck, and their final Know it percentage is shown alongside the challenger's.

```
Samuel challenged you!
He got 14/18 (78%) on Transformer Architecture.
Can you beat it?

[Accept Challenge →]
```

No account required to accept a challenge.

### Export

**Anki (.apkg):** Exports the deck as a proper Anki package file that imports directly into Anki. Cards import with front/back intact. No formatting lost.

**Quizlet (.txt):** Tab-separated text file. Front[tab]Back per line. Imports directly into Quizlet's import feature.

**CSV:** Front, Back, Concept, Progress columns. For spreadsheet use or custom import.

**Print:** Generates a printable PDF. Cards arranged in a 2-column grid. Front on top, back below (folded format). Or front-only for a separate answer key sheet.

---

## Deck Library

At `/practice/flashcards` — all the user's decks in one place.

```
My Decks

  [+ New Deck]    [Import]

  Transformer Architecture      18 cards   67% Know it   Nov 14
  Spanish Present Tense         24 cards   33% Know it   Nov 10
  Calculus Derivatives          12 cards  100% Know it ✓  Nov 5
  ── Shared with me ──
  AP Bio Cell Division          31 cards   —              Nov 12
```

Each deck shows:
- Card count
- Progress percentage (Know it / total)
- Last studied date
- 100% Know it shows a ✓ — completed state

**Decks shared with the user** appear in a separate section below their own decks.

---

## Keyboard Shortcuts (Desktop)

| Key | Action |
|---|---|
| Space / → | Next card |
| ← | Previous card |
| F | Flip card |
| S | Star / unstar |
| 1 | Mark as Know it |
| 2 | Mark as Still learning |
| E | Open Explain panel |
| Esc | Back to deck list |

---

## Database Schema

```sql
-- Flashcard decks
CREATE TABLE flashcard_decks (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,

  -- Source
  source_type VARCHAR(20),
  -- 'session' | 'topic' | 'vault' | 'manual' | 'shared'
  source_session_id UUID REFERENCES reflection_sessions(id),
  source_topic VARCHAR(255),
  source_concept_ids UUID[],

  -- Stats
  total_cards INTEGER DEFAULT 0,
  cards_know_it INTEGER DEFAULT 0,
  cards_still_learning INTEGER DEFAULT 0,
  cards_not_studied INTEGER DEFAULT 0,

  -- Sharing
  is_public BOOLEAN DEFAULT FALSE,
  share_token VARCHAR(50) UNIQUE,
  shared_by_user_id UUID,

  -- Settings (last used per deck)
  last_settings JSONB DEFAULT '{}',

  created_at TIMESTAMP DEFAULT NOW(),
  last_studied_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Individual cards
CREATE TABLE flashcards (
  id UUID PRIMARY KEY,
  deck_id UUID REFERENCES flashcard_decks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),

  front TEXT NOT NULL,
  back TEXT NOT NULL,
  concept_tag VARCHAR(255),
  concept_id UUID REFERENCES knowledge_nodes(id),
  card_type VARCHAR(20),
  -- 'definition' | 'mechanism' | 'example' | 'distinction'

  -- Star
  is_starred BOOLEAN DEFAULT FALSE,

  -- Progress
  progress_state VARCHAR(20) DEFAULT 'not_studied',
  -- 'not_studied' | 'still_learning' | 'know_it'

  -- Stats
  times_seen INTEGER DEFAULT 0,
  times_correct INTEGER DEFAULT 0,
  times_incorrect INTEGER DEFAULT 0,
  last_seen_at TIMESTAMP,

  -- Edit tracking
  original_front TEXT, -- preserved if AI-generated and user edits
  original_back TEXT,
  is_edited BOOLEAN DEFAULT FALSE,
  is_ai_generated BOOLEAN DEFAULT TRUE,

  position INTEGER DEFAULT 0, -- original order
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Study sessions
CREATE TABLE flashcard_study_sessions (
  id UUID PRIMARY KEY,
  deck_id UUID REFERENCES flashcard_decks(id),
  user_id UUID REFERENCES users(id),

  -- Settings used
  mode VARCHAR(20),
  -- 'flip' | 'learn' | 'write' | 'rapid_fire'
  cards_studied UUID[], -- ordered list of card IDs shown
  settings_used JSONB,
  -- {shuffle, front_back_swap, filter, progress_tracking, auto_flip_seconds}

  -- Results
  cards_seen INTEGER DEFAULT 0,
  cards_know_it INTEGER DEFAULT 0,
  cards_still_learning INTEGER DEFAULT 0,
  completion_percentage INTEGER DEFAULT 0,

  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  duration_seconds INTEGER
);

-- Challenge records
CREATE TABLE flashcard_challenges (
  id UUID PRIMARY KEY,
  deck_id UUID REFERENCES flashcard_decks(id),
  challenger_user_id UUID REFERENCES users(id),
  challenger_score INTEGER, -- know_it count
  challenger_total INTEGER,
  challenge_token VARCHAR(50) UNIQUE,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Challenge attempts
CREATE TABLE flashcard_challenge_attempts (
  id UUID PRIMARY KEY,
  challenge_id UUID REFERENCES flashcard_challenges(id),
  user_id UUID REFERENCES users(id), -- null if anonymous
  display_name VARCHAR(100), -- for anonymous attempts
  score INTEGER,
  total INTEGER,
  completed_at TIMESTAMP DEFAULT NOW()
);
```

---

## Token Costs

| Action | Tokens |
|---|---|
| Generate flashcard deck | 2 tokens |
| Generate more cards (append) | 1 token |
| Explain this card (Flash model) | 0 tokens |
| Go deeper on explanation | 1 token |
| Write mode evaluation (per card) | 1 token |
| Improve card quality | 0 tokens |
| Export (all formats) | 0 tokens |
| Share link generation | 0 tokens |

Write mode is the only study mode that costs tokens — because it requires AI evaluation of each typed answer. All other study modes are free to use once the deck is generated.

---

## Launch Checklist — Flashcard System

**Core Study Interface**
- [ ] Flip card interface works — tap to reveal, front/back display
- [ ] Progress bar updates in real time as cards are studied
- [ ] Progress tracking toggle works — off mode doesn't record results
- [ ] Star button toggles star state on card and in deck list
- [ ] Shuffle toggle randomizes order for current session
- [ ] Front/back swap toggle works — answer shows on front
- [ ] Auto-flip timer works for all three intervals

**Sort and Filter**
- [ ] All six sort options work in deck list view
- [ ] All filter options work — starred, still learning, not studied, know it
- [ ] Filter and shuffle can be combined
- [ ] Settings saved per deck and remembered on next open

**Card Management**
- [ ] Card edit works — front, back, or both
- [ ] Original AI version preserved when card is edited
- [ ] Restore original version works
- [ ] Bulk select works — star, reset, move, delete
- [ ] ··· menu per card works — move, delete, reset, improve

**Study Modes**
- [ ] Learn Mode — still learning cards appear more frequently
- [ ] Learn Mode — session ends when all cards marked Know it
- [ ] Write Mode — typed answer evaluated by AI semantically
- [ ] Write Mode — partial credit given for close answers
- [ ] Write Mode — 1 token deducted per card evaluation
- [ ] Rapid Fire Mode — auto-flip at set interval
- [ ] Rapid Fire Mode — progress tracking disabled automatically

**AI Features**
- [ ] Explain button opens explanation panel — 0 tokens
- [ ] Go deeper triggers AI assistant Tier 2 message — 1 token
- [ ] Generate more cards works — appends to deck
- [ ] Auto-generate from weak Vault concepts works
- [ ] Improve card quality works — original preserved

**Sharing**
- [ ] Share link generates unique token
- [ ] Shared deck view works without account
- [ ] Shared view shows Serify watermark + signup CTA
- [ ] Challenge link generates correctly
- [ ] Challenge recipient can complete without account
- [ ] Challenge scores shown side by side

**Export**
- [ ] Anki .apkg export works and imports into Anki correctly
- [ ] Quizlet .txt export works and imports into Quizlet correctly
- [ ] CSV export includes all columns
- [ ] Print PDF generates clean 2-column card layout
- [ ] All exports are 0 tokens

**Deck Library**
- [ ] All decks shown with correct stats
- [ ] 100% Know it shows completion checkmark
- [ ] Shared decks appear in separate section
- [ ] Import works for .csv and .txt formats

**Keyboard Shortcuts**
- [ ] All 9 shortcuts work on desktop
- [ ] Shortcuts don't interfere with typing in Write Mode

**Database**
- [ ] Cards correctly linked to Vault concepts via concept_id
- [ ] Vault mastery states update when card progress changes
- [ ] Study session recorded to flashcard_study_sessions table
- [ ] Challenge tokens expire correctly
