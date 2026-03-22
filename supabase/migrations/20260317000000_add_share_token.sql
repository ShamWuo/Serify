-- Add share_token to profiles for public knowledge map sharing
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_map_public BOOLEAN DEFAULT false;

-- Add policy for public access to knowledge nodes if the profile is public
-- We'll need a way for non-authenticated users to view nodes
DROP POLICY IF EXISTS "Anyone can view public knowledge nodes" ON public.knowledge_nodes;
CREATE POLICY "Anyone can view public knowledge nodes" ON public.knowledge_nodes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = knowledge_nodes.user_id
      AND profiles.is_map_public = true
    )
  );

-- Also need profiles to be viewable if public
DROP POLICY IF EXISTS "Anyone can view public profiles" ON public.profiles;
CREATE POLICY "Anyone can view public profiles" ON public.profiles
  FOR SELECT
  USING (is_map_public = true);
