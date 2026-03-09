import { describe, it, expect } from 'vitest';
import { SPARK_COSTS } from './sparks';

describe('Spark Costs (lib/sparks.ts)', () => {
    it('should have consistent costs for core actions', () => {
        expect(SPARK_COSTS.SESSION_INGESTION).toBe(2);
        expect(SPARK_COSTS.CURRICULUM_GENERATION).toBe(2);
        expect(SPARK_COSTS.QUESTION_GENERATION).toBe(1);
    });

    it('should have all required action costs defined', () => {
        const requiredKeys = [
            'SESSION_INGESTION',
            'CURRICULUM_GENERATION',
            'QUESTION_GENERATION',
            'FLOW_MODE_PLAN'
        ];
        requiredKeys.forEach(key => {
            expect(SPARK_COSTS).toHaveProperty(key);
            expect(typeof SPARK_COSTS[key as keyof typeof SPARK_COSTS]).toBe('number');
        });
    });
});
