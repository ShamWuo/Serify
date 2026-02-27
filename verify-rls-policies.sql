-- Verify RLS Policies are Set Up Correctly
-- Run this to check if your policies exist

-- Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename IN ('reflection_sessions', 'concepts', 'assessment_questions', 'user_answers', 'analyses')
ORDER BY tablename;

-- Check all policies on reflection_sessions
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd as operation,
    qual as using_expression,
    with_check as check_expression
FROM pg_policies
WHERE tablename = 'reflection_sessions'
ORDER BY cmd, policyname;

-- If you see no policies, you need to run setup-rls-policies.sql
