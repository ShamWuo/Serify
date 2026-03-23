import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isFeatureEnabled, getAllEnabledFlags } from './flags';
import { supabase } from './supabase';

vi.mock('./supabase', () => {
    const mockSingle = vi.fn();
    const mockEq = vi.fn(() => ({ single: mockSingle }));
    const mockSelect = vi.fn(() => ({ eq: mockEq }));
    const mockFrom = vi.fn(() => ({ select: mockSelect }));

    return {
        supabase: {
            from: mockFrom
        }
    };
});

describe('Feature Flags Logic', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const getMocks = () => {
        const from = supabase.from as any;
        const select = from().select;
        const eq = select().eq;
        const single = eq().single;
        return { from, select, eq, single };
    };

    describe('isFeatureEnabled', () => {
        it('returns false if flag is not found', async () => {
            const { single } = getMocks();
            single.mockResolvedValue({ data: null, error: { message: 'Not found' } });
            
            const result = await isFeatureEnabled('missing_flag');
            expect(result).toBe(false);
        });

        it('returns false if globally disabled', async () => {
            const { single } = getMocks();
            single.mockResolvedValue({
                data: { key: 'disabled_flag', is_enabled: false, rollout_percentage: 100 },
                error: null
            });
            const result = await isFeatureEnabled('disabled_flag');
            expect(result).toBe(false);
        });

        it('returns true if 100% rollout', async () => {
            const { single } = getMocks();
            single.mockResolvedValue({
                data: { key: 'full_rollout', is_enabled: true, rollout_percentage: 100 },
                error: null
            });
            const result = await isFeatureEnabled('full_rollout');
            expect(result).toBe(true);
        });

        it('matches specific user ID rule', async () => {
            const { single } = getMocks();
            single.mockResolvedValue({
                data: { 
                    key: 'user_target', 
                    is_enabled: true, 
                    rollout_percentage: 0,
                    rules: [{ type: 'user_id', value: 'user-123' }]
                },
                error: null
            });
            
            expect(await isFeatureEnabled('user_target', 'user-123')).toBe(true);
            expect(await isFeatureEnabled('user_target', 'other-user')).toBe(false);
        });

        it('matches subscription tier rule', async () => {
            const { single } = getMocks();
            single.mockResolvedValue({
                data: { 
                    key: 'pro_feature', 
                    is_enabled: true, 
                    rollout_percentage: 0,
                    rules: [{ type: 'tier', value: 'pro' }]
                },
                error: null
            });
            
            expect(await isFeatureEnabled('pro_feature', 'any', { tier: 'pro' })).toBe(true);
            expect(await isFeatureEnabled('pro_feature', 'any', { tier: 'free' })).toBe(false);
        });

        it('handles percentage rollouts deterministically', async () => {
            const { single } = getMocks();
            single.mockResolvedValue({
                data: { key: 'canary', is_enabled: true, rollout_percentage: 50 },
                error: null
            });

            const res1 = await isFeatureEnabled('canary', 'user-1');
            const res2 = await isFeatureEnabled('canary', 'user-1');
            expect(res1).toBe(res2); 
            
            const res3 = await isFeatureEnabled('canary', 'user-2');
            
            expect(typeof res1).toBe('boolean');
            expect(typeof res3).toBe('boolean');
        });
    });

    describe('getAllEnabledFlags', () => {
        it('returns only flags that pass criteria', async () => {
            const { eq } = getMocks();
            
            eq.mockResolvedValue({
                data: [
                    { key: 'flag-100', is_enabled: true, rollout_percentage: 100 },
                    { key: 'flag-0', is_enabled: true, rollout_percentage: 0 },
                    { key: 'flag-user', is_enabled: true, rollout_percentage: 0, rules: [{ type: 'user_id', value: 'me' }] },
                ],
                error: null
            });

            const enabled = await getAllEnabledFlags('me');
            expect(enabled).toContain('flag-100');
            expect(enabled).toContain('flag-user');
            expect(enabled).not.toContain('flag-0');
        });

        it('returns empty array on error', async () => {
            const { eq } = getMocks();
            eq.mockResolvedValue({ data: null, error: { message: 'DB Error' } });

            const enabled = await getAllEnabledFlags();
            expect(enabled).toEqual([]);
        });
    });
});
