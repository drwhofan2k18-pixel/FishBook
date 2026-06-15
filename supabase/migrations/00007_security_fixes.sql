-- SECURITY FIX: Restrict user_achievements INSERT to service_role only
-- The old policy "WITH CHECK (true)" allows ANY authenticated user to insert
-- achievements for ANY other user — a privilege escalation vector.

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "System can insert user achievements" ON user_achievements;

-- Replace with service_role-only insert (triggers and Edge Functions run as service_role)
CREATE POLICY "Only system can insert user achievements"
  ON user_achievements FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- SECURITY FIX: Restrict profile visibility to authenticated users only
-- "Profiles viewable by everyone" includes unauthenticated requests (anon key)
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;

CREATE POLICY "Authenticated users can view profiles"
  ON profiles FOR SELECT
  USING (auth.role() = 'authenticated');

-- SECURITY FIX: Add DELETE policy for profiles (self-deletion)
CREATE POLICY "Users can delete their own profile"
  ON profiles FOR DELETE
  USING (auth.uid() = id);
