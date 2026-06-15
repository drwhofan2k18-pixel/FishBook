-- Seed achievements data
INSERT INTO achievements (name, description, criteria) VALUES
  ('First Catch', 'Log your first catch', '{"type": "catches_count", "threshold": 1}'),
  ('Dedicated Angler', 'Log 50 catches', '{"type": "catches_count", "threshold": 50}'),
  ('Master Angler', 'Log 100 catches', '{"type": "catches_count", "threshold": 100}'),
  ('Species Collector', 'Catch 5 different species', '{"type": "species_count", "threshold": 5}'),
  ('Species Hunter', 'Catch 15 different species', '{"type": "species_count", "threshold": 15}'),
  ('Ichthyologist', 'Catch 30 different species', '{"type": "species_count", "threshold": 30}'),
  ('Big Catcher', 'Catch a 10 kg fish', '{"type": "biggest_fish_kg", "threshold": 10}'),
  ('Giant Hunter', 'Catch a 25 kg fish', '{"type": "biggest_fish_kg", "threshold": 25}'),
  ('Record Breaker', 'Catch a 50 kg fish', '{"type": "biggest_fish_kg", "threshold": 50}'),
  ('Freshwater Fan', 'Catch 25 freshwater fish', '{"type": "habitat_catches", "threshold": 25, "habitat": "freshwater"}'),
  ('Saltwater Sailor', 'Catch 25 saltwater fish', '{"type": "habitat_catches", "threshold": 25, "habitat": "saltwater"}'),
  ('Catch & Release', 'Release 25 catches', '{"type": "released_catches", "threshold": 25}')
ON CONFLICT DO NOTHING;
