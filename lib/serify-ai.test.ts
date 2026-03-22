import { describe, it, expect } from 'vitest';
import { parseJSON } from './serify-ai';

describe('AI Parser (lib/serify-ai.ts)', () => {
    it('should parse clean JSON correctly', () => {
        const input = '{"key": "value"}';
        expect(parseJSON(input)).toEqual({ key: 'value' });
    });

    it('should extract and parse JSON from markdown code blocks', () => {
        const input = 'Here is the response: ```json\n{"key": "value"}\n```';
        expect(parseJSON(input)).toEqual({ key: 'value' });
    });

    it('should handle code blocks without the json tag', () => {
        const input = '```\n{"key": "value"}\n```';
        expect(parseJSON(input)).toEqual({ key: 'value' });
    });

    it('should throw an error on invalid JSON', () => {
        const input = 'Not JSON';
        expect(() => parseJSON(input)).toThrow();
    });
});
