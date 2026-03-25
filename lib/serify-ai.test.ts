import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractConcepts, generateSessionTitle, classifyMessage } from './serify-ai';
import { generateObject } from 'ai';

vi.mock('ai', () => ({
  generateObject: vi.fn(),
}));

vi.mock('@ai-sdk/google', () => ({
  createGoogleGenerativeAI: vi.fn().mockReturnValue(vi.fn()),
}));

describe('Serify AI Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('extractConcepts', () => {
    it('should extract concepts using generateObject', async () => {
      const mockConcepts = [
        {
          id: 'pillar-1',
          name: 'DNS',
          description: 'Domain Name System',
          importance: 'high',
          relatedConcepts: [],
          subConcepts: [{ name: 'Resolution', description: 'Process of resolving names' }]
        }
      ];

      (generateObject as any).mockResolvedValue({ object: mockConcepts });

      const result = await extractConcepts({ id: 'test-id', type: 'text', content: 'DNS is...', title: 'DNS' });

      expect(generateObject).toHaveBeenCalled();
      const lastCallArgs = (generateObject as any).mock.calls[0][0];
      expect(lastCallArgs.messages[0].content).toContain('DNS is...');
      expect(result).toEqual(mockConcepts);
    });
  });

  describe('generateSessionTitle', () => {
    it('should generate a title', async () => {
      (generateObject as any).mockResolvedValue({ object: { title: 'Understanding DNS' } });

      const result = await generateSessionTitle('DNS is a system...', 'text');

      expect(result).toBe('Understanding DNS');
      expect(generateObject).toHaveBeenCalledWith(expect.objectContaining({
        schema: expect.anything(),
        prompt: expect.stringContaining('DNS is a system...'),
      }));
    });
  });

  describe('classifyMessage', () => {
    it('should classify short messages', async () => {
      (generateObject as any).mockResolvedValue({ object: { tier: 'tier1' } });

      const result = await classifyMessage('How do I use this?');

      expect(result).toBe('tier1');
      expect(generateObject).toHaveBeenCalled();
    });

    it('should return tier3 for long messages without calling AI', async () => {
      const longMessage = 'a'.repeat(201);
      const result = await classifyMessage(longMessage);

      expect(result).toBe('tier3');
      expect(generateObject).not.toHaveBeenCalled();
    });

    it('should handle follow-ups correctly', async () => {
        (generateObject as any).mockResolvedValue({ object: { tier: 'tier3' } });
  
        const result = await classifyMessage('Explain more', true);
  
        expect(result).toBe('tier2'); 
      });
  });
});
