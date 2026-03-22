import { describe, it, expect, vi, beforeEach } from 'vitest';
import { consumeTokens, processAssistantMessage, DEMO_USER_ID } from './usage';
import { supabase, supabaseAdmin } from './supabase';
import { classifyMessage } from './serify-ai';

// Mock Supabase
vi.mock('./supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  },
  supabaseAdmin: {
    from: vi.fn(),
    rpc: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  },
}));

// Mock classifyMessage
vi.mock('./serify-ai', () => ({
  classifyMessage: vi.fn(),
}));

describe('Usage System', () => {
  const mockUserId = 'user-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('consumeTokens', () => {
    it('should return allowed: true for demo user without calling RPC', async () => {
      const result = await consumeTokens(DEMO_USER_ID, 'session_standard');
      expect(result.allowed).toBe(true);
      expect(result.cost).toBe(0);
      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    it('should call consume_tokens RPC for regular users', async () => {
      const mockRpcResult = {
        data: {
          allowed: true,
          cost: 13,
          tokens_used: 13,
          monthly_limit: 50,
          plan: 'free',
        },
        error: null,
      };

      // Mocking the rpc call on supabaseAdmin (preferred client)
      (supabaseAdmin?.rpc as any).mockResolvedValue(mockRpcResult);

      const result = await consumeTokens(mockUserId, 'session_standard');

      expect(supabaseAdmin?.rpc).toHaveBeenCalledWith('consume_tokens', {
        p_user_id: mockUserId,
        p_action: 'session_standard',
        p_category: 'sessions',
        p_reference_id: undefined,
      });

      expect(result.allowed).toBe(true);
      expect(result.cost).toBe(13);
      expect(result.tokensUsed).toBe(13);
    });

    it('should throw error if RPC fails', async () => {
      (supabaseAdmin?.rpc as any).mockResolvedValue({ data: null, error: { message: 'DB Error' } });

      await expect(consumeTokens(mockUserId, 'session_standard')).rejects.toThrow('Failed to process usage tokens');
    });
  });

  describe('processAssistantMessage', () => {
    it('should skip check for Pro+ users', async () => {
      // Mock tracking info
      (supabaseAdmin?.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { plan: 'proplus', tokens_used: 100, monthly_limit: 500 },
              error: null,
            }),
          }),
        }),
      });

      const result = await processAssistantMessage(mockUserId, 'Hello');
      expect(result.allowed).toBe(true);
      expect(classifyMessage).not.toHaveBeenCalled();
    });

    it('should classify message and consume tokens for free users', async () => {
      // Mock tracking info
      (supabaseAdmin?.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { plan: 'free', tokens_used: 10, monthly_limit: 50 },
              error: null,
            }),
          }),
        }),
      });

      // Mock classification as Tier 2
      (classifyMessage as any).mockResolvedValue('tier2');

      // Mock token consumption
      const mockRpcResult = {
        data: {
          allowed: true,
          cost: 1,
          tokens_used: 11,
          monthly_limit: 50,
          plan: 'free',
        },
        error: null,
      };
      (supabaseAdmin?.rpc as any).mockResolvedValue(mockRpcResult);

      const result = await processAssistantMessage(mockUserId, 'What is DNS?');

      expect(classifyMessage).toHaveBeenCalledWith('What is DNS?', false);
      expect(supabaseAdmin?.rpc).toHaveBeenCalledWith('consume_tokens', expect.objectContaining({
        p_action: 'ai_message_tier2',
        p_category: 'ai_messages',
      }));
      expect(result.allowed).toBe(true);
      expect(result.tier).toBe('tier2');
    });

    it('should block if user is over limit', async () => {
      // Mock tracking info
      (supabaseAdmin?.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { plan: 'free', tokens_used: 50, monthly_limit: 50 },
              error: null,
            }),
          }),
        }),
      });

      (classifyMessage as any).mockResolvedValue('tier2');

      // Mock token consumption failure
      const mockRpcResult = {
        data: {
          allowed: false,
          cost: 1,
          tokens_used: 50,
          monthly_limit: 50,
          plan: 'free',
        },
        error: null,
      };
      (supabaseAdmin?.rpc as any).mockResolvedValue(mockRpcResult);

      const result = await processAssistantMessage(mockUserId, 'Tell me more');

      expect(result.allowed).toBe(false);
    });
  });
});
