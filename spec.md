# Serify — Exam Roadmap & Study Scheduling Spec

Students don't just study randomly — they study toward something. An exam, a certification, a deadline. This spec covers the Exam Roadmap feature: a structured study plan built backward from a target date, with daily scheduling, progress tracking, and adaptive rescheduling when life gets in the way.

---

## Overview

The Exam Roadmap is a reverse-engineered study plan. The user tells Serify what they're preparing for and when the exam is. Serify calculates how many study days are available, divides the material into manageable daily sessions, and builds a calendar the user can follow. Every day has a specific task. Progress is tracked. When the user falls behind, the plan adapts.

This is not a generic to-do list. It's an intelligent schedule that knows what the user has and hasn't mastered, adjusts based on their actual performance, and ensures the most important material gets the most time.

---

## Entry Points

- Sidebar nav — **Roadmap** (new top-level item)
- Homepage dashboard — "Preparing for an exam? Build a study roadmap →"
- Concept Vault — "Turn this subject into an exam roadmap →"
- After a session — "Building toward an exam? Add this to your roadmap →"

---

## Roadmap Creation Flow

### Step 1 — What are you preparing for?

```
What exam or goal are you preparing for?

[ AP Calculus BC, MCAT, CFA Level 1, Bar Exam...     ]

Or describe it: [ I want to master calculus derivatives ]
```

Free text. Serify normalizes the input and identifies:
- The subject domain
- The likely scope of material (broad exam vs single topic)
- Whether it's a standardized test (SAT, MCAT, LSAT, AP, GRE, CFA, Bar, etc.)

For recognized standardized tests, Serify has predefined topic lists it can use as a starting scaffold. For custom topics, it generates the topic list from the description.

---

### Step 2 — When is your exam?

```
Exam date
[ Select date — calendar picker ]

How many days per week can you study?
○  3 days    ○  4 days    ○  5 days    ○  6 days    ○  Every day

How long per session?
○  30 min    ○  45 min    ○  1 hour    ○  1.5 hours    ○  2 hours
```

Serify calculates:
- Total days until exam
- Total available study sessions
- Total study hours

Shows a summary: **"You have 34 study sessions and 51 hours before your exam."**

If the timeline is too short for the scope: **"This is a tight timeline for AP Calculus BC. I'll prioritize the highest-weight topics and mark others as stretch goals."**

---

### Step 3 — What do you already know?

```
What's your current level with this material?

○  Starting from scratch
○  I've studied some of it
○  I know most of it, just need review

Do you have existing Vault concepts for this subject?
[Yes — use my Vault data]    [No — start fresh]
```

If the user has Vault concepts for the subject, Serify reads their mastery states and skips or compresses already-Solid concepts. This means a user who has done 10 sessions on calculus gets a roadmap that reflects what they actually know — not a generic plan that starts from zero.

---

### Step 4 — Review and confirm the topic list

Serify generates a full topic breakdown before building the schedule. The user can review and edit:

```
Your AP Calculus BC Roadmap — 22 topics

Unit 1 — Limits and Continuity          4 topics
  ✓  Definition of a Limit              Solid — will review briefly
  ○  Continuity and Discontinuity       Not studied — full session
  ○  Limits at Infinity                 Not studied — full session
  ○  L'Hôpital's Rule                   Not studied — full session

Unit 2 — Derivatives                    6 topics
  ○  Definition of the Derivative       Not studied — full session
  ...

[Remove topic]  [Add topic]  [Reorder]

                              [Build My Schedule →]
```

Topics the Vault shows as Solid get abbreviated treatment (review session, not full session). Topics marked Revisit get double sessions automatically.

---

## The Schedule

After confirmation, Serify builds a day-by-day calendar. Every study day has one primary topic and one optional secondary task.

```
AP Calculus BC Roadmap
34 sessions  ·  Exam: May 15  ·  47 days away

This week

  Mon Apr 7     Continuity and Discontinuity      [Start →]
                Optional: Review Limit definition

  Wed Apr 9     Limits at Infinity                [Locked]

  Fri Apr 11    L'Hôpital's Rule                  [Locked]

Next week
  Mon Apr 14    Definition of the Derivative      [Locked]
  ...

Final week (exam week)
  Mon May 12    Full review — weakest concepts    [Locked]
  Wed May 14    Light review — confidence pass    [Locked]
  Thu May 15    EXAM DAY                          ⭐
```

**Locked sessions** unlock as the user completes previous sessions. Can't skip ahead.

**Exam week** is always reserved:
- 3 days before: full review of weakest concepts
- 1 day before: light confidence pass — only Solid concepts, nothing new
- Exam day: marked, no study session assigned

---

## Daily Session Flow

When the user clicks [Start →] on today's session:

**1. Warm-up (5 min)** — a quick 2-question review of yesterday's topic. Keeps previous material fresh. If they struggle, yesterday's topic gets scheduled for a brief revisit.

**2. Main session (bulk of the time)** — a full Serify session on today's topic. Content ingestion if they have a source to paste, or Serify generates questions from its knowledge of the topic directly.

**3. Practice (remaining time)** — based on today's performance, Serify suggests flashcards, a quick quiz, or a scenario. The user can do it now or skip to their spaced review queue.

**4. Session close** — mastery state updated, tomorrow's session confirmed, streak updated.

---

## Adaptive Rescheduling

Life happens. The roadmap adapts.

### Missed session

If a study day passes without the user completing the session, Serify doesn't penalize them or silently fall behind. The next time they open the app:

```
You missed Wednesday's session on Limits at Infinity.

Your roadmap has been adjusted. Here's what changed:
- Limits at Infinity moved to today
- L'Hôpital's Rule moved to Saturday
- You're still on track for your May 15 exam.

[Start today's session →]    [View updated schedule]
```

Serify redistributes missed sessions across available future days. If there's no room, it flags which topics will be compressed or skipped and asks the user to confirm.

### Struggling with a topic

If a session ends with a Shaky or Revisit mastery state, Serify automatically schedules a follow-up:

```
You struggled with L'Hôpital's Rule today.
I've added a 20-minute review session on Thursday before
you move on to the next topic.
```

The follow-up is shorter than a full session — targeted review on the specific gaps, not a full reteach.

### Ahead of schedule

If the user completes sessions early or performs exceptionally well:

```
You're 3 sessions ahead of schedule.

Options:
○  Keep the extra time as buffer before your exam
○  Add a stretch topic — Integration by Parts
○  Use the time for deeper practice on weak areas
```

---

## Progress Tracking

### Roadmap overview card (on dashboard homepage)

```
┌──────────────────────────────────────────────────────────┐
│  AP Calculus BC                      47 days to exam     │
│                                                          │
│  ████████░░░░░░░░░░░░  8 of 22 topics complete           │
│                                                          │
│  Today: Limits at Infinity          [Start →]            │
└──────────────────────────────────────────────────────────┘
```

### Full roadmap page stats

```
Overall Progress
  Topics complete      8 / 22    36%
  Sessions complete   12 / 34    35%
  Days remaining      47
  Sessions remaining  22
  Study time logged   9h 20min

Mastery Distribution
  ██████░░░░  Solid          6 topics
  ████░░░░░░  Developing     4 topics
  ██░░░░░░░░  Shaky          2 topics
  ░░░░░░░░░░  Not started   10 topics

Streak
  Current streak      4 days
  Longest streak      7 days
  Sessions this week  3 / 3 planned
```

### Topic completion map

A visual grid of all topics — color coded by mastery state. At a glance the user sees what's done, what's in progress, and what hasn't been touched.

---

## Exam Day Mode

The day before the exam, Serify switches into Exam Day Mode:

```
Your AP Calculus BC exam is tomorrow.

Tonight's plan:
1.  Review your 4 weakest concepts (20 min)
2.  One confidence pass through your flashcards (15 min)
3.  Sleep — seriously. Don't study past 10pm.

You've put in 9 hours and 20 minutes. You're ready.
```

No new material. No full sessions. Just a targeted review of the weakest areas and a confidence-building flashcard pass. Serify explicitly tells the user to stop studying — overlearning the night before an exam is counterproductive and Serify knows this.

---

## Post-Exam

After the exam date passes, Serify shows a post-exam card:

```
How did AP Calculus BC go?

○  Passed / Did well
○  Okay — could have been better
○  Didn't go well

Optional: [ Share your score or any notes... ]

[Submit]
```

This data feeds into improving future roadmap recommendations — if users who spent more time on a specific topic did better, future roadmaps weight that topic higher.

---

## Multiple Roadmaps

Users can have multiple active roadmaps simultaneously — for example, AP Chemistry and AP English Literature at the same time.

When multiple roadmaps are active, the scheduler intelligently interleaves sessions so subjects don't conflict. If two sessions are scheduled on the same day, Serify separates them by subject and suggests a morning/evening split.

```
Tuesday has two sessions scheduled:
  Morning  AP Chemistry — Equilibrium
  Evening  AP English — Rhetorical Analysis

Estimated total: 1h 40min
```

Maximum 3 active roadmaps simultaneously. More than that becomes unmanageable and the product should say so.

---

## Notifications and Reminders

**Daily study reminder** — push notification or email at the user's preferred time:
> "Today: Limits at Infinity — 45 min. Your exam is in 47 days. [Start now →]"

**Streak at risk** — if the user hasn't studied by 8pm on a scheduled day:
> "Your 4-day streak is at risk. Today's session takes 45 minutes. [Start →]"

**Exam approaching** — at 7 days, 3 days, and 1 day before the exam:
> "7 days until AP Calculus BC. You have 3 sessions left. Here's what still needs work: [topic list]"

**Behind schedule alert** — if the user is 2+ sessions behind:
> "You're 2 sessions behind on your AP Calculus BC roadmap. Your schedule has been adjusted. [View changes →]"

---

## Study Scheduling Settings

The user can customize their schedule at any time:

```
Schedule Settings

Study days
[✓] Monday   [✓] Wednesday   [✓] Friday
[ ] Tuesday  [ ] Thursday    [ ] Saturday   [ ] Sunday

Session length
[○ 30 min] [● 45 min] [○ 1 hour] [○ 1.5 hours]

Preferred study time
[ ] Morning (6am–12pm)
[●] Afternoon (12pm–6pm)
[ ] Evening (6pm–11pm)

Reminder time
[8:00 PM ▾]

Buffer before exam
[○ 1 day] [● 3 days] [○ 1 week]
(Time reserved at the end for review — no new topics)

[Save Settings]
```

Changes to schedule settings trigger an automatic roadmap recalculation.

---

## Recognized Standardized Exams

For these exams, Serify has predefined topic lists and weights sessions by how heavily each topic appears on the real exam:

**US Academic**
SAT (Math, Reading/Writing), ACT, AP exams (all 38 subjects), PSAT

**Graduate Admissions**
GRE (Verbal, Quantitative, Analytical Writing), GMAT, LSAT, MCAT

**Professional Certifications**
CFA (Level 1, 2, 3), CPA (all 4 sections), Bar Exam, PMP, AWS certifications, Google Cloud certifications, CompTIA (A+, Security+, Network+)

**Language**
TOEFL, IELTS, DELF, JLPT

**Custom**
Any subject or topic the user describes — Serify generates the topic list from scratch.

---

## Token Costs

| Action | Tokens |
|---|---|
| Create roadmap (custom topic list generation) | 5 tokens |
| Create roadmap (recognized exam — uses preset list) | 2 tokens |
| Daily warm-up questions | 2 tokens |
| Main session | 13 tokens (same as regular session) |
| Adaptive rescheduling | 0 tokens (rule-based, no AI) |
| Post-exam analysis | 0 tokens |

---

## Database Schema

```sql
CREATE TABLE exam_roadmaps (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  exam_type VARCHAR(50),
  -- 'standardized' | 'certification' | 'custom'
  exam_name VARCHAR(255),
  exam_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  -- 'active' | 'completed' | 'abandoned'

  -- Schedule config
  study_days_per_week INTEGER,
  session_length_minutes INTEGER,
  preferred_time VARCHAR(20),
  -- 'morning' | 'afternoon' | 'evening'
  buffer_days INTEGER DEFAULT 3,

  -- Progress
  total_topics INTEGER,
  completed_topics INTEGER DEFAULT 0,
  total_sessions INTEGER,
  completed_sessions INTEGER DEFAULT 0,
  sessions_missed INTEGER DEFAULT 0,
  total_study_minutes INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,

  -- Post-exam
  exam_outcome VARCHAR(20),
  -- 'passed' | 'okay' | 'failed' | null
  exam_notes TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  last_activity_at TIMESTAMP
);

CREATE TABLE roadmap_topics (
  id UUID PRIMARY KEY,
  roadmap_id UUID REFERENCES exam_roadmaps(id),
  user_id UUID REFERENCES users(id),
  concept_id UUID REFERENCES knowledge_nodes(id),

  title VARCHAR(255) NOT NULL,
  unit VARCHAR(255),
  position INTEGER,
  weight FLOAT DEFAULT 1.0,
  -- higher weight = more sessions allocated
  is_stretch_goal BOOLEAN DEFAULT FALSE,

  status VARCHAR(20) DEFAULT 'not_started',
  -- 'not_started' | 'in_progress' | 'complete' | 'skipped'
  mastery_at_completion VARCHAR(20),
  sessions_allocated INTEGER DEFAULT 1,
  sessions_completed INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE roadmap_sessions (
  id UUID PRIMARY KEY,
  roadmap_id UUID REFERENCES exam_roadmaps(id),
  topic_id UUID REFERENCES roadmap_topics(id),
  user_id UUID REFERENCES users(id),

  session_type VARCHAR(20),
  -- 'main' | 'warmup' | 'followup' | 'review' | 'exam_day'
  scheduled_date DATE NOT NULL,
  scheduled_length_minutes INTEGER,

  status VARCHAR(20) DEFAULT 'scheduled',
  -- 'scheduled' | 'completed' | 'missed' | 'rescheduled'
  completed_at TIMESTAMP,
  actual_length_minutes INTEGER,

  reflection_session_id UUID,
  mastery_after VARCHAR(20),
  rescheduled_from DATE,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE roadmap_notifications (
  id UUID PRIMARY KEY,
  roadmap_id UUID REFERENCES exam_roadmaps(id),
  user_id UUID REFERENCES users(id),
  type VARCHAR(30),
  -- 'daily_reminder' | 'streak_risk' | 'exam_approaching' | 'behind_schedule'
  scheduled_for TIMESTAMP,
  sent_at TIMESTAMP,
  dismissed_at TIMESTAMP
);
```

---

## Sidebar Navigation

```
Home
New Session
✦ Learn
Practice
Roadmap          ← NEW
Sessions
Concept Vault
Settings
```

When a roadmap is active, the nav item shows a small indicator:

```
Roadmap    ● Today
```

---

## Launch Checklist

**Creation Flow**
- [ ] Free text exam input normalizes correctly for standardized exams
- [ ] Topic list generated correctly for recognized exams with preset weights
- [ ] Topic list generated from scratch for custom exams
- [ ] Vault mastery read correctly — Solid concepts abbreviated, Revisit concepts doubled
- [ ] Date picker works, available sessions calculated correctly
- [ ] Study days and session length saved correctly
- [ ] Topic review screen shows correct mastery states from Vault
- [ ] User can remove, add, and reorder topics before confirming
- [ ] Schedule generates correctly with locked sessions
- [ ] Exam week reserved correctly — 3-day buffer + 1-day light review + exam day marker

**Daily Sessions**
- [ ] Warm-up shows 2 questions on yesterday's topic
- [ ] Warm-up struggle triggers follow-up scheduling for yesterday's topic
- [ ] Main session works end to end — session, feedback, mastery update
- [ ] Session close confirms tomorrow's session and updates streak
- [ ] Locked sessions cannot be started out of order

**Adaptive Rescheduling**
- [ ] Missed session detected correctly on next login after scheduled date
- [ ] Missed session redistributed correctly across future available days
- [ ] No available slots triggers compression/skip confirmation dialog
- [ ] Shaky/Revisit mastery after session auto-schedules shorter follow-up
- [ ] Ahead of schedule shows three options correctly
- [ ] Rescheduled sessions update `rescheduled_from` field in DB

**Progress Tracking**
- [ ] Dashboard roadmap card shows when roadmap active
- [ ] Progress bar updates after each session
- [ ] Full stats page shows all metrics correctly
- [ ] Mastery distribution updates in real time
- [ ] Streak increments on session completion, resets on missed study day
- [ ] Topic completion map renders all topics with correct mastery colors

**Multiple Roadmaps**
- [ ] Multiple roadmaps can be created simultaneously
- [ ] Interleaved schedule separates subjects correctly on same-day conflicts
- [ ] Maximum 3 roadmaps enforced with clear messaging

**Exam Day Mode**
- [ ] Activates automatically the day before exam date
- [ ] Shows only weakest concepts and flashcard confidence pass
- [ ] Explicitly tells user to stop studying — no new sessions assignable
- [ ] Post-exam survey appears after exam date passes
- [ ] Post-exam outcome saved to roadmap record

**Notifications**
- [ ] Daily reminder sends at user's preferred time
- [ ] Streak at risk fires at 8pm if session not completed
- [ ] Exam approaching fires at 7 days, 3 days, 1 day
- [ ] Behind schedule alert fires when 2+ sessions missed
- [ ] All notifications link directly to the relevant session or schedule view

**Settings**
- [ ] Study days selection works and triggers schedule recalculation
- [ ] Session length change triggers schedule recalculation
- [ ] Reminder time saved and respected
- [ ] Buffer days setting changes exam week reservation correctly

**Token Costs**
- [ ] Roadmap creation deducts correct tokens (5 custom, 2 recognized)
- [ ] Warm-up deducts 2 tokens
- [ ] Main session deducts 13 tokens
- [ ] Adaptive rescheduling deducts 0 tokens
- [ ] Token gate shows before session start if insufficient tokens