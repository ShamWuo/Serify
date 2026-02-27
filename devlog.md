# 📓 Serify Devlog

---

## Feb 26, 2026 — The Great Bug Slaughter

We sat down with a list of 21 bugs and said "not today."

### What got fixed

**Critical stuff (the duct-tape was showing):**
- 🔥 **RLS error exposed to users** — `sessions/init.ts` was using an anonymous Supabase client server-side, which has zero auth context and explodes on insert. Swapped to the service-role admin client. No more raw Postgres errors hitting the UI.
- ⚡ **Sparks deducted on failed sessions** — Same root cause. Once the RLS failure was plugged, there's no longer a window where AI runs, Sparks get eaten, and nothing saves.
- 🔘 **Non-interactive settings buttons** — "Export Session Data" and "Delete Account" were glorified `<div>`s. They're real buttons now. Delete even has a two-step "type DELETE to confirm" modal because we're not animals.
- 🔑 **Change Password did nothing** — Now triggers a Supabase reset email.

**Major stuff (the annoyances):**
- Pricing page now shows **"✓ Current Plan"** if you're already Pro — no more accidentally re-buying your own plan.
- Teams **"Contact Us"** was a `window.alert`. It's a `mailto:` link now. Basic.
- SparkBalance panel and the user dropdown were fighting for z-index supremacy. Fixed: opening one closes the other.
- User dropdown now closes on **click-outside** and **Escape**. Revolutionary.
- AI Tutor toggle subtitle was hardcoded. Now it's live state.
- Stale localStorage sessions validated against the DB on home load — no more ghost "IN PROGRESS" banners.

**Minor polish:**
- Spark history: credits are green ↓, debits are red ↑. Labels show actual action names.
- Trial Sparks expiry only shows when balance > 0. Zero Sparks, zero drama.
- Vault "Solid" and "Needs Work" tabs each have their own empty-state copy.
- `/analyze` subtitle now matches Home.

### Git
Squashed 2 years of chaos into a single `Initial commit`. Updated `.gitignore` to actually ignore everything it should (env files, Supabase local dev, editor configs, OS junk). Force-pushed to origin.

**Files touched:** `sessions/init.ts`, `settings.tsx`, `pricing.tsx`, `DashboardLayout.tsx`, `SparkBalance.tsx`, `index.tsx`, `analyze.tsx`, `vault.tsx`, `settings/sparks.tsx`

---

*Build status: ✅ clean. Onwards.*
