-- Achievements gamification tables
CREATE TABLE achievements (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  criteria JSONB
);

CREATE TABLE user_achievements (
  user_id UUID REFERENCES profiles(id),
  achievement_id INT REFERENCES achievements(id),
  earned_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, achievement_id)
);
