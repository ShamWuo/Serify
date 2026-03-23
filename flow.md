# Serify — AI Assistant Usage System Spec
> This spec covers the message tier classification system, usage tracking, percentage display logic, and all related UI behavior for the AI assistant. Feed this alongside the Usage Limits & Billing spec.

---

## Overview

Every AI assistant message is classified into one of three tiers before it's processed. Tier determines the usage cost. The classification is invisible to the user — they see one number (a percentage of their monthly allowance used) and only when it's relevant.

The goal is a usage system that feels generous for real learners, protects against abuse, and never creates anxiety during a learning session.

---

## Message Tiers

### Tier 1 — Conversational
**Cost: 0 messages**

Simple questions that don't require meaningful AI generation. Answered with Flash model using minimal tokens. Never charged against the user's monthly allowance.

Examples:
- "What does Shaky mean?"
- "How do I start a session?"
- "Where is the Concept Vault?"
- "What's my current plan?"
- "How many sessions do I have left?"
- "What is Flow Mode?"

These are navigation, clarification, and UI help questions. The AI reads from static context, not the user's personal data or any content. Fast, cheap, never counted.

---

### Tier 2 — Standard
**Cost: 1 message**

Questions that require reading the user's Vault, session history, or generating a short contextual response. The majority of real assistant interactions land here.

Examples:
- "What should I study today?"
- "What are my biggest gaps?"
- "Summarize my last session"
- "Which concepts have I been struggling with?"
- "Show me what I've learned about machine learning"
- "How am I progressing on calculus?"
- "Start a flashcard session on my weak concepts"

These require Vault lookups, session data reads, or short AI responses grounded in the user's personal context.

---

### Tier 3 — Deep
**Cost: 3 messages**

Full concept explanations, content generation, teaching responses, or anything that triggers a substantial Pro model call. Used when the user wants Serify to actually teach them something or analyze something in depth.

Examples:
- "Explain transformer attention to me"
- "I don't understand backpropagation — walk me through it"
- "Break down this paragraph: [pasted text]"
- "Teach me the difference between supervised and unsupervised learning"
- "Generate flashcards for positional encoding"
- "Why does gradient descent work?"
- Any message over 100 words asking for explanation or analysis

These are the messages that do real work and cost real AI compute. Charging 3 messages reflects the actual cost differential.

---

## Classification System

Before every AI response, a Flash model classifier reads the user's message and returns the tier. The classification call itself is never counted toward usage.

### Classifier Prompt

```typescript
const classifyMessage = async (message: string): Promise<MessageTier> => {
  const prompt = `
You are classifying a user message sent to an AI learning assistant.
Classify into exactly one tier:

tier1 — Simple navigation, UI help, or clarification question.
  No personal data lookup needed. No real AI generation needed.
  Examples: "what does X mean", "how do I do Y", "where is Z"

tier2 — Standard question requiring personal context.
  Needs Vault lookup, session history, or short contextual response.
  Examples: "what should I study", "summarize my session", "show my gaps"

tier3 — Deep explanation, concept teaching, or content generation.
  Requires substantial AI generation. User wants to learn something or
  have something explained in depth. Usually contains "explain", "teach",
  "walk me through", "why does", "how does", or pasted content.

User message: "${message}"

Return only valid JSON: { "tier": "tier1" | "tier2" | "tier3" }
No preamble. No explanation.
  `;

  const result = await callFlashModel(prompt, { maxTokens: 20 });
  return JSON.parse(result).tier;
};
```

### Classification Edge Cases

**Message contains pasted content (over 200 characters of non-question text):**
Always Tier 3 regardless of the question asked. The user pasted something for analysis.

**Message is a follow-up in an existing Tier 3 conversation:**
If the previous message was Tier 3 and this is a short follow-up ("can you go deeper on that?" / "what about X?"), classify as Tier 2 not Tier 3. The context is already loaded — the marginal cost is lower.

**Ambiguous messages:**
When the classifier is unsure, default to Tier 2. Never default up to Tier 3.

**Pro+ users:**
Skip classification entirely. No tier check. No usage deduction. Process immediately.

---

## Usage Tracking

### Database

Add message tier tracking to the existing `usage_tracking` table:

```sql
ALTER TABLE usage_tracking
  ADD COLUMN ai_messages_used INTEGER DEFAULT 0,
  -- counts in standard message units (tier2 = 1, tier3 = 3, tier1 = 0)
  ADD COLUMN ai_messages_tier1_count INTEGER DEFAULT 0,
  -- raw count of tier1 messages (for analytics, not billing)
  ADD COLUMN ai_messages_tier2_count INTEGER DEFAULT 0,
  ADD COLUMN ai_messages_tier3_count INTEGER DEFAULT 0;
  -- raw counts for analytics
```

`ai_messages_used` is the number shown to users as a percentage. It counts in standard message units — a Tier 3 message adds 3 to this counter, a Tier 2 adds 1, a Tier 1 adds 0.

The raw tier counts are for your analytics only — understanding how users actually use the assistant.

### Monthly Limits

| Plan | Monthly Message Budget |
|---|---|
| Free | 20 standard messages |
| Pro | 300 standard messages |
| Pro+ | Unlimited (no tracking needed) |

### Deduction Logic

```typescript
async function processAssistantMessage(
  userId: string,
  message: string,
  plan: string
): Promise<{ allowed: boolean; tier: MessageTier; remaining: number | null }> {

  // Pro+ skips everything
  if (plan === 'proplus') {
    return { allowed: true, tier: 'tier1', remaining: null };
  }

  // Classify the message
  const tier = await classifyMessage(message);

  // Tier 1 is always free
  if (tier === 'tier1') {
    await incrementTierCount(userId, 'tier1');
    return { allowed: true, tier, remaining: null };
  }

  // Check current usage
  const usage = await getUsage(userId);
  const limit = getPlanLimit(plan, 'ai_messages');
  const cost = tier === 'tier3' ? 3 : 1;

  if (usage.ai_messages_used + cost > limit) {
    return { allowed: false, tier, remaining: 0 };
  }

  // Deduct usage
  await db.query(`
    UPDATE usage_tracking
    SET
      ai_messages_used = ai_messages_used + $1,
      ai_messages_${tier}_count = ai_messages_${tier}_count + 1,
      updated_at = NOW()
    WHERE user_id = $2
  `, [cost, userId]);

  const remaining = limit - (usage.ai_messages_used + cost);
  return { allowed: true, tier, remaining };
}
```

---

## Percentage Display

### Calculation

```typescript
function getUsagePercentage(used: number, limit: number): number {
  return Math.round((used / limit) * 100);
}
```

### Display Rules

**Under 70%:** Show nothing. No indicator anywhere. The user is learning, not managing limits.

**70–89%:** Show a subtle amber line in the chat interface below the input:

```
71% of AI messages used this month
```

Amber text (`#B8860B`). Small font (12px). No icon. No card. Just a line.

**90–99%:** Show burnt orange text with an upgrade link:

```
94% of AI messages used this month  ·  Upgrade for more →
```

**100%:** Input becomes disabled. Gate message replaces the chat input:

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│  You've used all your AI messages this month.        │
│                                                      │
│  Pro includes 300 messages/month.                    │
│  Pro+ is unlimited.                                  │
│                                                      │
│  [Upgrade to Pro →]    [Upgrade to Pro+ →]           │
│                                                      │
│  Resets on February 1                               │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### Where Percentages Are Shown

**In the chat interface:** Below the input, only when 70%+. Never inside the conversation.

**In Settings → Billing:** Always shown with a progress bar regardless of percentage. This is the one place users can always check their usage.

**In the header:** Never. The header stays clean.

---

## Tier 3 Pre-Send Warning

When the classifier determines a message is Tier 3, show a one-line warning below the input before the user sends:

```
This response uses 3 messages  ·  187 remaining
```

Muted text, 12px, appears as soon as the classifier returns Tier 3 (runs while the user is still composing, triggered after 500ms of typing pause if message looks like a deep question, confirmed on submit).

This warning:
- Is not a blocker — the user can still send
- Disappears after they send
- Never shows for Pro+ users
- Never shows for Tier 1 or Tier 2 messages
- Never shows when the user has plenty of messages remaining (over 50% left) — only shows when under 50% to avoid unnecessary anxiety

---

## Real-Time Classification UX

The classifier runs in the background while the user types. This gives the UI time to show the Tier 3 warning before they hit send rather than after.

Trigger classification after:
- 500ms typing pause
- Message length over 50 characters
- Message contains trigger words: "explain", "teach", "why", "how does", "walk me through", "what is", "break down"

If classification hasn't returned by the time the user hits send, process it then and show the warning inline if needed before the response loads.

---

## Settings Page — AI Messages Display

In the billing section of settings, show the breakdown clearly:

```
AI Assistant Messages         Resets Feb 1

  67 of 300 used  (22%)

  ████░░░░░░░░░░░░░░░░  22%

  Breakdown this month:
  Quick questions    143 exchanges   (free)
  Standard queries    52 messages
  Deep explanations    5 messages    (×3 each = 15)
  ─────────────────────────────────
  Total charged                      67 / 300
```

The breakdown shows users exactly how their messages were counted. Transparency here prevents confusion and support requests.

---

## Analytics Events

```typescript
'assistant_message_sent'           // any message sent
'assistant_message_tier'           // tier1 | tier2 | tier3
'assistant_usage_warning_shown'    // 70%+ warning displayed
'assistant_usage_critical_shown'   // 90%+ warning displayed
'assistant_limit_reached'          // 100% gate shown
'assistant_tier3_warning_shown'    // pre-send tier3 warning shown
'assistant_upgrade_clicked'        // upgrade CTA from gate clicked
```

The `assistant_message_tier` event is the most important for product decisions. Track the distribution of tier1/tier2/tier3 messages across plans. If tier3 is dominating on Free, your classifier may be too aggressive. If tier1 is dominating on Pro, users aren't getting value from the assistant.

---

## Launch Checklist — AI Usage System

**Classification**
- [ ] Flash model classifier prompt returns correct tier for all three categories
- [ ] Pasted content (200+ chars) always classified as Tier 3
- [ ] Follow-up messages in Tier 3 conversations classified as Tier 2
- [ ] Ambiguous messages default to Tier 2 not Tier 3
- [ ] Pro+ users skip classification entirely
- [ ] Classification runs in background while user types (500ms pause trigger)

**Usage Tracking**
- [ ] `ai_messages_used` counter increments correctly by tier cost
- [ ] Tier 1 never increments `ai_messages_used`
- [ ] Tier 2 increments by 1
- [ ] Tier 3 increments by 3
- [ ] Raw tier counts tracked separately for analytics
- [ ] Usage check runs before processing, not after
- [ ] Usage resets correctly on billing period renewal

**Percentage Display**
- [ ] No indicator shown under 70%
- [ ] Amber warning shown at 70-89%
- [ ] Burnt orange warning with upgrade link at 90-99%
- [ ] Input disabled and gate shown at 100%
- [ ] Gate shows correct reset date
- [ ] Gate shows upgrade options for correct plans
- [ ] Pro+ users see zero usage indicators anywhere

**Tier 3 Warning**
- [ ] Pre-send warning appears for Tier 3 messages
- [ ] Warning shows correct remaining message count
- [ ] Warning only shows when under 50% remaining
- [ ] Warning never shows for Pro+ users
- [ ] Warning never blocks sending — advisory only
- [ ] Warning disappears after message is sent

**Settings Page**
- [ ] Usage percentage and progress bar shown correctly
- [ ] Breakdown by tier shown (free / standard / deep)
- [ ] Progress bar color changes at 70% and 90%
- [ ] Reset date shown correctly

**Analytics**
- [ ] All 7 analytics events fire at correct moments
- [ ] Tier distribution trackable per plan in analytics dashboard