-- Species reference table with FishBase data
CREATE TABLE species (
  id SERIAL PRIMARY KEY,
  common_name TEXT NOT NULL,
  scientific_name TEXT NOT NULL UNIQUE,
  family TEXT,
  order_name TEXT,
  image_url TEXT,
  description TEXT,
  habitat TEXT[],
  min_weight_kg NUMERIC,
  max_weight_kg NUMERIC,
  min_length_cm NUMERIC,
  max_length_cm NUMERIC,
  lw_a NUMERIC,
  lw_b NUMERIC,
  region_ranges JSONB,
  is_game_fish BOOLEAN DEFAULT false,
  conservation_status TEXT
);

CREATE INDEX idx_species_scientific ON species(scientific_name);
CREATE INDEX idx_species_habitat ON species USING GIN(habitat);
CREATE INDEX idx_species_common_name ON species(common_name);
