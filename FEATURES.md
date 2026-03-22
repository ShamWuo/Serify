# Feature Flag System

Our application uses a custom, Supabase-backed feature flag system for safe feature rollouts, canary releases, and A/B testing.

## Table of Contents
1. [Backend Usage](#backend-usage)
2. [Frontend Usage](#frontend-usage)
3. [Managing Flags](#managing-flags)
4. [Rollout Strategy](#rollout-strategy)

---

## Backend Usage

For API routes or server-side logic, use `isFeatureEnabled` from `@/lib/flags`.

```typescript
import { isFeatureEnabled } from '@/lib/flags';

export default async function handler(req, res) {
    const userId = req.user?.id;
    
    // Check if the new AI model is enabled for this user
    const useNewModel = await isFeatureEnabled('new-ai-model-v2', userId);
    
    if (useNewModel) {
        // Run new logic
    } else {
        // Run legacy logic
    }
}
```

## Frontend Usage

### Using the Hook

Use `useFeatureFlags` for conditional logic in components.

```tsx
import { useFeatureFlags } from '@/contexts/FeatureFlagContext';

export function MyComponent() {
    const { isEnabled } = useFeatureFlags();
    
    return (
        <div>
            <h1>Dashboard</h1>
            {isEnabled('new_dashboard_v2') ? (
                <NewDashboardLayout />
            ) : (
                <OldDashboardLayout />
            )}
        </div>
    );
}
```

### Using the Component

Wrap UI elements with the `FeatureFlag` component for a cleaner declarative pattern.

```tsx
import { FeatureFlag } from '@/contexts/FeatureFlagContext';

export function Navigation() {
    return (
        <nav>
            <HomeLink />
            <FeatureFlag flag="ai_voice_synthesis">
                <VoiceSynthesisLink />
            </FeatureFlag>
        </nav>
    );
}
```

## Managing Flags

Feature flags are stored in the `feature_flags` table in Supabase.

| Column | Description |
|--------|-------------|
| `key` | Unique identifier (e.g., `new_ui_v1`) |
| `is_enabled` | Master toggle for the flag |
| `rollout_percentage` | 0-100% of users who will see the feature |
| `rules` | JSON array for targeting (e.g., `[{ "type": "tier", "value": "pro" }]`) |

### Adding a New Flag
```sql
INSERT INTO feature_flags (key, description, is_enabled, rollout_percentage)
VALUES ('experimental_feature', 'Testing something new', TRUE, 10);
```

## Rollout Strategy

1. **Development:** `is_enabled = FALSE`.
2. **Internal Testing:** `is_enabled = TRUE`, `rules = [{ "type": "email", "value": "admin@serify.ai" }]`.
3. **Canary Release:** `is_enabled = TRUE`, `rollout_percentage = 10`.
4. **Full Release:** `is_enabled = TRUE`, `rollout_percentage = 100`.
5. **Cleanup:** After 100% rollout is stable, remove the flag from code and database.
