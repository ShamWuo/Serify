# Serify — Credits System Implementation Spec
> Feed this to the agent alongside all other Serify spec files. This replaces the session-limit and flat subscription gating described in the subscription spec.

---

## Overview

Serify uses a branded credit currency called **Sparks**. Every AI action in the app costs a certain number of Sparks. Users earn Sparks through their subscription (monthly refresh), by purchasing Top-Up packs, and through onboarding incentives.

The credit system sits on top of the existing tier structure. Free users get a small monthly Spark allowance. Pro users get a generous monthly allowance at a steep effective discount. Teams users get a per-seat allowance. Everyone can top up with purchased Sparks at any time.

---

## Credit Types

Three distinct credit pools exist for every user. They are spent in a specific draw-down order and have different expiration rules.

### 1. Subscription Sparks (Monthly Refresh)
- Granted automatically at the start of each billing period
- **Free tier:** 20 Sparks/month
- **Pro tier:** 150 Sparks/month
- **Teams tier:** 150 Sparks/seat/month
- **Expiration:** Expire at end of billing period with a 1-month rollover cap
- **Rollover rule:** Up to 2× the monthly allowance rolls over. A Pro user who uses 0 Sparks in January rolls 150 into February, giving them 300 total. Any amount above 300 at the rollover moment is forfeited.
- **Draw-down order:** Spent last (after Trial Sparks and Top-Up Sparks)

### 2. Top-Up Sparks (Prepaid Wallet)
- Purchased by the user through the Spark Shop
- **Expiration:** Never expires
- **Accounting note:** Carried as deferred revenue on balance sheet. Forfeited after 24 months and recognized as breakage revenue.
- **Draw-down order:** Spent second (after Trial Sparks)
- Never expire due to inactivity — the clock runs from purchase date regardless

### 3. Trial / Onboarding Sparks (Incentive)
- Granted on account creation, referral rewards, and promotional campaigns
- **New user grant:** 15 Sparks on signup
- **Referral reward:** 20 Sparks to referrer when referred user makes first purchase
- **Expiration:** 14 days from grant date
- **Draw-down order:** Spent first — always consumed before any other pool
- Cannot be purchased, only granted by Serify

---

## Draw-Down Order

When a user spends Sparks, the system always deducts in this order:

```
1. Trial Sparks (expires soonest — use first)
2. Top-Up Sparks (oldest purchase date first — FIFO)
3. Subscription Sparks (expires at end of billing period)
```

This order is never configurable by the user. It is enforced server-side on every transaction.

---

## Spark Pricing

### What the Subscription Gets You

| Tier | Monthly Sparks | Effective Cost Per Spark |
|---|---|---|
| Free | 20 Sparks | $0 (free) |
| Pro ($12/month) | 150 Sparks | $0.08/Spark |
| Pro Annual ($96/year) | 150 Sparks/month | $0.053/Spark |
| Teams ($18/seat/month) | 150 Sparks/seat | $0.12/Spark |

Pro annual is the best value in the entire system — cheaper per Spark than even the largest top-up pack. This should be surfaced explicitly in the pricing UI.

### Top-Up Shop Pricing

| Pack | Sparks | Price | Per Spark | Tag |
|---|---|---|---|---|
| Trial Spark Pack | 20 Sparks | $2.99 | $0.15 | Entry point |
| The Learner's Vault | 100 Sparks | $9.99 | $0.10 | Most Popular |
| The Mastery Crate | 300 Sparks | $24.99 | $0.08 | Best Value |

The Trial Spark Pack exists purely as a low-friction entry point for users who aren't ready to subscribe. Many will buy this once, see the value, and subscribe within 30 days. Track this conversion rate — it should be above 30%.

---

## Spark Costs Per Action

Every AI action has a Spark cost shown to the user before it is executed. No surprises.

### Session Actions

| Action | Spark Cost | Model Used | Notes |
|---|---|---|---|
| Content ingestion + concept map | 2 Sparks | Flash | Always required to start a session |
| Question generation | 1 Spark | Flash | Per session, not per question |
| Answer analysis | 1 Spark | Pro | Per answer submitted |
| Basic feedback report (Strength Map) | 1 Spark | Pro | Always generated at session end |
| Full feedback report upgrade | 2 Sparks | Pro | Cognitive Analysis + Misconceptions + Focus Suggestions |
| **Total: standard session (7 questions)** | **11 Sparks** | | Ingestion + questions + 7 answers + basic report |
| **Total: full session (7 questions)** | **13 Sparks** | | Above + full feedback report |

### Learning Area Actions

| Action | Spark Cost | Model Used | Notes |
|---|---|---|---|
| Flashcard deck generation | 1 Spark | Flash | Full deck, one-time cost |
| Explain It To Me (per concept) | 1 Spark | Pro | Charged as each concept is generated |
| Feynman Method submission | 2 Sparks | Pro | Includes evaluation and feedback |
| AI Tutor — session open | 1 Spark | Pro | One-time to open the session |
| AI Tutor — per message exchange | 1 Spark | Pro | Each user message + response |
| Practice Quiz generation | 1 Spark | Flash | Full quiz, one-time cost |
| Practice Quiz answer evaluation | 1 Spark | Pro | Per answer (same as main session) |
| Concept Deep Dive | 2 Sparks | Pro | Full lesson generation |
| Hint request | 1 Spark | Flash | Per hint, during a session |

### Other Actions

| Action | Spark Cost | Notes |
|---|---|---|
| Concept Vault topic synthesis | 1 Spark | Generated once per topic, cached after |
| Knowledge Report Card generation | 1 Spark | Shareable card |
| Weekly digest generation | 0 Sparks | Covered by subscription overhead |
| Spaced repetition session | Same as standard session | Uses existing question/answer flow |

### Free Actions (Always 0 Sparks)
- Viewing session history
- Viewing existing feedback reports
- Browsing the Concept Vault (reading existing entries)
- Account and settings management
- Viewing the pricing and shop pages

---

## Spark Balance Display

The user's Spark balance is always visible in the top-right corner of the app header — a small pill showing the total available Sparks with a lightning bolt icon (⚡).

```
⚡ 47 Sparks
```

Clicking it opens a Spark Balance drawer (slides in from the right) showing:

```
⚡ Your Sparks

Subscription Sparks    32   Resets Feb 1
Top-Up Sparks          15   Expires Dec 2026
Trial Sparks            0   —

Total Available        47

[Buy More Sparks →]
```

Each pool shown separately so users understand what they have and when it expires. If any pool has Sparks expiring within 7 days, show a warning indicator next to it.

---

## Pre-Action Cost Confirmation

Before any action that costs Sparks, show an inline cost indicator — never a modal, just a small line of text near the action button.

**Examples:**

On the Analyze button in the Quick Start card:
```
[Analyze →]   ⚡ 13 Sparks for a full session
```

On the Feynman Method card in the learning area:
```
[Start →]   ⚡ 2 Sparks
```

On the AI Tutor card:
```
[Start →]   ⚡ 1 Spark to open + 1 Spark per message
```

On each hint request button during a session:
```
[? Explain this]   ⚡ 1 Spark
```

The cost text is muted and small — present but not alarming. Users should feel informed, not nickel-and-dimed.

---

## Out of Sparks Behavior

**Soft stop** — the current session always completes. A user will never lose work mid-session due to running out of Sparks. The Spark check happens at the start of each action, not mid-action.

**Specific behavior by moment:**

If a user tries to start a new session with insufficient Sparks:
- The Analyze button is disabled
- Below it: *"You need 13 Sparks to start a full session. You have 4."*
- Two inline CTAs: `Buy Sparks →` and `Use Basic Mode (4 Sparks)` — basic mode skips the full feedback report and costs only 7 Sparks

If a user runs out mid-learning session (e.g. during AI Tutor):
- Current response completes
- After response: *"You're out of Sparks. Top up to continue."* with `Buy Sparks →` button inline in the chat
- Session is preserved — they can top up and continue immediately without losing context

If a free user tries to use a Pro-only feature with enough Sparks but wrong tier:
- Feature gate still applies — Sparks don't unlock tier-restricted features
- Show inline: *"This feature requires Pro. Upgrade to access it."*

**Basic Mode** is an important concept — when a user has some Sparks but not enough for a full session, offer a reduced-cost path:

```
┌─────────────────────────────────────────────────┐
│  You have 6 Sparks — not enough for a full      │
│  session (13 Sparks).                           │
│                                                 │
│  Start in Basic Mode for 6 Sparks:             │
│  ✓ Content ingestion + questions                │
│  ✓ Answer analysis                              │
│  ✓ Basic Strength Map                           │
│  ✗ Cognitive Analysis                           │
│  ✗ Misconception Report                         │
│  ✗ Focus Suggestions                            │
│                                                 │
│  [Start Basic Mode]   [Buy Sparks to go Full]   │
└─────────────────────────────────────────────────┘
```

After a Basic Mode session completes, always offer an upgrade: *"Unlock the full report for this session for 2 Sparks."* This is a smart upsell — the user is already invested in the session.

---

## The Spark Shop

### Route
`/sparks` or accessible via the Spark balance pill → `Buy More Sparks →`

### Layout

Clean centered page. Three pack cards in a row.

**Each card:**
```
┌──────────────────────────┐
│  [Pack Name]             │
│                          │
│  [⚡ XX Sparks]          │
│  (large, Instrument      │
│   Serif)                 │
│                          │
│  $X.XX                   │
│  $X.XX per Spark         │
│                          │
│  [Buy Now →]             │
└──────────────────────────┘
```

Middle card (The Learner's Vault) has a `Most Popular` badge and slightly elevated shadow.
Right card (The Mastery Crate) has a `Best Value` badge.

**Below the three packs:**

A comparison line showing Pro subscription value:
> *"Pro subscribers get 150 Sparks/month for just $0.08/Spark — the best rate available. [See Pro plans →]"*

This surfaces the subscription upsell naturally within the shop without being pushy.

**Subscription Sparks reminder** (for free users):
> *"On the free plan, you get 20 Sparks every month automatically. Upgrade to Pro for 150 Sparks/month."*

### Checkout

Top-up packs are one-time payments via Stripe. On click:

```typescript
// POST /api/sparks/checkout
async function createSparkCheckout(userId: string, packId: string) {
  const pack = SPARK_PACKS[packId];
  
  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode: 'payment',
    line_items: [{ price: pack.stripePriceId, quantity: 1 }],
    success_url: `${BASE_URL}/sparks?success=true&pack=${packId}`,
    cancel_url: `${BASE_URL}/sparks`,
    metadata: { userId, packId, sparkAmount: pack.sparks }
  });
  
  return { url: session.url };
}
```

On `checkout.session.completed` webhook: credit the user's Top-Up Spark pool with the purchased amount and set expiry to 24 months from now.

After successful purchase, redirect to `/sparks?success=true` — show a success banner: *"⚡ 100 Sparks added to your wallet. They expire December 2027."*

---

## Database Schema

```sql
-- Master credit ledger (every transaction recorded)
CREATE TABLE spark_transactions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  amount INTEGER NOT NULL, -- positive = credit, negative = debit
  pool VARCHAR(20) NOT NULL, -- 'subscription' | 'topup' | 'trial'
  transaction_type VARCHAR(30), 
  -- 'subscription_refresh' | 'topup_purchase' | 'trial_grant' 
  -- | 'action_debit' | 'referral_grant' | 'expiry_forfeiture'
  action VARCHAR(50), -- what was debited for (e.g. 'session_answer_analysis')
  reference_id UUID, -- session_id, learning_session_id, etc.
  stripe_payment_intent_id VARCHAR(255), -- for purchases
  balance_after INTEGER, -- total balance after this transaction
  created_at TIMESTAMP
);

-- Current balance per pool per user (materialized for fast reads)
CREATE TABLE spark_balances (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  subscription_sparks INTEGER DEFAULT 0,
  topup_sparks INTEGER DEFAULT 0,
  trial_sparks INTEGER DEFAULT 0,
  total_sparks INTEGER GENERATED ALWAYS AS 
    (subscription_sparks + topup_sparks + trial_sparks) STORED,
  updated_at TIMESTAMP
);

-- Top-up purchase records (for expiry tracking)
CREATE TABLE spark_purchases (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  pack_id VARCHAR(50), -- 'trial_pack' | 'learners_vault' | 'mastery_crate'
  sparks_granted INTEGER,
  sparks_remaining INTEGER,
  price_cents INTEGER,
  stripe_payment_intent_id VARCHAR(255),
  purchased_at TIMESTAMP,
  expires_at TIMESTAMP 
);

-- Trial spark grants (for expiry tracking)
CREATE TABLE spark_grants (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  reason VARCHAR(50), -- 'signup' | 'referral' | 'promotion'
  sparks_granted INTEGER,
  sparks_remaining INTEGER,
  granted_at TIMESTAMP,
  expires_at TIMESTAMP -- granted_at + 14 days
);
```

**Important:** `spark_balances` is the fast-read table. `spark_transactions` is the source of truth. If they ever diverge, `spark_transactions` wins. Run a daily reconciliation job to check for drift.

---

## Spark Deduction Logic

```typescript
async function deductSparks(
  userId: string,
  amount: number,
  action: string,
  referenceId: string
): Promise<{ success: boolean; remainingBalance: number }> {
  
  // Always run inside a database transaction
  return await db.transaction(async (trx) => {
    const balance = await trx('spark_balances')
      .where({ user_id: userId })
      .forUpdate() // row-level lock prevents race conditions
      .first();
    
    if (balance.total_sparks < amount) {
      return { success: false, remainingBalance: balance.total_sparks };
    }
    
    // Deduct in order: trial → topup → subscription
    let remaining = amount;
    const updates: Partial<SparkBalance> = {};
    
    if (remaining > 0 && balance.trial_sparks > 0) {
      const deduct = Math.min(remaining, balance.trial_sparks);
      updates.trial_sparks = balance.trial_sparks - deduct;
      remaining -= deduct;
      await recordTransaction(trx, userId, -deduct, 'trial', action, referenceId);
    }
    
    if (remaining > 0 && balance.topup_sparks > 0) {
      const deduct = Math.min(remaining, balance.topup_sparks);
      updates.topup_sparks = balance.topup_sparks - deduct;
      remaining -= deduct;
      await recordTransaction(trx, userId, -deduct, 'topup', action, referenceId);
      // Also deduct from oldest spark_purchase record (FIFO)
      await deductFromOldestPurchase(trx, userId, deduct);
    }
    
    if (remaining > 0 && balance.subscription_sparks > 0) {
      const deduct = Math.min(remaining, balance.subscription_sparks);
      updates.subscription_sparks = balance.subscription_sparks - deduct;
      remaining -= deduct;
      await recordTransaction(trx, userId, -deduct, 'subscription', action, referenceId);
    }
    
    updates.updated_at = new Date();
    await trx('spark_balances').where({ user_id: userId }).update(updates);
    
    const newTotal = balance.total_sparks - amount;
    return { success: true, remainingBalance: newTotal };
  });
}
```

**Critical:** Always use a database transaction with a row-level lock when deducting Sparks. Race conditions here mean users get free credits. Never deduct client-side.

---

## Expiry Jobs

Three cron jobs handle expiry:

```typescript
// Run at 00:01 every day
async function expireTrialSparks() {
  const expired = await db('spark_grants')
    .where('expires_at', '<', new Date())
    .where('sparks_remaining', '>', 0);
  
  for (const grant of expired) {
    await debitExpiredSparks(grant.user_id, grant.sparks_remaining, 'trial', grant.id);
    await db('spark_grants').where({ id: grant.id }).update({ sparks_remaining: 0 });
  }
}

// Run at 00:01 every day
async function expireTopUpSparks() {
  const expired = await db('spark_purchases')
    .where('expires_at', '<', new Date())
    .where('sparks_remaining', '>', 0);
  
  for (const purchase of expired) {
    await debitExpiredSparks(purchase.user_id, purchase.sparks_remaining, 'topup', purchase.id);
    await db('spark_purchases').where({ id: purchase.id }).update({ sparks_remaining: 0 });
    // Log as breakage revenue
    await recordBreakageRevenue(purchase);
  }
}

// Run at billing period start (triggered by Stripe webhook)
async function refreshSubscriptionSparks(userId: string, plan: string) {
  const monthlyAllowance = PLAN_SPARK_ALLOWANCE[plan];
  const balance = await getSparkBalance(userId);
  
  // Apply rollover cap: max 2× monthly allowance
  const rolloverCap = monthlyAllowance * 2;
  const currentSubs = balance.subscription_sparks;
  const rolledOver = Math.min(currentSubs, rolloverCap - monthlyAllowance);
  const newBalance = rolledOver + monthlyAllowance;
  
  await db('spark_balances')
    .where({ user_id: userId })
    .update({ subscription_sparks: newBalance });
  
  await recordTransaction(userId, monthlyAllowance, 'subscription', 'subscription_refresh');
  
  if (currentSubs > rolloverCap - monthlyAllowance) {
    const forfeited = currentSubs - (rolloverCap - monthlyAllowance);
    await recordTransaction(userId, -forfeited, 'subscription', 'rollover_cap_forfeiture');
  }
}
```

---

## Expiry Warning Notifications

When a user logs in and has Sparks expiring within 7 days, show a non-intrusive banner at the top of the dashboard:

**Trial Sparks expiring:**
> *"⚡ Your 15 trial Sparks expire in 5 days. Use them on a session before they're gone."*
> `Start a Session →`

**Subscription rollover forfeiture warning** (shown 3 days before billing date if user has unused Sparks that will be partially forfeited):
> *"⚡ You have 180 Sparks but only 150 will roll over. Use 30 more before Feb 1."*
> `Start a Session →`

These banners are dismissible and don't show again for 48 hours after dismissal.

---

## Referral Spark Rewards

When a referred user makes their first Spark purchase or upgrades to Pro:
- Referrer receives 20 Top-Up Sparks 
- Referred user receives 10 bonus Trial Sparks (14-day expiry) on top of the standard signup grant

```typescript
async function processReferralReward(referrerId: string, referredUserId: string) {
  await grantSparks(referrerId, 20, 'topup', 'referral', addMonths(new Date(), 24));
  await sendNotification(referrerId, 
    '⚡ You earned 20 Sparks! Your referral just made their first purchase.'
  );
  await updateReferral(referrerId, referredUserId, 'rewarded');
}
```

---

## Settings — Spark History Page

Route: `/settings/sparks`

A full transaction history for the user. Table with columns:

| Date | Action | Pool | Amount | Balance After |
|---|---|---|---|---|
| Jan 15 | Session: answer analysis | Subscription | -1 | 43 |
| Jan 15 | Session: full feedback report | Subscription | -2 | 44 |
| Jan 14 | Top-up: The Learner's Vault | Top-Up | +100 | 46 |
| Jan 1 | Monthly subscription refresh | Subscription | +150 | — |

Filter by pool type. Show current balance summary at top (same breakdown as the Spark drawer).

---

## Analytics to Track

```typescript
// Spark economy health metrics

'sparks_granted_trial'           // volume of trial sparks entering the system
'sparks_granted_subscription'    // volume from subscription refreshes
'sparks_purchased'               // volume from top-up purchases (with pack_id)
'sparks_spent'                   // volume spent (with action type)
'sparks_expired_trial'           // trial sparks lost to expiry
'sparks_expired_topup'           // top-up sparks lost (breakage revenue)
'sparks_forfeited_rollover'      // subscription sparks lost to rollover cap

// Conversion metrics
'trial_sparks_to_purchase'       // did trial spark user buy a pack within 14 days?
'trial_pack_to_subscription'     // did Trial Pack buyer subscribe within 30 days?
'out_of_sparks_shown'            // how often do users hit zero?
'basic_mode_used'                // are users taking the reduced-cost path?
'basic_mode_to_full_upgrade'     // do they upgrade the report after basic mode?
```

**Most important metric to watch:** Spark burn rate per user per month. If average free users are burning all 20 Sparks before month end, the free tier is too generous or the costs are too high. If they're barely using 5, the product isn't engaging enough. Target: free users burning 15–18 Sparks/month — close enough to the limit to feel the upgrade pressure without feeling cheated.

---

## Launch Checklist — Credits System

- [ ] Three Spark pools implemented with correct draw-down order (trial → topup → subscription)
- [ ] spark_transactions ledger records every credit and debit
- [ ] spark_balances table stays in sync with transactions
- [ ] Row-level locking on all Spark deduction operations (no race conditions)
- [ ] Spark balance pill visible in app header on all authenticated screens
- [ ] Spark drawer shows breakdown by pool with expiry dates
- [ ] Pre-action cost shown inline next to every Spark-costing button
- [ ] Soft stop behavior — current session always completes before blocking
- [ ] Basic Mode offered when user has some but not enough Sparks
- [ ] Post-basic-mode full report upgrade offer works correctly
- [ ] Spark Shop renders all three packs with correct pricing and badges
- [ ] Stripe one-time payment checkout works for all three packs
- [ ] Webhook credits correct pool on purchase completion
- [ ] Daily expiry cron jobs running for trial and top-up pools
- [ ] Subscription refresh cron fires on billing date with rollover cap logic
- [ ] Rollover cap correctly enforced (max 2× monthly allowance)
- [ ] 7-day expiry warning banners show and are dismissible
- [ ] Rollover forfeiture warning shows 3 days before billing date
- [ ] Referral reward grants 20 Top-Up Sparks on referred user's first purchase
- [ ] Spark transaction history page at /settings/sparks
- [ ] All analytics events firing
- [ ] Breakage revenue logged when top-up Sparks expire
- [ ] Pro annual plan surfaced in Spark Shop as best per-Spark rate