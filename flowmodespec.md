# Serify — Flow Mode Implementation Spec
> Feed this to the agent alongside all other Serify spec files. Flow Mode is a new top-level learning mode — a dynamic, AI-coached learning session that adapts in real time to what the user needs.

---

## Overview

Flow Mode is a guided, adaptive learning session run entirely by the AI. The user tells Serify what they want to learn — either implicitly (gaps from a session) or explicitly (anything they type) — and the AI builds and executes a learning path on the fly, mixing teaching, questioning, reinforcement, and checking in whatever sequence and combination it decides is right for this concept and this learner.

The user never sees a menu of modes. They never choose between flashcards or Feynman. The AI makes those decisions, moment to moment, based on how the user is responding. The experience is a single scrolling flow — one step at a time, each step appearing after the previous one completes.

It is fully resumable. A user can stop mid-session, close the browser, and pick up exactly where they left off the next day. Progress on each concept is tracked and Serify never repeats ground that has already been covered well.

---

## What Makes This Different From the AI Tutor

The AI Tutor is reactive — the user drives the conversation, asks questions, and the tutor responds. It's a dialogue.

Flow Mode is proactive — the AI drives the session, decides what to teach and how, and moves the user through a structured learning path. The user responds to what the AI presents, not the other way around.

| AI Tutor | Flow Mode |
|---|---|
| User-driven conversation | AI-driven learning path |
| User decides what to explore | AI decides what to teach next |
| Open-ended, no structure | Structured steps with clear progression |
| Good for going deep on one thing | Good for building understanding systematically |
| Reactive to user questions | Proactive — AI always knows the next move |
| No fixed progression | Clear arc: teach → check → reinforce → confirm |

Both are valid. They serve different moments. Flow Mode is for "teach me this." The Tutor is for "I have questions about this."

---

## Entry Points

### 1. From Session Feedback Report (Primary)

At the top of the learning area section on `/session/:id/feedback`, above the six individual mode cards:

```
┌──────────────────────────────────────────────────────────┐
│  ✦  Continue Your Learning                               │
│                                                          │
│  You have 3 gaps from this session. Serify can build     │
│  a learning path and walk you through them right now.    │
│  You decide when you're done.                            │
│                                                          │
│  Targeting: Positional Encoding, Attention Boundary      │
│  Conditions, Softmax Normalization                       │
│                                                          │
│  [Start Flow Mode →]            ⚡ Sparks as you go      │
└──────────────────────────────────────────────────────────┘
```

This card only shows if the session has 1 or more Shaky or Revisit concepts. If everything was Solid it is hidden.

If the user has a previous Flow Mode session on one of these concepts that was never completed, the card changes:

```
│  ↩  Resume where you left off?                          │
│  You were learning Positional Encoding on Jan 15.       │
│  [Resume →]  [Start Fresh →]                            │
```

### 2. From Concept Vault

On any concept detail panel, one of the quick-launch buttons:

```
[✦ Flow Mode]
```

Launches Flow Mode targeting that specific concept. Loads any existing progress for that concept first.

### 3. Standalone Entry Point (Sidebar)

A standalone `✦ Flow Mode` item in the sidebar nav. Opens a clean input screen:

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  What do you want to learn?                              │
│                                                          │
│  [Type a concept, topic, or paste anything...]           │
│                                                          │
│  Or pick from your gaps:                                 │
│  ⬤ Positional Encoding        Revisit                   │
│  ⬤ Attention Boundary         Shaky                     │
│  ⬤ Related Rates              Shaky                     │
│                                                          │
│  [Start →]                                               │
└──────────────────────────────────────────────────────────┘
```

The user can type anything — a concept name, a broad topic, a question, or even paste a paragraph they want to understand. This is the free-form entry point that makes Flow Mode work as a standalone learning tool, not just a post-session feature.

---

## Route

`/flow` — standalone entry
`/flow/:flowId` — active or resumed Flow Mode session

When launched from a feedback report or Concept Vault, navigate to `/flow/:flowId` directly after initializing the session.

---

## The Flow Session Interface

### Layout

Full-screen focused view. No sidebar. Minimal chrome.

**Top bar (slim, fixed):**
```
✦ Flow Mode    Positional Encoding          ⚡ 12 spent   [End Session]
```

Left: Flow Mode label + current concept being covered
Right: Running Spark count + End Session button

**Main area:** A single scrolling column, centered, max-width 680px. Steps appear one at a time, stacking downward as the session progresses. Older steps remain visible above — the user can scroll up to review anything they've seen. The active step is always at the bottom.

**Input area (fixed at bottom):** Changes format based on what type of response the current step requires — free text, single tap confirmation, or a specific structured response. Always clearly labeled with what the user needs to do.

---

## Step Types

Flow Mode has seven step types. The AI chooses which to use and when. The user never sees the step type label — they just see the content.

### 1. Teach

The AI explains a concept or sub-concept. Rendered as a clean text block. May include a simple analogy, a worked example, or a diagram description. No user response required — just a `Got it →` or `Read it again` button.

```
┌──────────────────────────────────────────────────────────┐
│  Positional encoding solves a fundamental problem with   │
│  transformers: the attention mechanism itself has no     │
│  notion of order. It treats "the cat sat on the mat"     │
│  identically to "the mat sat on the cat" unless you      │
│  explicitly tell it where each word appears.             │
│                                                          │
│  Positional encoding adds a unique vector to each        │
│  token's embedding — one that encodes its position in    │
│  the sequence. These vectors use sine and cosine         │
│  functions at different frequencies so that...           │
│                                                          │
│  [Got it →]    [Read it again]                           │
└──────────────────────────────────────────────────────────┘
```

`Read it again` regenerates the explanation with different language or a different angle. Costs 0 Sparks — uses the cached content just re-rendered. If the user clicks it twice, it costs 1 Spark to generate a genuinely new explanation.

### 2. Check Question

A retrieval or application question. Free-text answer. Same as main session questions but embedded in the flow. The AI evaluates the answer and decides what to do next based on quality — if the answer is strong, move forward; if weak, reteach before asking again.

```
┌──────────────────────────────────────────────────────────┐
│  ✦ Quick check                                           │
│                                                          │
│  Why does a transformer need positional encoding if it   │
│  already processes all tokens simultaneously?            │
│                                                          │
│  [Answer here...]                                        │
│                                                          │
│                                    [Submit →] ⚡ 1 Spark │
└──────────────────────────────────────────────────────────┘
```

After submission, immediate inline feedback appears (unlike the main session which waits until the end):

```
┌──────────────────────────────────────────────────────────┐
│  ✓ Strong answer                                         │
│  You captured the core issue — attention is              │
│  permutation-invariant. The one thing to add: positional │
│  encoding also enables the model to generalize to        │
│  sequence lengths it hasn't seen before.                 │
│                                                          │
│  [Continue →]                                            │
└──────────────────────────────────────────────────────────┘
```

Or if weak:

```
┌──────────────────────────────────────────────────────────┐
│  Not quite — let's look at this differently.             │
│  [Reteach step appears next automatically]               │
└──────────────────────────────────────────────────────────┘
```

### 3. Flashcard

A single flashcard embedded in the flow. Not a full deck — one card, targeted at a specific sub-concept the AI decided needs reinforcement.

```
┌──────────────────────────────────────────────────────────┐
│  🃏 Quick card                                           │
│                                                          │
│  What problem does positional encoding solve?            │
│                                                          │
│  [Show Answer]                                           │
└──────────────────────────────────────────────────────────┘
```

After showing: `Got it` or `Still shaky` — the response feeds into the mastery signal and the AI's path decision.

### 4. Feynman Prompt

The AI asks the user to explain a concept in plain language. Shorter and more targeted than the full Feynman mode — focused on one specific aspect.

```
┌──────────────────────────────────────────────────────────┐
│  🗣 Explain it                                           │
│                                                          │
│  Explain why attention is order-agnostic, as if you      │
│  were telling a friend who has never heard of            │
│  transformers.                                           │
│                                                          │
│  [Start writing...]                                      │
│                                                          │
│                                    [Submit →] ⚡ 1 Spark │
└──────────────────────────────────────────────────────────┘
```

Feedback is shorter than the full Feynman mode — one paragraph pointing to the strongest and weakest part of the explanation.

### 5. Misconception Correction

Used specifically when a known or detected misconception needs to be addressed head-on. The AI names the misconception, explains why it's wrong, and explains what's correct.

```
┌──────────────────────────────────────────────────────────┐
│  ⚠ Common misconception                                  │
│                                                          │
│  Your previous session suggested you may believe that    │
│  attention mechanisms are inherently position-aware.     │
│  They're not — here's the distinction that matters...    │
│                                                          │
│  [Got it →]    [I still don't follow]                    │
└──────────────────────────────────────────────────────────┘
```

`I still don't follow` triggers a Teach step with a different explanation of the same correction.

### 6. Concept Bridge

Used when the AI detects that understanding the current concept requires understanding a prerequisite the user may not have. Offers a choice.

```
┌──────────────────────────────────────────────────────────┐
│  Before this makes full sense, it helps to understand    │
│  how word embeddings work. Do you want a quick           │
│  explanation, or are you already comfortable with this?  │
│                                                          │
│  [Quick explanation please]   [I know embeddings, skip]  │
└──────────────────────────────────────────────────────────┘
```

Choosing the explanation branches into a mini teach-and-check on the prerequisite before returning to the original concept.

### 7. Mastery Confirm

Used at the end of a concept to confirm whether the user feels they've got it before moving on.

```
┌──────────────────────────────────────────────────────────┐
│  ✦ How are you feeling about positional encoding?        │
│                                                          │
│  [I've got it]   [Still a bit fuzzy]   [Need more work]  │
└──────────────────────────────────────────────────────────┘
```

- `I've got it` → records `solid` signal, moves to next concept or ends if done
- `Still a bit fuzzy` → runs one more Check Question then asks again
- `Need more work` → generates a new Teach step from a different angle + Check Question

This is self-reported but it's checked against the user's actual performance in the session. If they say "I've got it" but their Check Question answers were consistently weak, the AI notes the discrepancy and adds a note to the synthesis in the Concept Vault: "User reported confidence but answers suggest continued shakiness."

---

## The AI Planning Layer

This is the core of Flow Mode. Before the session starts and after every user response, the AI maintains a **learning plan** — a dynamic, continuously updated map of what to cover, what to skip, and what to do next.

### Initial Plan Generation

On session start, one Pro model call generates the initial plan:

```typescript
const systemPrompt = `
You are Serify's Flow Mode learning coach. Your job is to build and execute
a personalized learning path that takes this learner from their current
understanding to genuine mastery of the target concepts.

You have full context on this learner:

TARGET CONCEPTS (what to teach):
${targetConcepts.map(c => `
  - ${c.name}
    Current mastery: ${c.currentMastery}
    Definition: ${c.definition}
    Known gaps: ${c.persistentGap || 'none detected'}
    Known misconceptions: ${c.misconceptions?.join(', ') || 'none detected'}
    Sessions covered: ${c.sessionCount}
    Hint requested previously: ${c.hintRequestCount} times
`).join('\n')}

WHAT THIS LEARNER UNDERSTANDS WELL (use as bridges):
${strongConcepts.map(c => `- ${c.name}`).join('\n')}

LEARNER'S SESSION HISTORY SUMMARY:
${feedbackReport?.summary || 'No prior session context'}

Generate an initial learning plan as a JSON object:
{
  "concepts": [
    {
      "conceptId": string,
      "conceptName": string,
      "priority": number, // 1 = highest priority
      "estimatedSteps": number, // rough number of steps to cover this concept
      "suggestedOpeningMove": "teach" | "misconception_correction" | "check_question",
      // teach = start by explaining (use for Revisit concepts)
      // misconception_correction = address known wrong belief first
      // check_question = test what they already have (use for Shaky concepts)
      "prerequisiteCheck": string | null // concept to check/teach first if needed
    }
  ],
  "overallStrategy": string // brief note on the approach for this specific learner
}

Rules:
- Order concepts from most critical gap to least
- Misconception concepts always get misconception_correction as opening move
- Revisit concepts always start with teach
- Shaky concepts can start with check_question to see what's there first
- Never plan more than one concept at a time — only plan the next one after the current is complete
`;
```

### Step-by-Step Decision Making

After every user response, the AI decides the next step. This is a separate, lightweight call (Flash model) that takes the current state and returns the next step type and content:

```typescript
const nextStepPrompt = `
You are deciding the next step in a Flow Mode learning session.

Current concept: ${currentConcept.name}
Steps completed so far on this concept: ${completedSteps.length}
Last user response: "${lastUserResponse}"
Last step type: ${lastStepType}
Evaluation of last response: ${lastEvaluation}

Concept mastery signals so far this session:
${masterySignals.map(s => `- ${s.stepType}: ${s.signal}`).join('\n')}

Choose the next step. Return JSON:
{
  "nextStepType": "teach" | "check_question" | "flashcard" | "feynman" | 
                  "misconception_correction" | "concept_bridge" | "mastery_confirm" | "done",
  "reasoning": string, // brief internal note on why this step
  "content": { ... } // the actual step content to show the user
}

Decision rules:
- If last check_question was weak → use teach (different angle) before another question
- If user has answered 2 check_questions strongly → move toward mastery_confirm
- If user clicked "read it again" twice → try a different step type entirely
- If user said "I still don't follow" → try concept_bridge or flashcard approach
- If 3+ steps completed with consistently strong signals → mastery_confirm
- If 5+ steps completed with mixed signals → mastery_confirm with "still fuzzy" likely
- Never use the same step type 3 times in a row
- Use feynman only after at least one teach step has completed strongly
- Use done only when mastery_confirm returns "I've got it" AND performance supports it
`;
```

This lightweight decision call costs 0 Sparks to the user — it's internal routing logic, not content generation. Only content-generating steps (check questions, feynman, teach steps on "read again") cost Sparks.

---

## Redirecting Mid-Flow

At any point, the user can redirect the session. A small `Change topic` link sits in the top bar next to the current concept name.

Clicking it opens a minimal inline input:

```
┌──────────────────────────────────────────────────────────┐
│  What do you want to learn instead?                      │
│                                                          │
│  [Type a concept or topic...]        [Go →]  [Cancel]    │
└──────────────────────────────────────────────────────────┘
```

The user can type anything. Serify saves progress on the current concept, then starts a new concept thread in the same Flow session. The session timeline shows both concepts covered.

If the user redirects to something completely outside their session or Concept Vault, Serify handles it gracefully — it generates fresh content from scratch using the Pro model. There's no requirement to have prior session context to use Flow Mode.

---

## Resumability

Flow Mode sessions are fully persistent. Every step — the content shown, the user's response, the AI's evaluation, the mastery signals — is saved to the database in real time as it happens.

When a user returns to a Flow session, Serify:
1. Loads the full session state
2. Identifies where they stopped
3. Shows a brief resume card:

```
┌──────────────────────────────────────────────────────────┐
│  ↩ Resume Flow Mode                                      │
│                                                          │
│  You were learning Positional Encoding.                  │
│  You completed 4 steps. Last step: Check Question.       │
│                                                          │
│  [Resume →]    [Start this concept over]                 │
└──────────────────────────────────────────────────────────┘
```

On resume, the AI gets the full step history as context and continues from exactly where the session left off — including its internal assessment of the user's mastery so far.

If a concept was completed (mastery_confirm returned "I've got it") and the user resumes, the AI skips that concept and moves to the next one in the plan.

---

## Spark Costs in Flow Mode

Flow Mode uses a pay-as-you-go model. The user is never charged upfront for the whole session — only for each step that generates AI content.

| Step Type | Spark Cost | Notes |
|---|---|---|
| Initial plan generation | 1 Spark | One-time on session start |
| Teach step | 1 Spark | Per explanation generated |
| Teach step — "Read it again" (1st) | 0 Sparks | Rerenders existing content |
| Teach step — "Read it again" (2nd+) | 1 Spark | New angle generated |
| Check Question — generation | 0 Sparks | Bundled with teach step |
| Check Question — answer evaluation | 1 Spark | Pro model evaluation |
| Flashcard — generation | 0 Sparks | Bundled with teach step |
| Flashcard — Got It / Still Shaky | 0 Sparks | No AI call needed |
| Feynman prompt — evaluation | 1 Spark | Pro model |
| Misconception correction — generation | 1 Spark | Pro model |
| Concept bridge — prerequisite teach | 1 Spark | |
| Mastery confirm responses | 0 Sparks | No AI call |
| Step-by-step decision (routing) | 0 Sparks | Flash model, internal |
| Redirect to new concept | 1 Spark | New plan generation |

**Estimated cost for a typical concept (Shaky):**
- Initial plan: 1 Spark
- 1 Teach step: 1 Spark
- 1 Check question evaluation: 1 Spark
- 1 Flashcard: 0 Sparks
- 1 Check question evaluation: 1 Spark
- Mastery confirm: 0 Sparks
- **Total: ~4 Sparks per concept**

**Estimated cost for a harder concept (Revisit with misconception):**
- Initial plan: 1 Spark
- Misconception correction: 1 Spark
- 1 Teach: 1 Spark
- 2 Check question evaluations: 2 Sparks
- 1 Feynman evaluation: 1 Spark
- 1 Reteach (weak answer): 1 Spark
- Mastery confirm: 0 Sparks
- **Total: ~7 Sparks per concept**

The running Spark counter in the top bar keeps this transparent. Users always know what they're spending.

---

## Database Schema

```sql
-- Flow Mode sessions
CREATE TABLE flow_sessions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  
  -- Origin context
  source_type VARCHAR(20), -- 'session' | 'vault' | 'standalone'
  source_session_id UUID REFERENCES sessions(id), -- null if standalone
  source_concept_id UUID REFERENCES knowledge_nodes(id), -- null if from session
  
  -- Plan
  initial_plan JSONB NOT NULL,
  -- { concepts: [...], overallStrategy: string }
  
  current_concept_id UUID REFERENCES knowledge_nodes(id),
  concepts_completed UUID[], -- concept IDs that reached mastery_confirm "got it"
  concepts_in_progress UUID[], -- started but not completed
  
  -- State
  status VARCHAR(20) DEFAULT 'active',
  -- 'active' | 'paused' | 'completed' | 'abandoned'
  
  -- Costs
  total_sparks_spent INTEGER DEFAULT 0,
  
  -- Timestamps
  started_at TIMESTAMP,
  last_activity_at TIMESTAMP,
  completed_at TIMESTAMP,
  
  created_at TIMESTAMP
);

-- Individual steps within a flow session
CREATE TABLE flow_steps (
  id UUID PRIMARY KEY,
  flow_session_id UUID REFERENCES flow_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  concept_id UUID REFERENCES knowledge_nodes(id),
  
  -- Step identity
  step_number INTEGER NOT NULL, -- sequential within the session
  step_type VARCHAR(30) NOT NULL,
  -- 'teach' | 'check_question' | 'flashcard' | 'feynman' | 
  -- 'misconception_correction' | 'concept_bridge' | 'mastery_confirm'
  
  -- Content
  content JSONB NOT NULL,
  -- Varies by step type:
  -- teach: { explanationText: string, angle: string }
  -- check_question: { questionText: string, questionType: string }
  -- flashcard: { front: string, back: string }
  -- feynman: { prompt: string }
  -- misconception_correction: { misconceptionText: string, correctionText: string }
  -- concept_bridge: { prerequisiteConcept: string, explanationText: string }
  -- mastery_confirm: { promptText: string }
  
  -- User response
  user_response TEXT, -- null until user responds
  response_type VARCHAR(20),
  -- 'text_answer' | 'got_it' | 'still_shaky' | 'read_again' |
  -- 'i_know_this' | 'solid' | 'fuzzy' | 'needs_work'
  responded_at TIMESTAMP,
  
  -- AI evaluation (for steps that have it)
  evaluation JSONB,
  -- { outcome: string, feedbackText: string, masterySignal: string }
  
  -- Routing
  ai_reasoning TEXT, -- internal note on why this step was chosen
  spark_cost INTEGER DEFAULT 0,
  
  created_at TIMESTAMP
);

CREATE INDEX idx_flow_steps_session ON flow_steps(flow_session_id);
CREATE INDEX idx_flow_steps_concept ON flow_steps(flow_session_id, concept_id);

-- Concept-level progress within a flow session
CREATE TABLE flow_concept_progress (
  id UUID PRIMARY KEY,
  flow_session_id UUID REFERENCES flow_sessions(id) ON DELETE CASCADE,
  concept_id UUID REFERENCES knowledge_nodes(id),
  user_id UUID REFERENCES users(id),
  
  status VARCHAR(20) DEFAULT 'not_started',
  -- 'not_started' | 'in_progress' | 'completed' | 'skipped'
  
  step_count INTEGER DEFAULT 0,
  strong_signals INTEGER DEFAULT 0,
  weak_signals INTEGER DEFAULT 0,
  redirected_away BOOLEAN DEFAULT FALSE,
  
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  
  final_mastery_report VARCHAR(20),
  -- what mastery_confirm returned: 'got_it' | 'fuzzy' | 'needs_work'
  
  self_reported_vs_actual VARCHAR(20)
  -- 'aligned' | 'overconfident' | 'underconfident'
  -- set when mastery_confirm response doesn't match actual performance
);
```

---

## Writes to the Concept Vault

Every mastery signal generated in Flow Mode writes to the Concept Vault in real time:

| Flow Event | Vault Write |
|---|---|
| Check question — strong answer | `developing` or `solid` signal |
| Check question — weak answer | `shaky` signal |
| Flashcard — Got It × 2 | `developing` signal |
| Flashcard — Still Shaky | `shaky` signal |
| Feynman — strong | `solid` signal |
| Feynman — developing | `developing` signal |
| Misconception correction — Got It | `developing` signal + misconception resolved flag |
| Mastery confirm — I've got it + strong performance | `solid` signal |
| Mastery confirm — Still fuzzy | `shaky` signal |
| Mastery confirm — overconfidence detected | `shaky` signal + note in synthesis |

Vault synthesis for touched concepts is invalidated after Flow Mode session ends, triggering regeneration on next panel open.

---

## End of Session

When the user clicks `End Session` or all planned concepts reach completion:

A clean summary screen replaces the flow:

```
┌──────────────────────────────────────────────────────────┐
│  ✦ Flow Mode Complete                                    │
│                                                          │
│  Concepts covered: 3                                     │
│  Total steps: 14                                         │
│  Sparks spent: ⚡ 11                                     │
│                                                          │
│  ⬤  Positional Encoding        → Solid                  │
│  ⬤  Attention Boundary         → Developing             │
│  ⬤  Softmax Normalization       → Solid                 │
│                                                          │
│  Concept Vault has been updated.                         │
│                                                          │
│  [Return to Session Report]    [Go to Concept Vault]     │
└──────────────────────────────────────────────────────────┘
```

If a concept's self-reported confidence didn't match actual performance:

```
│  ⚠ Note: You marked Attention Boundary as "got it" but  │
│  your answers suggest it's still developing. It's been  │
│  flagged in your Concept Vault for follow-up.           │
```

---

## Integration With "Continue Your Learning?" Card

On the feedback report, the Continue Your Learning card is always the first item in the learning area — above the six individual mode cards. It is the default recommendation.

The card logic:

```typescript
function shouldShowFlowModeCard(session: Session): boolean {
  const weakConcepts = session.conceptMap.concepts.filter(
    c => ['shaky', 'revisit'].includes(c.masteryState)
  );
  return weakConcepts.length > 0;
}

function getFlowModeCardState(session: Session, userId: string): CardState {
  const existingFlowSession = getActiveFlowSession(userId, session.id);
  
  if (existingFlowSession && existingFlowSession.status === 'active') {
    return 'resume'; // show resume card
  }
  
  return 'start'; // show start card
}
```

---

## Launch Checklist — Flow Mode

- [ ] `flow_sessions`, `flow_steps`, `flow_concept_progress` tables created
- [ ] All three entry points work: feedback report, Concept Vault panel, sidebar standalone
- [ ] Initial plan generation call works and returns valid JSON plan
- [ ] All 7 step types render correctly in the flow interface
- [ ] Step-by-step decision routing works after every user response
- [ ] Check question inline feedback renders immediately after submission
- [ ] Teach step "Read it again" works — free first time, 1 Spark second time
- [ ] Misconception correction step triggers correctly for known misconceptions
- [ ] Concept bridge step offers prerequisite explanation correctly
- [ ] Mastery confirm step routes correctly for all three responses
- [ ] Overconfidence detection fires when self-report doesn't match performance
- [ ] Mid-session redirect works — saves current concept progress, starts new concept
- [ ] All steps saved to DB in real time (not batched)
- [ ] Session fully resumable — loads exact step where user stopped
- [ ] Resume card shows on feedback report when prior flow session exists
- [ ] Running Spark counter in top bar updates after each chargeable step
- [ ] All mastery signals write to Concept Vault in real time
- [ ] Concept Vault synthesis invalidated at end of Flow session
- [ ] End session summary shows correct mastery transitions
- [ ] Overconfidence note shows in end summary when detected
- [ ] "Continue Your Learning?" card appears above learning mode grid on feedback report
- [ ] Card correctly switches between start and resume states
- [ ] Card hidden when all session concepts are Solid
- [ ] Standalone entry at `/flow` shows gap suggestions from Concept Vault
- [ ] Standalone entry accepts free-text input for any concept
- [ ] Flow Mode accessible from sidebar nav
- [ ] Pro model used for teach, evaluation, and misconception steps
- [ ] Flash model used for routing decisions only
- [ ] Session abandoned state saved correctly on browser close