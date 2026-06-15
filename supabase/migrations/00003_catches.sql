-- Core catches table for logging fish catches
CREATE TABLE catches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  species_id INT REFERENCES species(id),
  ai_species_id INT REFERENCES species(id),
  ai_confidence NUMERIC,
  user_confirmed_species_id INT REFERENCES species(id),
  final_species_id INT GENERATED ALWAYS AS (
    COALESCE(user_confirmed_species_id, ai_species_id)
  ) STORED,
  weight_kg NUMERIC,
  weight_method TEXT,
  length_cm NUMERIC,
  length_type TEXT,
  photo_url TEXT NOT NULL,
  photo_thumbnail_url TEXT,
  additional_photo_urls TEXT[],
  latitude NUMERIC,
  longitude NUMERIC,
  location_name TEXT,
  water_body TEXT,
  depth_m NUMERIC,
  caught_at TIMESTAMPTZ NOT NULL,
  weather_conditions JSONB,
  tackle_used JSONB,
  notes TEXT,
  is_released BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER catches_updated_at
  BEFORE UPDATE ON catches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Indexes
CREATE INDEX idx_catches_user ON catches(user_id);
CREATE INDEX idx_catches_species ON catches(final_species_id);
CREATE INDEX idx_catches_date ON catches(caught_at DESC);

-- PostGIS index for location queries
CREATE INDEX idx_catches_location ON catches USING GIST (
  ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
);
