# Serify — Onboarding Spec
> Feed this to the agent alongside all other Serify spec files. This covers every screen, state, copy, logic, and edge case for the full onboarding experience from landing page to first feedback report.

---

## Overview

Onboarding has one job: get the user to the moment they think "this knows me." That moment happens at the end of their first session when the feedback report shows them something true about their own understanding. Everything in onboarding is the fastest possible path to that moment.

**Guiding principles:**
- Every extra screen costs conversion. Keep it ruthlessly short.
- Never ask for information you don't immediately use.
- The product explains itself through use — not through tooltips, tours, or videos.
- Guided onboarding ends the moment the first feedback report is delivered.

---

## Routes

| Route | Purpose |
|---|---|
| `/signup` | Account creation |
| `/onboarding` | The one-question personalization screen |
| `/onboarding/how-it-works` | The single walkthrough screen |
| `/dashboard` | Post-onboarding destination — first session starts here |

After completing `/onboarding/how-it-works`, the user never sees these routes again. All routes redirect to `/dashboard` for returning users.

---

## Screen 1: Sign Up (`/signup`)

### Layout

Clean, centered card. Max width 400px. Vertically centered on page. Serify wordmark at top. Tagline directly below it.

```
        Serify

  You think you learned it.
       Let's find out.

  ┌─────────────────────────────┐
  │  Continue with Google    G  │
  └─────────────────────────────┘

  ──────────── or ────────────

  Email address
  ┌─────────────────────────────┐
  │                             │
  └─────────────────────────────┘

  Password
  ┌─────────────────────────────┐
  │                             │
  └─────────────────────────────┘

  ┌─────────────────────────────┐
  │      Create Account →       │
  └─────────────────────────────┘

  15 free Sparks included.
  No credit card required.

  Already have an account? Log in
```

### Fields

- **Email** — standard email validation. Show error inline if invalid format on blur.
- **Password** — minimum 8 characters. Show strength indicator as they type (weak/okay/strong). No confirm password field.
- No name field. No phone number. No username.

### Google OAuth

Button uses Google's official styling guidelines — white background, Google G icon, "Continue with Google" text. On click, opens Google OAuth popup. On success, checks if this Google account already exists in the database:
- Existing account → redirect to `/dashboard` (returning user flow)
- New account → redirect to `/onboarding` (new user flow)

### Email Signup Flow

On submit:
1. Validate email format and password length client-side
2. Check if email already exists — if yes, show: *"An account with this email already exists. [Log in instead →]"*
3. Create account
4. Send verification email (non-blocking — user proceeds immediately, verification happens in background)
5. Grant 15 trial Sparks immediately on account creation
6. Redirect to `/onboarding`

### Verification Email

Sent immediately on signup. Subject: *"Confirm your Serify account"*

Body:
> Hi,
> Click below to confirm your email address and keep your account secure.
> [Confirm Email →]
> This link expires in 24 hours.

Unverified accounts can use the product normally. A small non-intrusive banner appears at the top of the dashboard until verified: *"Please verify your email. [Resend →]"* Banner disappears on verification. Never blocks usage.

### Error States

| Error | Message |
|---|---|
| Invalid email format | "Please enter a valid email address" |
| Password too short | "Password must be at least 8 characters" |
| Email already exists | "An account with this email already exists. Log in instead →" |
| Google OAuth failed | "Something went wrong with Google sign in. Try again or use email." |
| Network error | "Connection failed. Check your internet and try again." |

---

## Screen 2: Personalization (`/onboarding`)

### Layout

Centered card, slightly wider than signup — max width 520px. Progress indicator at top showing step 1 of 2 (two small dots, first filled).

```
  ○ ●  ←  step indicator (step 1 of 2)

  Tell us about yourself
  Serify will personalize your experience.

  I am a...
  ○ Student
  ○ Professional
  ○ Self-directed learner
  ○ Educator

  I'm currently learning or working on...
  ┌─────────────────────────────────────┐
  │                                     │
  └─────────────────────────────────────┘
  e.g. Machine learning, Bar exam prep, React development

                   Skip →    [Continue →]
```

### Behavior

Both fields are optional. Skip link bottom right skips to `/onboarding/how-it-works` without saving anything. Continue saves whatever is filled in (even if one field is empty) and proceeds.

The radio buttons are single-select. Only one user type can be selected. No default selection — the user must actively choose if they want to answer.

The free text field has a 200 character limit. No validation beyond length. Accept anything.

**What happens with this data:**

User type is saved to `users.user_type` and used to:
- Personalize the welcome copy on the how-it-works screen
- Personalize the Quick Start card placeholder text on the dashboard
- Inform the Concept Vault topic clustering algorithm
- Segment analytics for conversion reporting

Free text is saved to `users.learning_context` and used to:
- Pre-seed the first topic cluster in the Concept Vault (background job, runs after first session)
- Inform the AI Tutor opening message in future sessions
- Not shown back to the user anywhere prominently — it's context, not a profile field

---

## Screen 3: How It Works (`/onboarding/how-it-works`)

### Layout

Centered, max width 560px. Step indicator showing step 2 of 2 (second dot filled).

Headline personalizes based on user type selected in Screen 2:

| User Type | Headline |
|---|---|
| Student | "Serify helps you find out what you actually understood before the exam." |
| Professional | "Serify helps you verify what actually stuck from what you read and studied." |
| Self-directed learner | "Serify shows you the gap between what you consumed and what you understood." |
| Educator | "Serify helps you experience learning the way your students do." |
| None selected / skipped | "Here's how Serify works." |

```
  [Personalized headline]

  ┌──────────────────────────────────────────────┐
  │  01  Paste anything you've been learning from │
  │      A YouTube video, article, PDF, or your  │
  │      own notes. Serify reads it.             │
  └──────────────────────────────────────────────┘

  ┌──────────────────────────────────────────────┐
  │  02  Answer questions about it               │
  │      Not a quiz. Serify asks you to explain  │
  │      things in your own words. No right or  │
  │      wrong format.                          │
  └──────────────────────────────────────────────┘

  ┌──────────────────────────────────────────────┐
  │  03  See what you actually understood        │
  │      A detailed map of what landed, what was │
  │      shallow, and where your knowledge has  │
  │      gaps. Your Concept Vault starts here.  │
  └──────────────────────────────────────────────┘

  ⚡ Your 15 Sparks are ready.
     First session takes about 5 minutes.

  ┌──────────────────────────────────────────────┐
  │         Analyze something now →              │
  └──────────────────────────────────────────────┘
```

### Behavior

The three step cards are static — no animation, no reveal effect. All three visible immediately. The user reads them in whatever order they want.

The Spark line uses the lightning bolt icon and the amber color from the design system — same as the Spark balance pill. This reinforces the Spark concept before they use it for the first time.

Clicking "Analyze something now →" marks onboarding as complete in the database (`users.onboarding_completed_at = now()`) and navigates to `/dashboard`.

No back button on this screen. The step indicator dots are not clickable.

---

## Post-Onboarding: First-Time Dashboard

When a user arrives at `/dashboard` for the first time (no completed sessions), the layout is simplified.

### Left Column

The Quick Start card takes the full left column. No recent sessions section below it (nothing to show). The card is in its first-time state:

```
  What did you just learn?

  [YouTube]  [Article]  [PDF]  [Notes]

  ┌─────────────────────────────────────────┐
  │  Paste a YouTube URL...                 │
  └─────────────────────────────────────────┘

  Start with something you recently watched,
  read, or studied. The more recent the better.

  ┌─────────────────────────────────────────┐
  │             Analyze →        ⚡ 13 Sparks│
  └─────────────────────────────────────────┘
```

The contextual tip below the input ("Start with something you recently...") only appears on the first-time dashboard. It disappears after the first session completes.

Each input tab shows a different placeholder:
- YouTube: *"Paste a YouTube URL..."*
- Article: *"Paste an article URL..."*
- PDF: *"Upload a PDF or set of notes..."*
- Notes: *"Paste your notes here..."*

### Right Column

Single onboarding completion card — no Spark balance card, no gaps card, no session dots:

```
  ┌──────────────────────────────────┐
  │                                  │
  │  You're all set.                 │
  │                                  │
  │  ⚡ 15 Sparks ready              │
  │                                  │
  │  Paste anything you've been      │
  │  studying into the box.          │
  │                                  │
  │  Your gaps, Concept Vault,       │
  │  and learning history appear     │
  │  here after your first session.  │
  │                                  │
  └──────────────────────────────────┘
```

No filler content. No placeholder charts. Empty states are fine — the action is obvious.

---

## First Session — Guided Moments

Three moments of light guidance appear during the first session only. All are dismissible. None appear again after the first session.

### Guidance Moment 1: Before First Question

A dismissible card appears above the first question with an `×` to close:

```
  ┌──────────────────────────────────────────────────┐
  │  × Answer in your own words                      │
  │                                                  │
  │  There's no right or wrong format. Write as much │
  │  or as little as you naturally would. The        │
  │  quality of your feedback depends on the         │
  │  quality of your answer.                         │
  └──────────────────────────────────────────────────┘
```

Dismissing this saves `users.guidance_answer_dismissed = true`. Never shown again.

### Guidance Moment 2: Long Pause on First Answer

If the user has the first answer textarea focused but has typed fewer than 10 characters after 90 seconds:

A gentle nudge fades in below the textarea (not a popup, not a card — just a line of soft text):

> *"Even a partial answer helps. Write what you know."*

Disappears when they start typing. Never shown after the first session.

### Guidance Moment 3: Analyzing State

The loading screen between last answer submission and feedback report shows slightly different copy on the first session:

```
  [Animated indicator]

  Reading your answers carefully...

  This is where Serify earns it.
```

Standard loading copy on all subsequent sessions:
```
  Analyzing your responses...
```

---

## First Feedback Report — Additional Elements

Two elements appear on the first feedback report that never appear again.

### Element 1: Personalization Line

A single line at the very top of the report, above the summary paragraph, in small muted text:

> *"This is your first Serify report. Everything here is based on what you actually wrote — not what the content covered."*

This primes the user to read the feedback as a mirror of their own understanding rather than a grade or a content summary.

### Element 2: Post-Report Retention Prompt

At the very bottom of the feedback report page, below the learning area section, a single card:

```
  ┌──────────────────────────────────────────────┐
  │  Want to remember to come back?              │
  │                                              │
  │  Serify works best with repeated sessions.  │
  │  Your gaps are saved. Your Concept Vault is │
  │  live. We can remind you.                   │
  │                                              │
  │  How often?                                 │
  │  ○ Daily    ○ Every other day    ○ Weekly   │
  │                                              │
  │  [Set reminder →]              [Not now]    │
  └──────────────────────────────────────────────┘
```

Selecting a frequency and clicking Set reminder saves email preference to `users.reminder_frequency` and adds them to the reminder email sequence. Clicking Not now saves `users.reminder_declined = true` and hides this card permanently. Neither choice is tracked as a negative signal — both are valid outcomes.

This card never appears again after the first feedback report regardless of what the user chooses.

---

## Welcome Email

Sent immediately on account creation. Arrives while the user is completing onboarding or their first session.

**Subject:** *"Your 15 Sparks are ready"*

**Body:**

> Hey,
>
> You just created your Serify account. Your 15 trial Sparks are in your account and ready to use.
>
> Here's what to do first: paste a YouTube link, article URL, or set of notes into the Quick Start box. Answer a few questions about it in your own words. Then see what you actually understood.
>
> Most people are surprised by what they find.
>
> Your Sparks expire in 14 days — plenty of time to try a session or two.
>
> [Go to Serify →]

No product tour. No feature list. No "here's everything you can do." Just the one action they should take and why.

---

## Returning User Flow

Users who have completed onboarding and return to `/signup` or `/onboarding` are redirected to `/dashboard` immediately. Onboarding routes are inaccessible to users with `onboarding_completed_at` set.

Users who started signup but never completed onboarding (abandoned after Screen 1) land on Screen 2 on return — not back at signup.

---

## Database Fields Required

```sql
-- Add to users table
ALTER TABLE users ADD COLUMN user_type VARCHAR(30);
-- 'student' | 'professional' | 'self_directed' | 'educator' | null

ALTER TABLE users ADD COLUMN learning_context TEXT;
-- Free text from onboarding screen 2

ALTER TABLE users ADD COLUMN onboarding_completed_at TIMESTAMP;
-- Set when user clicks "Analyze something now →" on screen 3
-- Null = onboarding not completed

ALTER TABLE users ADD COLUMN guidance_answer_dismissed BOOLEAN DEFAULT FALSE;
-- Set when user dismisses the first-question guidance card

ALTER TABLE users ADD COLUMN reminder_frequency VARCHAR(20);
-- 'daily' | 'every_other_day' | 'weekly' | null

ALTER TABLE users ADD COLUMN reminder_declined BOOLEAN DEFAULT FALSE;
-- Set when user clicks Not Now on post-report retention prompt

ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN email_verification_token VARCHAR(255);
ALTER TABLE users ADD COLUMN email_verification_sent_at TIMESTAMP;
```

---

## Analytics Events

Every onboarding step fires an analytics event. These are the events that tell you where users are dropping off.

```typescript
'onboarding_signup_started'          // user lands on /signup
'onboarding_signup_completed'        // account created successfully
'onboarding_signup_google'           // used Google OAuth
'onboarding_signup_email'            // used email/password
'onboarding_personalization_viewed'  // landed on screen 2
'onboarding_personalization_skipped' // clicked Skip
'onboarding_personalization_completed' // clicked Continue (with data)
'onboarding_how_it_works_viewed'     // landed on screen 3
'onboarding_how_it_works_completed'  // clicked Analyze something now
'onboarding_first_session_started'   // submitted first content for analysis
'onboarding_first_session_completed' // first feedback report rendered
'onboarding_guidance_dismissed'      // dismissed the before-first-question card
'onboarding_reminder_set'            // set email reminder (with frequency)
'onboarding_reminder_declined'       // clicked Not Now
'onboarding_abandoned_signup'        // left /signup without completing
'onboarding_abandoned_personalization' // left /onboarding without completing
'onboarding_abandoned_before_session'  // completed screen 3 but never started session
'onboarding_abandoned_mid_session'   // started session but never got feedback report
```

**The funnel to watch:**

```
signup_completed
  → how_it_works_completed       (target: >90% — this should be nearly frictionless)
    → first_session_started      (target: >70% — Quick Start card must be obvious)
      → first_session_completed  (target: >65% — session flow must work perfectly)
        → reminder_set           (target: >40% — post-report retention prompt)
```

The drop between `first_session_started` and `first_session_completed` is the most important number to watch. If it's below 60%, something is breaking in the session flow — either a content type isn't working, the questions are generating poorly, or the feedback report is erroring. Investigate immediately.

---

## Edge Cases

**User signs up with Google but Google email is unverified**
Accept the signup. Google handles its own verification. Mark `email_verified = true` for all Google OAuth signups since Google only provides verified emails.

**User abandons mid-onboarding and returns later**
- Abandoned after Screen 1 (signup complete, Screen 2 not visited) → land on Screen 2
- Abandoned after Screen 2 (personalization complete, Screen 3 not visited) → land on Screen 3
- Abandoned after Screen 3 (onboarding complete, no sessions) → land on dashboard first-time state
- Never restart onboarding from the beginning for a returning user

**User tries to access `/onboarding` after completing it**
Redirect to `/dashboard`.

**User tries to access `/dashboard` before completing onboarding**
Redirect to the correct onboarding screen based on their current progress.

**Google OAuth returns an email that already exists as an email/password account**
Show: *"An account with this email already exists. Log in with your password instead, or reset it if you've forgotten it."* Do not automatically merge accounts.

**User's 15 trial Sparks expire before they complete their first session**
The Spark grant expiry job runs daily. If a user's trial Sparks expire before they complete onboarding, grant a fresh 7-day 10-Spark trial when they next log in — one time only, tracked by `users.trial_extension_granted`. Never leave a user with 0 Sparks mid-onboarding.

**First session AI call fails**
Show a clean error state in the Quick Start card:
> *"Something went wrong analyzing your content. This sometimes happens with very long pages or protected URLs. Try a different URL or paste the text directly."*
Do not deduct Sparks for failed ingestion calls. Refund any Sparks spent if the failure happens mid-session.

---

## Launch Checklist — Onboarding

**Auth**
- [ ] Email signup creates account and redirects to `/onboarding`
- [ ] Google OAuth creates account and redirects to `/onboarding` for new users
- [ ] Google OAuth redirects to `/dashboard` for returning users
- [ ] Email verification sends immediately on signup
- [ ] Unverified email banner shows on dashboard, disappears on verification
- [ ] Resend verification link works
- [ ] Duplicate email shows correct error message

**Spark Grant**
- [ ] 15 trial Sparks credited immediately on account creation
- [ ] spark_grants record created with correct 14-day expiry
- [ ] spark_balances total reflects 15 Sparks immediately after signup
- [ ] Trial extension grants 10 Sparks if user returns after expiry (one time only)

**Onboarding Screens**
- [ ] Screen 2 personalizes Screen 3 headline correctly for all user types
- [ ] Skip on Screen 2 proceeds without saving any data
- [ ] Continue on Screen 2 saves user_type and learning_context correctly
- [ ] Screen 3 sets onboarding_completed_at on button click
- [ ] Completed onboarding redirects all onboarding routes to /dashboard
- [ ] Abandoned onboarding resumes at correct screen on return

**First-Time Dashboard**
- [ ] Right column shows onboarding completion card (not standard right column)
- [ ] Contextual tip below input only appears before first session
- [ ] Each input tab shows correct first-time placeholder text
- [ ] Spark cost shown on Analyze button

**First Session Guidance**
- [ ] Before-first-question guidance card appears and is dismissible
- [ ] Dismissal saves guidance_answer_dismissed and never shows again
- [ ] 90-second pause nudge appears correctly (not on subsequent sessions)
- [ ] First session loading copy differs from standard loading copy

**First Feedback Report**
- [ ] Personalization line appears at top of first report only
- [ ] Post-report retention prompt appears at bottom of first report only
- [ ] Reminder frequency saves to reminder_frequency correctly
- [ ] Not Now saves reminder_declined and hides prompt permanently

**Welcome Email**
- [ ] Welcome email sends immediately on account creation
- [ ] Email arrives with correct subject and body
- [ ] CTA link goes to /dashboard correctly

**Analytics**
- [ ] All 16 analytics events fire at the correct moments
- [ ] Funnel can be reconstructed from events in analytics dashboard
- [ ] Drop-off at each step is visible

**Edge Cases**
- [ ] Google OAuth email collision shows correct message
- [ ] Failed first session AI call shows error and refunds Sparks
- [ ] Mobile layout works on all three onboarding screens
- [ ] Onboarding screens redirect correctly for authenticated users
