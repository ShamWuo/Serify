-- Add missing token costs for Practice Mode generation actions
INSERT INTO public.token_costs (action, token_cost, is_free, description)
VALUES 
    ('practice_test_generation', 5, false, 'Generate retrieval questions'),
    ('practice_quiz_generation', 3, false, 'Generate multiple choice quiz'),
    ('practice_exam_generation', 15, false, 'Generate full exam simulation'),
    ('practice_comprehensive_generation', 12, false, 'Generate mixed-type evaluation'),
    ('practice_flashcards_generation', 5, false, 'Generate AI flashcard deck'),
    ('practice_scenario_generation', 8, false, 'Generate real-world scenario')
ON CONFLICT (action) DO UPDATE SET 
    token_cost = EXCLUDED.token_cost, 
    description = EXCLUDED.description;
