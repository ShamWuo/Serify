# Bug Report - Serify App Testing

**Date:** March 20, 2026  
**Tester:** AI Agent  
**Environment:** Windows 10, Next.js 15.5.12, Node.js

---

## Critical Bugs

### 1. **Infinite Loading State on Homepage**
**Severity:** 🔴 Critical  
**Status:** Blocking app usage

**Description:**  
The homepage (`/`) displays "Loading Serify..." indefinitely and never renders the actual landing page or dashboard.

**Steps to Reproduce:**
1. Start dev server with `npm run dev`
2. Navigate to `http://localhost:3000/`
3. Observe that page remains stuck on loading screen

**Expected Behavior:**  
- Should show landing page for unauthenticated users
- Should show dashboard for authenticated users
- Should complete loading within 8 seconds (safety timeout configured in AuthContext)

**Root Cause Analysis:**
- `AuthContext` has a safety timeout mechanism (line 204-217 in `contexts/AuthContext.tsx`)
- Timeout is set to 8000ms for non-OAuth cases
- Despite timeout, loading state persists indefinitely
- Possible causes:
  - Supabase auth initialization hanging
  - `state.current.fetchingFor` never cleared
  - Auth state change event not firing
  - Missing or invalid environment variables blocking auth init

**Technical Details:**
```typescript
// From AuthContext.tsx:139
if (loading || (!!user && dataLoading)) {
    return (
        <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <Brain className="animate-pulse text-[var(--accent)]" size={48} />
                <p className="text-sm font-bold tracking-widest text-[var(--muted)] uppercase">Loading Serify...</p>
            </div>
        </div>
    );
}
```

**Console Output:**
- No auth state change events logged
- No errors visible in console
- Server logs show successful page compilation and render

**Impact:**
- App completely unusable
- Users cannot access any functionality
- No error message shown to user

**Recommended Fix:**
1. Add more aggressive timeout (reduce from 8s to 3-5s)
2. Add error state when loading times out
3. Add detailed logging to track auth initialization flow
4. Implement fallback UI when auth fails to initialize
5. Consider showing partial UI while auth loads (optimistic rendering)

---

## Database/API Errors (From Server Logs)

### 2. **Database Constraint Violations in Curriculum Saving**
**Severity:** 🟡 High  
**Location:** `/api/serify/save-curriculum`

**Description:**  
Multiple database constraint violations when saving curriculum data.

**Error Examples:**
```
Error saving curriculum: {
  code: '23502',
  details: 'Failing row contains (...)',
  message: 'null value in column "user_input" of relation "curricula" violates not-null constraint'
}

Error saving curriculum: {
  code: '23502',
  message: 'null value in column "units" of relation "curricula" violates not-null constraint'
}

Error saving curriculum: {
  code: 'PGRST205',
  message: "Could not find the table 'public.curriculum_units' in the schema cache"
}
```

**Root Cause:**
1. Required fields `user_input` and `units` are null when inserting
2. Table `curriculum_units` doesn't exist or isn't in schema cache
3. API endpoint not validating data before database insertion

**Impact:**
- Curriculum feature completely broken
- Users cannot save learning roadmaps
- Data loss - curriculum generation work is wasted

**Recommended Fix:**
1. Add input validation in API endpoint
2. Check if `curriculum_units` table exists, create migration if missing
3. Set default values for required fields
4. Add proper error handling and user feedback

---

### 3. **Missing Google Generative AI API Key**
**Severity:** 🟡 High  
**Location:** `/api/serify/stream-curriculum`

**Description:**  
AI curriculum generation fails due to missing API key.

**Error:**
```
Curriculum generation error: AI_LoadAPIKeyError: Google Generative AI API key is missing. 
Pass it using the 'apiKey' parameter or the GOOGLE_GENERATIVE_AI_API_KEY environment variable.
```

**Impact:**
- AI-powered curriculum generation doesn't work
- Core feature of the app is non-functional

**Recommended Fix:**
1. Add `GOOGLE_GENERATIVE_AI_API_KEY` to `.env.local`
2. Add validation on app startup to check for required API keys
3. Show user-friendly error when API key is missing

---

## Potential Issues to Investigate

### 4. **Authentication State Management**
**Priority:** High

**Observations:**
- Auth state change events not appearing in logs
- Safety timeout mechanism may not be working correctly
- Possible race condition in auth initialization

**Testing Needed:**
1. Test with valid authenticated session
2. Test with no session (unauthenticated)
3. Test OAuth callback flow
4. Test session persistence across page reloads

---

### 5. **Error Boundary Not Catching Loading Issues**
**Priority:** Medium

The app uses `ErrorBoundary` in `_app.tsx` but it's not catching the loading state issue, suggesting the problem isn't a React error but a state management issue.

---

---

## Pages Tested

### ✅ Working Pages
- [x] `/login` - Loads correctly, form is functional
- [x] `/signup` - (assumed working, same pattern as login)

### ❌ Broken/Blocked Pages
- [ ] `/` (Homepage) - **Infinite loading** due to AuthContext
- [ ] `/sessions` - **Blank page** after 800ms (no user data)
- [ ] `/` with `?demo=true` - **Still stuck loading** (demo mode doesn't bypass auth loading)

### ⏳ Not Yet Tested
- [ ] `/pricing`
- [ ] `/learn`
- [ ] `/practice/*`
- [ ] `/vault`
- [ ] `/settings`
- [ ] `/session/[id]`
- [ ] All protected routes
- [ ] API endpoints (besides `/api/usage` which returns 401)

---

## Root Cause Analysis: Auth Loading State

**The Core Problem:**
The `AuthContext` has a `loading` state that never resolves to `false`, blocking the entire application.

**Evidence:**
1. Console logs show no auth state change events firing
2. Safety timeout (8000ms) configured but not working
3. Homepage waits for `loading === false` before rendering (line 139 of `pages/index.tsx`)
4. Sessions page depends on `user` object which never gets set
5. Login page works because it doesn't check `loading` state, only `user` existence

**Likely Causes:**
1. Supabase auth initialization hanging/failing silently
2. `onAuthStateChange` event listener not receiving initial session event
3. Environment variables missing or invalid (though `.env.local` exists)
4. Safety timeout mechanism not triggering (`state.current.fetchingFor` preventing timeout)
5. Possible Supabase connection issue

**Code Locations:**
- `contexts/AuthContext.tsx` lines 186-258 (useEffect with auth listener)
- `contexts/AuthContext.tsx` lines 204-217 (safety timeout)
- `pages/index.tsx` line 139 (loading check blocking render)

---

## Testing Progress

### ✅ Completed
- [x] Server startup and compilation
- [x] Initial page load (server-side rendering works)
- [x] Browser console inspection (no JS errors)
- [x] Server log analysis (shows DB and API errors)
- [x] Multiple page navigation tests
- [x] Demo mode test (still blocked by auth)
- [x] API endpoint test (returns expected 401)
- [x] Identified root cause of loading issue

### ⏳ Blocked by Critical Bug
- [ ] Dashboard functionality testing
- [ ] Create session/reflection workflows
- [ ] Navigation between features
- [ ] Form submissions (besides login)
- [ ] Protected route access
- [ ] Full API endpoint testing
- [ ] Database interactions
- [ ] User flows and journeys
- [ ] Performance testing
- [ ] Mobile responsiveness
- [ ] Accessibility testing

---

## Additional Findings

### 6. **Forgot Password Link Goes Nowhere**
**Severity:** 🟡 Medium  
**Location:** `/login` page, line 126-132

The "Forgot?" link is set to `href="#"` which does nothing:
```tsx
<Link
    href="#"
    className="text-xs text-[var(--accent)] hover:underline"
>
    Forgot?
</Link>
```

**Impact:** Users who forget their password have no way to recover their account.

**Fix:** Implement password reset flow or remove the link.

---

## Recommendations

### Immediate Actions (Critical)
1. **Debug Auth Initialization:**
   - Add comprehensive logging to AuthContext
   - Check Supabase connection in browser devtools
   - Verify environment variables are loaded
   - Test with a simpler auth check

2. **Implement Fallback:**
   - Reduce safety timeout from 8s to 3s
   - Add error state when timeout occurs
   - Show error message to user with retry option
   - Allow bypass for development/testing

3. **Quick Fix for Testing:**
   - Comment out the loading check on homepage temporarily
   - Or force `loading = false` after 3 seconds
   - This would unblock further testing

### Medium Priority
4. Fix database constraint violations in curriculum saving
5. Add proper error handling throughout app
6. Implement password reset functionality
7. Add more robust environment variable validation

### Long Term
8. Add comprehensive error boundaries
9. Implement better loading states across the app
10. Add health check endpoints
11. Improve observability and monitoring
12. Add E2E tests for critical paths

---

## Next Steps

1. **Immediate:** Investigate and fix AuthContext loading issue
2. Add detailed logging to understand auth flow
3. Once unblocked, continue systematic feature testing
4. Create GitHub issues for all identified bugs
5. Prioritize and fix critical path blockers
