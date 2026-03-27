# Serify — Learn Mode Spec
> Feed this to the agent alongside all other Serify spec files. Learn Mode is a second major entry point into Serify — instead of analyzing content the user brings, Serify builds a curriculum from scratch based on what the user wants to learn and teaches it through Flow Mode.

---

## Overview

Serify has two entry points into learning:

**Analyze Mode (existing):** User brings content → Serify diagnoses understanding → Learning area fixes gaps.

**Learn Mode (new):** User brings curiosity → Serify builds a curriculum → Flow Mode teaches it concept by concept.

Both feed the same Concept Vault. Both write the same mastery signals. Both are accessible from the dashboard. They are two doors into the same building.

Learn Mode does not replace Analyze Mode. It expands who Serify is for. A student who just watched a lecture uses Analyze Mode. A student who wants to understand something they haven't studied yet uses Learn Mode. The same person will use both depending on the moment.

---

## What A User Can Type

Learn Mode accepts four input types. The AI interprets all of them correctly regardless of how they're phrased.

| Input Type | Example | What Serify Does |
|---|---|---|
| Single concept | "derivatives" / "what is a derivative" | Generates a single-concept curriculum around that concept and its prerequisites |
| Broad topic | "calculus" / "I want to learn calculus" | Generates a multi-concept curriculum scoped by the user after seeing the full map |
| Goal | "understand how neural networks learn" / "I want to get how backprop works" | Infers the concepts required to reach that goal and generates a targeted curriculum |
| Question | "why does compounding interest matter?" / "how does the attention mechanism work?" | Answers the question through structured teaching, not a direct answer |

The AI normalizes all four types into the same curriculum structure before showing it to the user. The user never needs to know which input type they used.

---

## Entry Points

### 1. Dashboard — Primary Entry Point

The dashboard Quick Start card has two tabs:

```
[Analyze]  [Learn]
```

The Learn tab is the new addition. On selecting it:

```
  What do you want to learn?

  ┌──────────────────────────────────────────────┐
  │  Type a concept, topic, goal, or question... │
  └──────────────────────────────────────────────┘

  Or pick from your gaps:
  ⬤  Positional Encoding        Shaky   3 sessions
  ⬤  Related Rates              Revisit 2 sessions
  ⬤  Softmax Normalization       Shaky   1 session

                              [Build Curriculum →]
```

The gap suggestions pull from the user's Concept Vault (Shaky + Revisit concepts, most recent first). Clicking a gap pre-fills the input with that concept name.

For first-time users with no Concept Vault yet, the gap suggestions are replaced with topic suggestions based on their onboarding learning_context:

```
  Popular starting points:
  → Machine learning fundamentals
  → How transformers work
  → Calculus from the beginning
```

These are static suggestions seeded by the user's stated learning area during onboarding. If no learning context was provided, show three universally popular starting points.

### 2. Concept Vault — Concept Panel

On any concept detail panel in the Vault, a Learn Mode button:

```
[✦ Learn This Concept]
```

Pre-fills the Learn Mode input with the concept name and skips directly to the curriculum screen.

### 3. Sidebar Nav

A `✦ Learn` item in the sidebar that goes directly to `/learn` — a standalone Learn Mode input page for users who want to start learning without going through the dashboard.

---

## Route Structure

| Route | Purpose |
|---|---|
| `/learn` | Standalone Learn Mode input page |
| `/learn/curriculum/:curriculumId` | Curriculum review screen — user picks where to start |
| `/learn/curriculum/:curriculumId/flow` | Flow Mode session for this curriculum |

The `/learn` route is also accessible via the Learn tab on the dashboard Quick Start card — clicking Build Curriculum navigates to `/learn/curriculum/:id` after generation.

---

## The Curriculum Generation Screen

After the user submits their input, one Pro model call generates the curriculum. This takes 3–6 seconds. Show a loading state:

```
  ✦ Building your curriculum...

  [Animated indicator]

  Figuring out what you need to know
  and in what order to learn it.
```

On completion, navigate to `/learn/curriculum/:id`.

---

## The Curriculum Screen (`/learn/curriculum/:id`)

This is the most important screen in Learn Mode. It shows the user exactly what Serify is going to teach them, lets them understand the scope, and lets them decide where to start.

### Layout

Full page. Two columns on desktop, single column on mobile.

**Left column (65%):** The curriculum — a visual list of concepts in learning order.
**Right column (35%):** Context about the curriculum — what it covers, estimated time, Spark cost.

### Left Column — The Curriculum

```
  Calculus — Foundations
  Generated for you · 12 concepts

  ┌──────────────────────────────────────────────┐
  │  UNIT 1 — Understanding Change               │
  │                                              │
  │  1  ⬤  Limits                    ~8 min     │
  │  2  ⬤  Continuity                ~5 min     │
  │  3  ⬤  The Derivative (concept)  ~10 min    │  ← Start here
  │  4  ⬤  Differentiation rules     ~12 min    │
  │                                              │
  │  UNIT 2 — Applying Derivatives               │
  │                                              │
  │  5  ⬤  Finding extrema           ~8 min     │
  │  6  ⬤  Optimization problems     ~15 min    │
  │  7  ⬤  Related rates             ~12 min    │
  │                                              │
  │  UNIT 3 — Integration                        │
  │                                              │
  │  8  ⬤  The integral (concept)    ~10 min    │
  │  9  ⬤  Fundamental theorem       ~12 min    │
  │  10 ⬤  Integration techniques    ~15 min    │
  │                                              │
  │  UNIT 4 — Connecting It All                  │
  │                                              │
  │  11 ⬤  Series and sequences      ~10 min    │
  │  12 ⬤  Applications overview     ~8 min     │
  │                                              │
  └──────────────────────────────────────────────┘

  [Start from the beginning →]
```

**Concept row details:**
- Numbered in learning order
- Mastery state dot (grey = not yet started, colored if already in Concept Vault)
- Concept name
- Estimated time to complete in Flow Mode
- Clicking any concept shows a brief tooltip: the concept's one-sentence definition and why it's in the curriculum

**"Start here" marker:**
Serify automatically marks the recommended starting point based on what the user already knows. If the Concept Vault shows they already have strong mastery on concepts 1 and 2, the marker moves to concept 3. If they're a complete beginner, it starts at concept 1.

The start-here marker is a suggestion, not a lock. The user can start anywhere.

**Unit structure:**
Concepts are grouped into units — logical clusters of 3–5 concepts that form a coherent sub-topic. Units make the curriculum feel structured rather than just a flat list. Unit names are generated by the AI.

For a single-concept input (e.g. "derivatives"), the curriculum is much smaller — typically 3–5 concepts covering the concept itself and any prerequisites the AI determines are necessary. No unit grouping for small curricula — just a flat list.

### Right Column — Curriculum Context

```
  ┌──────────────────────────────────────────────┐
  │  Calculus — Foundations                      │
  │                                              │
  │  12 concepts across 4 units                  │
  │  ~2 hours total at your pace                 │
  │                                              │
  │  What you'll be able to do:                  │
  │  · Understand what a derivative measures     │
  │  · Find derivatives using standard rules     │
  │  · Solve basic optimization problems         │
  │  · Understand what integration means         │
  │                                              │
  │  ────────────────────────────────────────    │
  │                                              │
  │  Already in your Vault:                      │
  │  ✓ Limits — Solid                            │
  │  ✓ Continuity — Developing                   │
  │  Serify will skip these or go deeper.        │
  │                                              │
  │  ────────────────────────────────────────    │
  │                                              │
  │  Spark cost:                                 │
  │  ⚡ ~8 Sparks per concept                   │
  │  ⚡ ~96 Sparks for full curriculum           │
  │  (Pro+ users: Flow Mode is unlimited)        │
  │                                              │
  └──────────────────────────────────────────────┘

  [Start from concept 3 →]    [Edit curriculum]
```

**"Already in your Vault" section:**
Only shows if the user has prior mastery on any curriculum concepts. Shows up to 3 matching concepts with their current mastery state. Below them: *"Serify will skip these or go deeper based on your current mastery."* This tells the user Serify is aware of what they already know and won't repeat it unnecessarily.

**Spark cost:**
Shows estimated cost per concept and total curriculum cost. For Pro+ users, replace this with: *"Flow Mode is included with your Pro+ plan."* Never show cost information that doesn't apply to the user's plan.

**"Edit curriculum" button:**
Opens a sidebar panel where the user can:
- Remove concepts they already know well
- Add concepts they specifically want included
- Reorder concepts (drag and drop)
- Split the curriculum into a shorter version

Editing is optional. Most users will not use it. It exists for power users and educators who want precise control.

---

## Curriculum Editing Panel

Slides in from the right over the curriculum screen. Not a new page.

```
  Edit Your Curriculum                    [Done]

  Drag to reorder. Click × to remove.

  ≡  1  Limits
  ≡  2  Continuity
  ≡  3  The Derivative (concept)
  ≡  × 4  Differentiation rules
  ≡  5  Finding extrema
  ...

  + Add a concept
  ┌─────────────────────────────┐
  │ Type concept name...    Add │
  └─────────────────────────────┘

  [Reset to original]     [Done →]
```

Adding a concept calls Flash model to insert it in the right position in the curriculum order. Removing a concept checks if it's a prerequisite for remaining concepts — if it is, show a warning: *"Differentiation rules is needed for Finding extrema. Remove anyway?"*

Changes save to the curriculum record. The curriculum is versioned — the original AI-generated version is always recoverable via Reset.

---

## Starting The Curriculum

Clicking "Start from the beginning →" or any concept's start button navigates to `/learn/curriculum/:id/flow` and launches Flow Mode with the curriculum as context.

**What Flow Mode receives as context for a curriculum session:**

```typescript
interface CurriculumFlowContext {
  curriculumId: string;
  curriculumTitle: string;
  allConcepts: CurriculumConcept[]; // full ordered list
  currentConceptIndex: number;      // where to start
  completedConceptIds: string[];    // already finished in prior sessions
  userVaultContext: {               // what they already know
    strongConcepts: string[];
    weakConcepts: string[];
  };
  learnerProfile: SessionLearnerProfile;
}
```

Flow Mode uses this context to:
- Skip or accelerate through concepts the user already knows well (Vault shows Solid)
- Add depth on concepts the user has been shaky on before
- Reference earlier curriculum concepts in explanations ("remember when we covered limits...")
- Know what's coming next so explanations can foreshadow upcoming concepts

---

## Curriculum Progress Tracking

Progress is tracked per curriculum, per concept, across all sessions. A user can close their browser mid-curriculum and pick up exactly where they left off — on the same concept, at the same step within that concept.

### Progress States Per Concept

| State | Meaning | Visual |
|---|---|---|
| Not started | Never touched | Grey dot |
| In progress | Started but not confirmed | Pulsing blue dot |
| Completed | Mastery confirm passed | Green dot |
| Skipped | User skipped or Vault showed Solid | Grey dot with checkmark |
| Needs revisit | Completed but subsequent session showed regression | Amber dot |

### Curriculum Progress Bar

At the top of the curriculum screen and at the top of Flow Mode sessions for this curriculum:

```
  Calculus — Foundations
  ████████░░░░░░░░░░░░  3 of 12 concepts complete
```

---

## Resume Behavior

When a user returns to a curriculum they haven't finished:

On the dashboard, the primary action card shows:

```
  ↩  Resume your curriculum
     Calculus — Foundations
     3 of 12 concepts complete · Last studied 2 days ago
     Next: The Derivative (concept)

  [Resume →]          [View curriculum]
```

On the curriculum screen (`/learn/curriculum/:id`), the start button changes:

```
  [Resume — The Derivative →]
```

The in-progress concept has a pulsing dot and "Resume here" label.

---

## Curriculum Generation — AI Prompt

Called once when the user submits their Learn Mode input. Uses Pro model.

```typescript
const curriculumGenerationPrompt = `
You are Serify's curriculum architect. A user wants to learn something.
Your job is to build a complete, ordered curriculum that will take them
from their current understanding to genuine mastery of their goal.

USER INPUT: "${userInput}"
INPUT TYPE: "${inputType}" // 'concept' | 'topic' | 'goal' | 'question'

USER'S CURRENT KNOWLEDGE (from Concept Vault):
Strong concepts: ${strongConcepts.map(c => c.name).join(', ') || 'none yet'}
Shaky concepts: ${shakyConcepts.map(c => c.name).join(', ') || 'none'}
Revisit concepts: ${revisitConcepts.map(c => c.name).join(', ') || 'none'}
User type: ${userType || 'not specified'}
Learning context: ${learningContext || 'not specified'}

Generate a complete curriculum as JSON:
{
  "title": string,
  // Clean, descriptive title e.g. "Calculus — Foundations" or "How Neural Networks Learn"
  
  "targetDescription": string,
  // One sentence: what will the user understand after completing this curriculum?
  
  "outcomes": string[],
  // 3-5 specific things the user will be able to do or understand
  // Concrete and testable, not generic
  
  "units": [
    {
      "unitNumber": number,
      "unitTitle": string,
      "unitSummary": string, // one sentence describing the unit's focus
      "concepts": [
        {
          "id": string, // generate a stable UUID-style id
          "name": string,
          "definition": string, // one clear sentence
          "difficulty": "simple" | "moderate" | "complex",
          "estimatedMinutes": number, // realistic Flow Mode time
          "isPrerequisite": boolean,
          // true if this concept is required before others can be understood
          "prerequisiteFor": string[], // concept ids this unlocks
          "alreadyInVault": boolean,
          // true if this concept matches something in user's strong concepts
          "vaultMasteryState": string | null,
          // current mastery if alreadyInVault, null otherwise
          "whyIncluded": string,
          // one sentence explaining why this concept is in the curriculum
          // shown as tooltip on the curriculum screen
          "misconceptionRisk": "low" | "medium" | "high",
          // how likely is this concept to produce misconceptions?
          "orderIndex": number // global order across all units
        }
      ]
    }
  ],
  
  "recommendedStartIndex": number,
  // 0-based index of the concept to start at, accounting for vault knowledge
  // If user already knows concepts 0 and 1 well, this should be 2
  
  "scopeNote": string | null
  // If the input was very broad (e.g. "all of math"), include a note explaining
  // what scope was chosen and why. Null for appropriately scoped inputs.
}

CURRICULUM DESIGN RULES:
- Order concepts from foundational to advanced — never introduce a concept
  before its prerequisites
- For a single concept input: include the concept + 2-4 prerequisites if needed
  + 1-2 natural extensions. Total: 3-7 concepts. One unit, no grouping needed.
- For a broad topic: break into 3-5 units of 3-5 concepts each. Total: 10-20 concepts.
- For a goal: include exactly the concepts needed to achieve that goal.
  No extras. No tangents. Be surgical.
- For a question: treat the answer as the goal. Build the minimum curriculum
  that gives the user the conceptual foundation to genuinely understand the answer.
- Never include a concept the user already has Solid mastery on UNLESS it's a
  direct prerequisite that needs reinforcement before continuing.
- estimatedMinutes should reflect Flow Mode pacing: simple concepts 5-8 min,
  moderate 8-15 min, complex 12-20 min.
- misconceptionRisk should be high for concepts that are commonly misunderstood
  or that build on misconception-prone prerequisites.

SCOPING RULES:
- Input "derivatives" → 5-7 concepts (concept + prerequisites + extensions)
- Input "calculus" → 12-18 concepts (full foundations curriculum)
- Input "understand how neural networks learn" → 8-12 concepts (targeted)
- Input "why does compounding interest matter?" → 4-6 concepts (minimum to answer)
- If the scope would exceed 20 concepts, split into Part 1 and Part 2 and
  note this in scopeNote. Never generate more than 20 concepts in one curriculum.

Return only valid JSON. No preamble.
`;
```

---

## Concept Skip Logic

When Flow Mode encounters a curriculum concept that the user's Vault shows as Solid, it does not skip entirely — it runs an accelerated version:

**Accelerated path for Vault-Solid concepts:**
1. Skip Orient entirely
2. Skip Build layers 1 and 2
3. Run one Mechanism check immediately
4. If strong → mark complete, move on (saves ~6 minutes)
5. If weak → run full teaching arc (the Vault was wrong, reteach properly)

This respects the user's time without assuming the Vault is infallible. The Vault shows what was known at last session — it's possible understanding has degraded.

**Accelerated path for Vault-Developing concepts:**
1. Skip Orient
2. Run one Recall check first
3. If strong → run from Layer 2 (mechanism) forward — skip Layer 1
4. If weak → run full arc from the beginning

---

## Learn Mode in the Concept Vault

Every concept the user learns through Learn Mode appears in the Concept Vault with a source tag:

```
⬤  The Derivative          Solid
   Machine Learning · Learned via curriculum · 3 sessions
```

The "Learned via curriculum" tag distinguishes it from concepts extracted from analyzed content. This matters for the synthesis — concepts learned from scratch through Flow Mode have a different learning history than concepts encountered in analyzed content.

Clicking the concept in the Vault shows which curriculum it came from in the session history section:

```
  Jan 15  [Curriculum]  Calculus — Foundations    Solid
  Jan 12  [Curriculum]  Calculus — Foundations    Developing
```

---

## Curriculum Library

Over time, a user may have multiple curricula — some active, some completed, some abandoned. The curriculum library lives at `/learn` (the standalone Learn Mode page).

```
  ✦ Learn Mode

  [What do you want to learn?  _______________]  [Build Curriculum →]

  ──────────────────────────────────────────────

  Your Curricula

  ┌──────────────────────────────────────────────┐
  │  Calculus — Foundations          In Progress │
  │  3 of 12 concepts · Last studied 2 days ago  │
  │  [Resume →]                                  │
  └──────────────────────────────────────────────┘

  ┌──────────────────────────────────────────────┐
  │  How Neural Networks Learn        Complete ✓ │
  │  8 of 8 concepts · Finished Jan 10           │
  │  [Review →]                                  │
  └──────────────────────────────────────────────┘

  ┌──────────────────────────────────────────────┐
  │  React Fundamentals               Abandoned  │
  │  1 of 10 concepts · Started Dec 3            │
  │  [Resume →]  [Delete]                        │
  └──────────────────────────────────────────────┘
```

Completed curricula show a Review option — not Resume. Review re-runs a lighter version of the curriculum covering only concepts that have regressed since completion (Vault mastery dropped from Solid to Developing or below).

Abandoned curricula (no activity for 30 days) are shown with lower visual weight. They can be resumed or deleted. Never auto-deleted.

---

## Curriculum Completion

When the last concept in a curriculum reaches Confirm, Flow Mode shows a completion screen before the normal end-of-session summary:

```
  ✦ Curriculum Complete

  Calculus — Foundations
  All 12 concepts covered.

  ────────────────────────────────────────

  Your mastery:
  ⬤ Solid         7 concepts
  ⬤ Developing    4 concepts
  ⬤ Needs revisit 1 concept

  ────────────────────────────────────────

  What you can do now:
  ✓ Understand what a derivative measures
  ✓ Find derivatives using standard rules
  ✓ Solve basic optimization problems
  ✗ Understand what integration means
    (1 concept needs more work)

  ────────────────────────────────────────

  ⚡ Sparks spent this curriculum: 87

  [Go to Concept Vault]    [Continue to Calculus II →]
```

The outcomes checklist shows which stated outcomes were achieved (based on mastery signals from the curriculum concepts). Unachieved outcomes show which concept still needs work.

"Continue to Calculus II →" — if the completed curriculum is a natural precursor to another topic, Serify suggests the next curriculum. This is generated by the same curriculum generation prompt with "what comes after Calculus — Foundations?" as the input. Only shown if the completed curriculum has a natural continuation.

---

## Spark Costs in Learn Mode

| Action | Spark Cost |
|---|---|
| Curriculum generation | 2 Sparks |
| Curriculum editing (concept add/reorder) | 0 Sparks |
| Flow Mode per concept (standard) | 8 Sparks |
| Flow Mode per concept (Pro+ — unlimited) | 0 Sparks |
| Accelerated concept (Vault-Solid) | 2 Sparks |
| Accelerated concept (Vault-Developing) | 4 Sparks |
| Curriculum review session (regressions only) | 2 Sparks per regressed concept |

**Pre-start cost summary:**
Before the user starts their curriculum, the right column shows:
- Cost if starting from concept 1: full cost
- Cost if starting from Serify's recommended point: adjusted cost (skips known concepts)
- Pro+ users see: "Flow Mode included — no Spark cost per concept"

---

## Database Schema

```sql
-- Curricula
CREATE TABLE curricula (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  
  -- Identity
  title VARCHAR(255) NOT NULL,
  user_input TEXT NOT NULL, -- original text the user typed
  input_type VARCHAR(20), -- 'concept' | 'topic' | 'goal' | 'question'
  target_description TEXT,
  outcomes JSONB, -- string[]
  scope_note TEXT,
  
  -- Content
  units JSONB NOT NULL,
  -- Full unit and concept structure as generated
  concept_count INTEGER,
  estimated_minutes INTEGER,
  
  -- Version tracking
  original_units JSONB NOT NULL, -- preserved original AI generation
  edit_count INTEGER DEFAULT 0,
  
  -- Progress
  status VARCHAR(20) DEFAULT 'active',
  -- 'active' | 'completed' | 'abandoned'
  recommended_start_index INTEGER DEFAULT 0,
  current_concept_index INTEGER DEFAULT 0,
  completed_concept_ids UUID[] DEFAULT '{}',
  skipped_concept_ids UUID[] DEFAULT '{}',
  
  -- Timing
  started_at TIMESTAMP,
  last_activity_at TIMESTAMP,
  completed_at TIMESTAMP,
  total_sparks_spent INTEGER DEFAULT 0,
  
  created_at TIMESTAMP
);

-- Per-concept progress within a curriculum
CREATE TABLE curriculum_concept_progress (
  id UUID PRIMARY KEY,
  curriculum_id UUID REFERENCES curricula(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  concept_id UUID, -- references the id generated in curriculum JSON
  concept_name VARCHAR(255),
  
  status VARCHAR(20) DEFAULT 'not_started',
  -- 'not_started' | 'in_progress' | 'completed' | 'skipped' | 'needs_revisit'
  
  path_taken VARCHAR(20),
  -- 'full' | 'accelerated_solid' | 'accelerated_developing'
  
  flow_session_id UUID REFERENCES flow_sessions(id),
  -- the Flow Mode session where this concept was taught
  
  mastery_at_completion VARCHAR(20),
  sparks_spent INTEGER DEFAULT 0,
  
  started_at TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE INDEX idx_curricula_user ON curricula(user_id);
CREATE INDEX idx_curricula_status ON curricula(user_id, status);
CREATE INDEX idx_curriculum_concept_progress_curriculum 
  ON curriculum_concept_progress(curriculum_id);
```

---

## How Learn Mode Changes The Dashboard

The dashboard Quick Start card gets a second tab:

```
[Analyze]  [Learn]
```

The active tab is remembered between sessions — if the user last used Learn Mode, the dashboard opens on the Learn tab.

When a user has an active in-progress curriculum, the dashboard primary action card (the most prominent element on the page) surfaces it:

```
  ↩  Resume your curriculum
     Calculus — Foundations
     3 of 12 concepts · Next: The Derivative
     [Resume →]    [View full curriculum]
```

This replaces the "session with unresolved gaps" card if both exist — the curriculum takes priority because it represents an explicit learning commitment the user made.

---

## Analytics Events

```typescript
'learn_mode_input_submitted'      // user clicked Build Curriculum
'learn_mode_input_type'           // which input type was detected
'curriculum_generated'            // curriculum generation completed
'curriculum_viewed'               // user landed on curriculum screen
'curriculum_edited'               // user opened edit panel
'curriculum_concept_removed'      // user removed a concept
'curriculum_concept_added'        // user added a concept
'curriculum_started'              // user clicked Start
'curriculum_resumed'              // user resumed an existing curriculum
'curriculum_concept_completed'    // single concept finished
'curriculum_concept_skipped'      // concept skipped (accelerated or manual)
'curriculum_completed'            // all concepts complete
'curriculum_abandoned'            // no activity for 30 days
'curriculum_continue_suggested'   // next curriculum suggested at completion
'curriculum_continue_accepted'    // user started the suggested next curriculum
```

**Most important metric:** `curriculum_started` → `curriculum_completed` rate. This is your Learn Mode retention signal. Target above 35% — curricula are long commitments, 35% completion is healthy. Below 20% means either the curricula are too long, Flow Mode isn't engaging enough, or the concepts are too hard too fast.

---

## Launch Checklist — Learn Mode

**Input and Curriculum Generation**
- [ ] Learn tab appears on dashboard Quick Start card
- [ ] All four input types accepted and correctly classified
- [ ] Gap suggestions populate from Concept Vault (Shaky + Revisit)
- [ ] First-time users see topic suggestions based on learning_context
- [ ] Curriculum generation prompt returns valid JSON for all input types
- [ ] Scope rules enforced — single concept generates 3-7 concepts, broad topic 12-18
- [ ] Loading state shows during generation (3-6 seconds)

**Curriculum Screen**
- [ ] Units and concepts render in correct order
- [ ] Concept dots show correct Vault mastery state for known concepts
- [ ] "Already in your Vault" section shows matching concepts correctly
- [ ] Recommended start index calculated correctly from Vault data
- [ ] Estimated time shown per concept and total
- [ ] Spark cost shown correctly (hidden for Pro+ Flow Mode)
- [ ] "What you'll learn" outcomes render from AI generation
- [ ] Scope note renders when AI determines input was very broad

**Curriculum Editing**
- [ ] Edit panel opens and closes correctly
- [ ] Concept removal works with prerequisite warning
- [ ] Concept addition calls Flash model to insert in correct position
- [ ] Drag to reorder works
- [ ] Reset to original restores AI-generated version
- [ ] All edits save to curriculum record correctly

**Flow Mode Integration**
- [ ] Starting curriculum navigates to /learn/curriculum/:id/flow
- [ ] Flow Mode receives full CurriculumFlowContext correctly
- [ ] Vault-Solid concepts run accelerated path (skip Orient + Build 1-2)
- [ ] Vault-Developing concepts run accelerated path (skip Build 1 only)
- [ ] Flow Mode references earlier curriculum concepts in explanations
- [ ] Curriculum progress bar shows at top of Flow Mode session
- [ ] Concept completion writes to curriculum_concept_progress correctly

**Progress and Resume**
- [ ] Progress persists across browser close and return
- [ ] Dashboard resume card shows for in-progress curricula
- [ ] Resume card takes priority over gap resolution card
- [ ] Curriculum screen shows correct in-progress state on return
- [ ] "Resume here" marker shows on current concept

**Completion**
- [ ] Curriculum completion screen shows after last concept confirmed
- [ ] Outcomes checklist correctly marks achieved vs unachieved
- [ ] Next curriculum suggestion generates for natural continuations
- [ ] Completed curricula show Review option (not Resume)
- [ ] Review session covers only regressed concepts

**Concept Vault Integration**
- [ ] All concepts learned via Learn Mode appear in Concept Vault
- [ ] "Learned via curriculum" source tag shows correctly
- [ ] Session history in Vault shows curriculum source rows
- [ ] Mastery signals from all curriculum Flow Mode sessions write correctly

**Curriculum Library**
- [ ] /learn shows all user curricula with correct status
- [ ] In-progress, complete, and abandoned states render correctly
- [ ] Abandoned curricula flagged after 30 days inactivity
- [ ] Delete curriculum works with confirmation
- [ ] Standalone /learn entry point accessible from sidebar

**Spark Costs**
- [ ] Curriculum generation costs 2 Sparks
- [ ] Accelerated concepts cost 2 or 4 Sparks correctly
- [ ] Pro+ users see "Flow Mode included" instead of Spark cost
- [ ] Sparks deducted correctly and tracked in curriculum total_sparks_spent
