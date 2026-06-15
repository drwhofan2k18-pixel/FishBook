-- Row Level Security policies for FishBook
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE species ENABLE ROW LEVEL SECURITY;
ALTER TABLE catches ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- Profiles: anyone can view, users can insert/update their own
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Species: anyone can view, only service_role can modify
CREATE POLICY "Species are viewable by everyone"
  ON species FOR SELECT
  USING (true);

CREATE POLICY "Only admins can insert species"
  ON species FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Only admins can update species"
  ON species FOR UPDATE
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Only admins can delete species"
  ON species FOR DELETE
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Catches: users can only see and manage their own catches
CREATE POLICY "Users can view their own catches"
  ON catches FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own catches"
  ON catches FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own catches"
  ON catches FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own catches"
  ON catches FOR DELETE
  USING (auth.uid() = user_id);

-- Achievements: anyone can view, only service_role can modify
CREATE POLICY "Achievements are viewable by everyone"
  ON achievements FOR SELECT
  USING (true);

CREATE POLICY "Only admins can insert achievements"
  ON achievements FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Only admins can update achievements"
  ON achievements FOR UPDATE
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Only admins can delete achievements"
  ON achievements FOR DELETE
  USING (auth.jwt() ->> 'role' = 'service_role');

-- User achievements: users can view their own, insert handled by application
CREATE POLICY "Users can view their own achievements"
  ON user_achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert user achievements"
  ON user_achievements FOR INSERT
  WITH CHECK (true);
