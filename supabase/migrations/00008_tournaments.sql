-- Tournaments system
CREATE TABLE tournaments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  host_id UUID REFERENCES profiles(id) NOT NULL,
  species_target TEXT,
  scoring TEXT NOT NULL CHECK (scoring IN ('biggest_fish', 'total_weight', 'species_count')),
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed')),
  max_participants INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE tournament_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID REFERENCES tournaments(id) NOT NULL,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  catch_id UUID REFERENCES catches(id),
  entered_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_tournaments_status ON tournaments(status);
CREATE INDEX idx_tournaments_host ON tournaments(host_id);
CREATE INDEX idx_tournament_entries_tournament ON tournament_entries(tournament_id);
CREATE INDEX idx_tournament_entries_user ON tournament_entries(user_id);
CREATE INDEX idx_tournament_entries_catch ON tournament_entries(catch_id);

-- RLS
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tournaments viewable by authenticated users"
  ON tournaments FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Hosts can create tournaments"
  ON tournaments FOR INSERT
  WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Hosts can update their own tournaments"
  ON tournaments FOR UPDATE
  USING (auth.uid() = host_id);

CREATE POLICY "Tournament entries viewable by authenticated users"
  ON tournament_entries FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can enter tournaments"
  ON tournament_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);
