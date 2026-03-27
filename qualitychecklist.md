# Serify — Production Quality Checklist
> Everything that separates a polished product from a side project. Go through this before showing Serify to anyone.

---

## Visual Design

- [ ] No system fonts
- [ ] Consistent font stack
- [ ] Color palette applied consistently across every screen — no rogue grays or blues
- [ ] Border radius consistent — everywhere
- [ ] Card shadows consistent — same shadow style on every card, no mix of drop shadows and box shadows
- [ ] Spacing consistent — same padding inside cards across the whole app
- [ ] No orphaned elements — every component fits the grid
- [ ] Icons consistent — one icon library, one style, same size everywhere
- [ ] No placeholder images anywhere in the app
- [ ] No Lorem Ipsum text anywhere
- [ ] Empty states designed for every list and data view — never a blank white area
- [ ] Loading states designed for every async action — never a frozen UI
- [ ] Favicon shows correctly in browser tab
- [ ] App name shows correctly in browser tab title on every page
- [ ] OG image set — looks good when shared on Twitter, Slack, iMessage
- [ ] Light mode looks polished — not washed out
- [ ] No horizontal scroll on any screen at any viewport width

---

## Typography

- [ ] Heading hierarchy is clear — H1 > H2 > H3 never reversed or skipped
- [ ] Line height comfortable on all body text — not too tight, not too loose
- [ ] Text never overflows its container on any screen size
- [ ] Long words and URLs break correctly — no overflow
- [ ] Numbers display correctly — Instrument Serif for large display numbers
- [ ] All caps used sparingly — only for small labels, never for body text
- [ ] Letter spacing on all-caps labels is slightly increased — never tight
- [ ] No text is unreadably small — minimum 12px, ideally 13px for secondary text

---

## Interactions and Motion

- [ ] Every button has a hover state
- [ ] Every button has an active/pressed state
- [ ] Every clickable element has a cursor: pointer
- [ ] Focus states visible for keyboard navigation — not just for accessibility, looks intentional
- [ ] Transitions on hover states — 120-150ms ease, never jarring
- [ ] Page transitions don't flash white between routes
- [ ] Modals and drawers animate in — don't just appear
- [ ] Dropdowns animate open — don't just snap
- [ ] Toast notifications animate in and out
- [ ] No layout shift when content loads in
- [ ] Skeleton loaders match the shape of the content they're loading

---

## Copy and Language

- [ ] App name spelled consistently everywhere — "Serify" not "serify" or "SERIFY"
- [ ] No "Lorem ipsum" anywhere
- [ ] No "Coming soon" features visible to users — remove or hide entirely
- [ ] No developer language in user-facing copy — no "null", "undefined", "error 500"
- [ ] Error messages are human — "Something went wrong. Try again." not "Request failed with status 422"
- [ ] Empty states have copy that explains what will appear here and how to get there
- [ ] Button labels are verbs — "Generate Flashcards" not "Flashcards"
- [ ] No double punctuation anywhere
- [ ] Consistent capitalization — pick title case or sentence case for headings and stick to it
- [ ] Mastery state labels consistent everywhere — "Solid" not "solid" or "SOLID"
- [ ] Token/usage language removed — no references to old Spark system anywhere
- [ ] Dates formatted consistently — "Nov 14" or "November 14" everywhere, not both
- [ ] Times shown in user's local timezone — never UTC
- [ ] Possessives correct — "your Vault" not "you're Vault"

---

## Auth and Onboarding

- [ ] Signup flow takes under 60 seconds from landing to inside the app
- [ ] Google OAuth works and redirects correctly
- [ ] Email signup works with proper validation
- [ ] Password has clear requirements shown before submission — not just an error after
- [ ] "Forgot password" flow works end to end
- [ ] Email verification sends within 30 seconds
- [ ] After signup, user lands on dashboard — not a blank page or error
- [ ] First-time dashboard shows onboarding state — not empty data views
- [ ] User's name shows correctly in "Good morning, [name]" — no "[object Object]" or "undefined"
- [ ] Logging out works and redirects to login
- [ ] Session persists correctly — user doesn't get logged out randomly
- [ ] Auth redirects work — going to a protected route while logged out redirects to login then back

---

## Core Session Loop

- [ ] YouTube URL ingestion works reliably — test 10 different videos
- [ ] Article URL ingestion works — test paywalled, non-paywalled, redirecting URLs
- [ ] PDF upload works — test small, large, scanned, text-based
- [ ] Notes ingestion works — test short and long text
- [ ] Failed ingestion shows a helpful error — never a white screen
- [ ] Questions generated feel relevant to the content — not generic
- [ ] Free text answer input works correctly — no character limits cutting answers off
- [ ] Session saves progress — if user closes tab mid-session they can return
- [ ] Feedback report loads correctly after submission
- [ ] Feedback report feels specific to what the user wrote — not generic
- [ ] Mastery states in feedback feel accurate — Solid actually means solid
- [ ] Concept Vault updates after every session
- [ ] Session appears in history immediately after completion

---

## Performance

- [ ] Dashboard loads in under 2 seconds on a normal connection
- [ ] No page takes over 3 seconds to load on a normal connection
- [ ] Images optimized — no uncompressed PNGs over 500KB
- [ ] Fonts load without causing layout shift — font-display: swap or similar
- [ ] No memory leaks — app doesn't slow down after extended use
- [ ] API calls have loading states — no frozen UI while waiting
- [ ] API calls have timeouts — no infinite loading spinners
- [ ] Long AI generation calls show real progress — not a static spinner for 30 seconds
- [ ] Slow connections handled gracefully — no broken layouts on 3G

---

## Errors and Edge Cases

- [ ] 404 page is designed — not a default browser error
- [ ] Network error shown when user goes offline mid-session
- [ ] Session saved before any error — user never loses work
- [ ] Empty Vault has a designed empty state — not a blank page
- [ ] Zero sessions in history has a designed empty state
- [ ] User with 0 tokens sees a clear gate — not a broken button
- [ ] All form validation shows inline errors — not just after submission
- [ ] Required fields marked clearly — not just an error on submit
- [ ] Pasting a bad URL shows a clear error — not a silent failure
- [ ] Very long concept names don't break the Vault layout
- [ ] Very long session titles don't break the session history layout

---

## Mobile

- [ ] All pages usable on iPhone SE (375px width) — nothing cut off
- [ ] All pages usable on standard Android (360px width)
- [ ] Touch targets are at least 44×44px — buttons and links not too small to tap
- [ ] No hover-dependent interactions on mobile — everything tappable
- [ ] Keyboard doesn't cover important content on mobile
- [ ] Scrolling works correctly on all pages — no locked scroll
- [ ] File upload works on mobile — opens native file picker
- [ ] Modals don't extend beyond screen height on mobile

---

## Billing and Account

- [ ] Free tier limits enforced correctly — not letting free users through gates
- [ ] Pro tier limits enforced correctly
- [ ] Pro+ shows no usage UI anywhere — completely clean
- [ ] Stripe checkout opens correctly from upgrade buttons
- [ ] Successful payment updates plan immediately — no refresh needed
- [ ] Failed payment handled gracefully — user notified, access maintained during grace period
- [ ] Cancellation works through Stripe Customer Portal
- [ ] Cancelled user retains access until period end
- [ ] Settings page shows correct plan, usage, and renewal date
- [ ] "Manage billing" opens Stripe Customer Portal correctly

---

## Emails

- [ ] Welcome email sends within 60 seconds of signup
- [ ] Welcome email renders correctly in Gmail, Apple Mail, Outlook
- [ ] Welcome email has correct from address — hello@serify.study
- [ ] Welcome email has correct from name — "Serify" not a random string
- [ ] Password reset email sends within 60 seconds
- [ ] Password reset link works and expires after 24 hours
- [ ] Payment failed email sends within 24 hours
- [ ] All emails have an unsubscribe link (legal requirement)
- [ ] No emails go to spam — test with mail-tester.com

---

## Browser and Compatibility

- [ ] Works correctly in Chrome (latest)
- [ ] Works correctly in Safari (latest) — especially on Mac and iPhone
- [ ] Works correctly in Firefox (latest)
- [ ] Works correctly in Edge (latest)
- [ ] No console errors in production — clean console
- [ ] No exposed API keys in client-side code
- [ ] Environment variables correctly separated — no production keys in dev

---

## Legal and Trust

- [ ] Privacy Policy exists and is linked in the footer
- [ ] Terms of Service exists and is linked in the footer
- [ ] Fair use policy for Pro+ exists in Terms
- [ ] Cookie banner shown on first visit if required for your jurisdiction
- [ ] Serify logo and favicon not a placeholder
- [ ] Copyright year correct in footer — © 2026 Serify
- [ ] Contact email in footer — hello@serify.study
- [ ] SSL certificate active — HTTPS on all pages, no mixed content warnings
- [ ] No broken links anywhere — check footer, nav, email links

---

## The Gut Check

These aren't checkboxes — read each one and be honest.

- Does the feedback report feel like it was written specifically for what the user wrote, or does it feel like a template?
- If a stranger used the app for 5 minutes would they understand what it does without reading any documentation?
- Does the app feel faster than you expect, or slower?
- Is there any screen where you feel slightly embarrassed showing it to someone?
- Does the empty Vault feel like an opportunity or a dead end?
- Would you personally use this to study something you actually care about?
- Is there any copy anywhere that sounds like a robot wrote it?
- Does the pricing feel fair or does it feel like a trap?
- If someone screenshots the feedback report and posts it on Twitter, does it look good?
- Would you be comfortable if a journalist looked at this today?

If any of these give you pause — fix that thing before you post.
