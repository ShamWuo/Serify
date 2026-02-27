# Serify — Flow Mode Teaching Spec
> This document replaces and overrides the teaching behavior described in the original Flow Mode spec. Feed this alongside all other Serify spec files. This covers how Flow Mode teaches, how it paces itself, what it includes, and how it adapts to the individual learner.

---

## The Core Problem This Spec Fixes

The original Flow Mode had a fatal pacing flaw: it explained a concept once then immediately jumped to application problems. That is not how learning works. A student who just heard what a derivative is for the first time is not ready to solve derivative problems. They need to understand it, sit with it, see it from another angle, connect it to something they already know, and only then be asked to retrieve or apply it.

This spec defines exactly how Flow Mode teaches — the arc, the pacing rules, the adaptation logic, and the AI prompts that enforce all of it.

---

## The Teaching Arc

Every concept in Flow Mode follows this arc. The depth and speed through the arc adapts to the concept and the learner. The arc itself never changes.

```
ORIENT → BUILD → ANCHOR → CHECK → REINFORCE → CONFIRM
```

### Phase 1: Orient
*"What is this and why does it matter?"*

Before any explanation, Flow Mode orients the learner. One short paragraph that answers two questions: what is this thing, and why should the learner care about it right now. This is not the explanation — it is the frame that makes the explanation land.

Example for derivatives:
> *"A derivative tells you how fast something is changing at any given moment. Before we get into how to find one, it's worth knowing why this matters: derivatives are how we calculate velocity from position, how we find the peak of a curve, and how machine learning models learn. Understanding derivatives means understanding change itself."*

Duration: always exactly one short paragraph. Never skipped. Never combined with Build.

The user does not respond to Orient. It appears, they read it, they tap Continue.

---

### Phase 2: Build
*"Here is how it actually works."*

This is the main explanation. It is not a single block of text dumped all at once. It is delivered in layers — each layer building on the previous one.

**Layer structure:**

Layer 1 — The concept in plain language. No jargon. No formula yet. Just the idea.
Layer 2 — The mechanism. How it actually works. Formula or process introduced here if applicable.
Layer 3 — A worked example. Concrete, specific, walked through step by step.
Layer 4 — A connection to something the user already knows (pulled from their Concept Vault strong concepts).

**Critical rule:** Each layer is a separate step in the flow. The user reads Layer 1 and taps Continue before Layer 2 appears. They are never shown all four layers at once. This is not a wall of text. It is a conversation that moves at the user's pace.

**Depth scaling:**

This is where concept difficulty and learner ability determine how deep Build goes.

For a simple concept (e.g. a vocabulary term, a straightforward definition):
- Layer 1 + Layer 3 only. Skip Layer 2 and 4.
- Total: 2 steps before first check.

For a moderate concept (e.g. a process, a formula, a relationship between two ideas):
- All four layers.
- Total: 4 steps before first check.

For a complex concept (e.g. a multi-part mechanism, something with prerequisites, something the user has previously misconceived):
- All four layers, each expanded.
- Layer 2 may split into 2a (mechanism overview) and 2b (mechanism detail).
- Layer 3 includes two worked examples — one simple, one applied.
- Total: 5–6 steps before first check.

**Learner ability scaling:**

The AI infers learner ability from two sources:
1. Their Concept Vault mastery history — how quickly have they moved from Revisit to Solid on past concepts?
2. Their behavior in the current session — are they answering checks confidently and correctly, or struggling?

A learner who is consistently strong gets fewer Build layers before checks — they don't need as much scaffolding.
A learner who is struggling gets more Build layers, slower pacing, and more anchoring before checks.

This is not a static setting. It recalibrates after every check in the session.

---

### Phase 3: Anchor
*"Let's make sure this sticks before we test it."*

Anchoring happens between Build and the first Check. It is the step most AI tutors skip — and it is the step that prevents the "just explained it, now testing it" whiplash that made the original Flow Mode feel jarring.

Anchor has two forms depending on what the concept needs:

**Form A — Analogy anchor**
Used when the concept is abstract. The AI presents a real-world analogy that maps directly onto the concept's structure.
> *"Think of a derivative like a speedometer. Your car's position is the function. The speedometer reading — how fast your position is changing right now — is the derivative. The speedometer doesn't tell you where you are, only how fast you're moving."*

One analogy. Short. The user taps Got It or That doesn't help.
- Got It → move to Check
- That doesn't help → AI generates a different analogy using a different real-world domain

**Form B — Contrast anchor**
Used when the concept is commonly confused with something else. The AI draws a sharp distinction.
> *"A derivative is not the same as the slope of the whole function. It is the slope at one specific point. The function might curve in all directions — the derivative only tells you the slope right here, right now."*

Same two responses. Same branching.

**Which form to use:** The AI decides based on the concept's misconception profile from the Concept Vault. If a misconception is flagged, use Form B. If the concept is abstract without common confusion, use Form A. If both apply, use Form B first.

Anchor is never skipped for moderate or complex concepts. It may be skipped for simple concepts where the Build layer already served as its own anchor.

---

### Phase 4: Check
*"Can you show me what you just learned?"*

The first Check question appears only after Build and Anchor are complete. This is a hard rule — no check question appears before the learner has been taught and anchored.

**Check question types in Flow Mode:**

These are different from the main session question types. They are calibrated to what was just taught, not to the full content of an analyzed document.

**Recall check** — the most basic. Used after a simple concept or a first explanation of a complex concept.
> *"In your own words, what does a derivative measure?"*
This tests whether the Orient + Build + Anchor sequence worked. Not application. Not problem solving. Just: did the explanation land?

**Mechanism check** — used after Layer 2 (the mechanism layer) is complete.
> *"Walk me through what happens when you take the derivative of x². What are you actually doing?"*
This tests understanding of the process, not just the definition.

**Application check** — only used after the learner has passed a Recall check and a Mechanism check on this concept. Never used as a first check.
> *"A ball is thrown upward. Its height is described by h(t) = -5t² + 20t. What does h'(t) tell you, and what would h'(2) mean in plain English?"*
This is the derivative problem type. It only appears once the learner has demonstrated they understand what a derivative is and how it works.

**This is the fix for the original bug.** Application checks are locked behind prior checks. The AI cannot jump to a derivative problem without the learner first passing a definition check and a mechanism check.

---

### Phase 5: Reinforce
*"Let's go deeper or fix what broke."*

After every Check, the AI evaluates the answer and takes one of three paths:

**Path A — Strong answer:** Brief confirmation of what was right, one sentence adding depth or nuance they didn't mention, then advance to the next layer or to Confirm.
> *"Exactly right. The one thing to add: the derivative also tells you the direction of change — positive means increasing, negative means decreasing. That directional information matters as much as the magnitude."*

**Path B — Partial answer:** The AI identifies specifically what was correct and specifically what was missing, then presents a targeted micro-explanation of only the missing piece. Then asks a tighter version of the same check.
> *"You got the 'rate of change' part right. What's missing is the 'at a specific point' qualifier — derivatives aren't averages over an interval, they're instantaneous. Let me show you why that distinction matters..."*
Then one short layer (2–3 sentences) and the same check again, reworded.

**Path C — Weak answer:** The AI does not immediately reteach the whole concept. It first identifies where the understanding broke down — which layer specifically — and rebuilds only that layer from a different angle. This is surgical, not a full restart.
> *"Let's look at this from a different angle."*
Then Layer 2 from a different angle (different example, different framing), Anchor again, then Check again.

**Critical rule for Path C:** The AI never repeats the same explanation it already gave. If the first explanation used a velocity example, the second uses a revenue/cost example. If the first used algebraic notation, the second uses a graph description. Different angle every time. The AI tracks which angles have been used and never reuses them.

---

### Phase 6: Confirm
*"Do you have this?"*

After the learner has passed at least one Check with a strong or partial-but-recovered answer, the flow reaches Confirm.

This is not a self-report question like the original "How are you feeling?" It is a final Check question that is slightly harder than the previous ones — it combines recall and application in one question, or asks the learner to explain the concept's limitations or edge cases.

> *"One last one: a function is not differentiable everywhere. Can you think of a situation where you couldn't take a derivative, and why?"*

This question is designed so that a learner who genuinely understands the concept can answer it, but a learner who only surface-memorized the definition cannot. It is the real gate before the concept is marked as complete.

**After Confirm:**

Strong answer → concept marked Developing or Solid depending on session performance. Move to next concept or end session.

Weak answer → one targeted Reinforce step, then one more Confirm attempt with a different question. After two Confirm attempts, mark as Developing regardless and move on — Flow Mode never loops indefinitely on one concept.

---

## Pacing Rules

These rules are enforced by the AI at all times. They override any content decisions.

**Rule 1: Never test before teaching.**
No check question of any type appears before Orient, at least Layer 1 of Build, and Anchor (for moderate/complex concepts) are complete.

**Rule 2: Never repeat an explanation angle.**
If the AI has explained something and the learner didn't get it, the next explanation must use a fundamentally different approach — different domain, different framing, different entry point. The AI tracks all angles used for each concept.

**Rule 3: Application questions are gated.**
Application checks (problem-solving type questions) can only appear after the learner has passed at least one Recall check and one Mechanism check on this concept in this session. This is a hard gate enforced in code, not just in the prompt.

**Rule 4: Layers are always separate steps.**
Build layers are never combined into a single wall of text. Each layer is a discrete step the learner moves through at their own pace.

**Rule 5: Anchoring is never skipped for complex concepts.**
If a concept has a misconception flag in the Concept Vault, Anchor (Form B — contrast) is mandatory before the first check.

**Rule 6: The AI always knows what it just taught.**
Every prompt sent to the AI includes the full teaching history for the current concept — every layer shown, every anchor used, every check asked, every answer given. The AI never makes decisions without full context of what has already happened.

**Rule 7: Progression is earned, not assumed.**
The AI never moves to the next phase because it has been N steps. It moves because the learner demonstrated readiness. Time in the session does not advance the arc — demonstrated understanding does.

---

## Adaptive Difficulty

The AI maintains a running learner profile within the Flow Mode session. This is separate from the Concept Vault — it is session-scoped and updates after every check.

```typescript
interface SessionLearnerProfile {
  estimatedLevel: 'struggling' | 'average' | 'strong';
  checkHistory: {
    conceptId: string;
    checkType: string;
    outcome: 'strong' | 'partial' | 'weak';
    pathTaken: 'A' | 'B' | 'C';
  }[];
  anglesUsed: {
    conceptId: string;
    angles: string[];
  }[];
  averageChecksPerConcept: number;
  reinforcementsRequired: number;
}
```

**Level recalibration happens after every check:**

After 2 consecutive strong answers → bump level up if currently struggling or average.
After 2 consecutive weak answers → bump level down if currently average or strong.
After Path C Reinforce → flag concept as high-difficulty for this learner.

**What level affects:**

| Behavior | Struggling | Average | Strong |
|---|---|---|---|
| Build layers shown | All 4–6 | All 4 | 2–3 |
| Anchor | Always | Always | Only if misconception flagged |
| First check type | Recall only | Recall | Mechanism or Recall |
| Application check unlocks after | 2 passed checks | 1 passed check | Confirm stage |
| Explanation length | Longer, more examples | Standard | Concise |

---

## The AI Prompts

### Phase Orchestrator Prompt (Pro Model)
Called once at concept start. Sets the full teaching plan for this concept.

```typescript
const orchestratorPrompt = `
You are Serify's Flow Mode teaching engine. You are about to teach one concept
to a specific learner. Your job is to plan the full teaching arc for this concept
before delivering the first step.

CONCEPT TO TEACH:
Name: ${concept.name}
Definition: ${concept.definition}
Difficulty: ${concept.difficulty}
Known misconceptions for this learner: ${concept.misconceptions?.join(', ') || 'none'}
Previous sessions touching this concept: ${concept.sessionCount}
Current mastery state: ${concept.currentMastery}

LEARNER PROFILE:
Estimated level this session: ${learnerProfile.estimatedLevel}
Concepts already covered this session: ${completedConcepts.map(c => c.name).join(', ')}
What this learner understands well (use as bridges): ${strongConcepts.map(c => c.name).join(', ')}
Reinforcements required so far this session: ${learnerProfile.reinforcementsRequired}

TEACHING ARC TO FOLLOW:
Orient → Build (layered) → Anchor → Check → Reinforce (if needed) → Confirm

Generate a complete teaching plan as JSON:
{
  "orient": {
    "text": string
    // One paragraph: what is this, why does it matter RIGHT NOW
    // No jargon. No formulas. Just context and relevance.
  },
  "build": {
    "layers": [
      {
        "layerNumber": number,
        "layerType": "plain_language" | "mechanism" | "worked_example" | "connection",
        "text": string,
        "estimatedReadSeconds": number
      }
    ]
    // Scale layers to difficulty and learner level per the rules above
    // Simple concept: layers 1 + 3 only
    // Moderate concept: all 4 layers
    // Complex concept: all 4 layers, layer 2 may split into 2a and 2b,
    //                  layer 3 includes two worked examples
  },
  "anchor": {
    "form": "analogy" | "contrast" | "skip",
    "text": string,
    "alternativeText": string
    // Different domain/angle for if learner says the first doesn't help
  },
  "checks": [
    {
      "checkType": "recall" | "mechanism" | "application",
      "questionText": string,
      "unlocksAfter": string[],
      // Which prior check types must be passed first
      // Application MUST have ["recall", "mechanism"] in unlocksAfter
      "strongAnswerIndicators": string[],
      "weakAnswerIndicators": string[]
    }
  ],
  "confirmQuestion": {
    "questionText": string,
    "whyThisIsHarder": string
    // Internal note on what makes this a real gate vs the check questions
  },
  "anglesAvailable": string[]
  // Distinct explanation angles available if reteaching is needed
  // Minimum 4 angles. Each must be genuinely different domain or framing.
}

RULES YOU MUST FOLLOW:
- Application check questions ONLY included if learner level is 'strong'
  OR unlocksAfter includes both 'recall' and 'mechanism'
- NEVER write an application check as the first or only check
- Build layers must genuinely build on each other — each adds something new
- Orient paragraph must not contain jargon from the mechanism layer
- Confirm question must be harder than any check question
- If a misconception is flagged, Anchor MUST use Form B targeting that misconception
- Connection layer (layer 4) must reference a concept from the learner's strong concepts list

Return only valid JSON. No preamble. No explanation.
`;
```

### Check Evaluator Prompt (Pro Model)
Called after every user answer.

```typescript
const checkEvaluatorPrompt = `
You are evaluating a learner's answer to a check question in a Flow Mode session.

CONCEPT: ${concept.name}
TEACHING HISTORY — everything shown to this learner on this concept so far:
${teachingHistory.map(step => `[${step.type}]: ${step.text}`).join('\n')}

CHECK QUESTION: "${checkQuestion.text}"
CHECK TYPE: ${checkQuestion.type}
STRONG ANSWER WOULD SHOW: ${checkQuestion.strongAnswerIndicators.join(', ')}
WEAK ANSWER TYPICALLY LOOKS LIKE: ${checkQuestion.weakAnswerIndicators.join(', ')}

LEARNER'S ANSWER: "${userAnswer}"

Evaluate this answer. Return JSON:
{
  "outcome": "strong" | "partial" | "weak",
  "path": "A" | "B" | "C",
  "whatWasCorrect": string,
  // Specific — references their actual words
  "whatWasMissing": string | null,
  // Specific — only if partial or weak. Never generic.
  "misconceptionDetected": boolean,
  "misconceptionDescription": string | null,
  "feedbackText": string,
  // Shown to the learner. 2-4 sentences.
  // Must reference what they actually wrote.
  // Never say "great job", "incorrect", "unfortunately", or "however"
  // Path A: confirm + add one nuance they missed
  // Path B: acknowledge what was right + explain exactly what was missing
  // Path C: do not label it as wrong — just transition naturally to new explanation
  "reinforcementNeeded": boolean,
  "reinforcementAngle": string | null,
  // Must be different from all angles already used:
  // ${learnerProfile.anglesUsed.find(a => a.conceptId === concept.id)?.angles.join(', ') || 'none used yet'}
  "masterySignal": "solid" | "developing" | "shaky" | "revisit",
  "levelAdjustment": "up" | "down" | "none"
}

CRITICAL RULES:
- A weak answer on an application check does not mean they don't understand the concept
  It means they need application practice. masterySignal should be 'developing' not 'revisit'
  unless their recall and mechanism answers were also weak.
- feedbackText for Path C must NOT make the learner feel they failed.
  It should feel like a natural continuation, not a correction.
- Always evaluate against what was actually taught. If the teaching history
  did not cover something, do not penalize the learner for not knowing it.
`;
```

### Reinforce Content Prompt (Pro Model)
Called when Path B or C is taken.

```typescript
const reinforcePrompt = `
A learner needs a targeted re-explanation of one specific aspect of a concept.
They did not respond well to the original explanation.

CONCEPT: ${concept.name}
ORIGINAL EXPLANATION ANGLE USED: ${originalAngle}
ALL ANGLES ALREADY USED: ${anglesUsed.join(', ')}
WHAT SPECIFICALLY THEY ARE MISSING: "${whatWasMissing}"
MISCONCEPTION DETECTED: ${misconceptionDetected ? misconceptionDescription : 'none'}

Generate a re-explanation that:
1. Uses a completely different angle from any already used
2. Targets ONLY what was missing — does not re-explain what they already got right
3. Is shorter than the original explanation — 3-5 sentences maximum
4. If a misconception was detected, names and corrects it directly without being condescending
5. Ends with a natural bridge to the check question they will be asked again

Available unused angles:
${concept.anglesAvailable.filter(a => !anglesUsed.includes(a)).join(', ')}

Return the re-explanation text only. No JSON. No preamble.
`;
```

---

## What The User Sees

The flow renders as a clean scrolling column. Each step appears below the previous one after the user taps Continue. Older steps remain visible so the user can scroll up and re-read anything.

**Visual treatment per step type:**

| Step Type | Visual Treatment |
|---|---|
| Orient | Plain text, larger font, generous top padding — feels like an opening |
| Build — plain language | Clean text block, no decoration |
| Build — mechanism | Clean text, monospace for any formula or code |
| Build — worked example | Numbered list if sequential, slightly indented |
| Build — connection | Soft green left border — signals "this connects to what you know" |
| Anchor — analogy | Italic, slightly muted — signals this is a frame, not core content |
| Anchor — contrast | Amber left border — signals "pay attention to this distinction" |
| Check question | Clean card, question in Instrument Serif, textarea below |
| Feedback Path A | Green tint background |
| Feedback Path B | Amber tint background |
| Feedback Path C | No tint — flows directly into new explanation without marking it as a failure |
| Confirm | Slightly elevated card, Instrument Serif — feels like a milestone |

**Path C visual rule:** Never show the learner they took Path C. The flow simply continues with a different explanation. No failure state. No apology. No "let's try again." Just more teaching.

---

## What Flow Mode Is Not

**Not a problem set.** Application checks exist but are one question to confirm understanding. Not a drill. Practice Quiz mode exists for drilling.

**Not a lecture.** Build layers are short. Nothing is a wall of text. The user taps Continue between every layer.

**Not a quiz.** Checks happen in the context of what was just taught. The learner always knows what domain they're in. No trick questions. No score. No pass or fail.

**Not repetitive.** The AI tracks every angle used and never repeats one. Three rounds of Reinforce all look and feel completely different.

**Not impatient.** The arc never skips phases. Progression is always earned through demonstrated understanding, never assumed.

---

## Launch Checklist — Flow Mode Teaching

- [ ] Orchestrator prompt generates complete teaching plan as valid JSON before first step
- [ ] Orient always appears as first step — never skipped
- [ ] Build layers always delivered one at a time — never combined into one block
- [ ] Layer count scales correctly to concept difficulty AND learner level
- [ ] Anchor step appears before first check on all moderate and complex concepts
- [ ] Anchor Form B triggers automatically when misconception is flagged in Concept Vault
- [ ] Application check questions gated in CODE behind passing recall + mechanism checks
- [ ] Gate is enforced server-side — application question cannot render until gate condition clears
- [ ] Check evaluator correctly identifies outcome and selects path A/B/C
- [ ] Path C reinforce uses a different angle from all previously used angles
- [ ] Angle tracking persists correctly across all reinforce steps for the same concept
- [ ] Learner level recalibrates after every check
- [ ] Level changes affect subsequent Build depth and check timing
- [ ] Confirm question is harder than all preceding check questions
- [ ] After 2 failed Confirm attempts concept marked Developing and session moves forward
- [ ] Path C never shows failure state — flows seamlessly
- [ ] Feedback text always references learner's actual words
- [ ] Full teaching history passed to every AI call for current concept
- [ ] Mastery signals from every check write to Concept Vault in real time
- [ ] Application check weak answer does not trigger revisit mastery signal if recall was strong
- [ ] Connection layer in Build references actual strong concepts from user's Concept Vault