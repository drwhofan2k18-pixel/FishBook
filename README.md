# 🎣 FishBook

An intelligent fishing companion app. Log catches, identify species with AI, track your angling journey, and discover fishing spots — all offline-capable.

## Features

- **AI Fish Identification** — Take a photo, get instant species identification via iNaturalist API or on-device TFLite model
- **Offline-First** — Full catch logging works without cell service; syncs when back online
- **Bite Forecast** — Species-specific activity predictions based on weather, time of day, and fish behavior
- **Community Heatmap** — Privacy-safe discovery of productive fishing zones (blurred 2km grid)
- **Gamification** — 12 achievements, species diversity tracking, personal records
- **Species Guide** — Browse 60+ species with FishBase data, conservation status, and your catch history
- **Multi-Language** — English, Spanish, French, German, Japanese, Portuguese
- **Unit Preferences** — Metric/Imperial toggle across the entire app

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Expo SDK 56 + React Native |
| Navigation | Expo Router (file-based) |
| State | Zustand + React Query |
| Backend | Supabase (PostgreSQL + Auth + Storage + Edge Functions) |
| AI | iNaturalist CV API + TFLite on-device model |
| Maps | react-native-maps |
| Camera | expo-camera (CameraView) |
| Offline | expo-sqlite + custom sync engine |

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- [Supabase CLI](https://supabase.com/docs/guides/cli) (optional, for migrations)
- [Expo Go](https://expo.dev/go) app on your phone

### Setup

```bash
# 1. Clone and install
git clone <repo-url>
cd FishBook
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your Supabase URL and anon key

# 3. Run the automated setup
./scripts/setup-supabase.sh

# 4. Start the dev server
npx expo start

# 5. Scan the QR code with Expo Go
```

### Manual Setup

If you prefer to set things up manually:

**1. Create a Supabase project** at [supabase.com](https://supabase.com)

**2. Run migrations** — In the Supabase SQL Editor, run each file in order:
```
supabase/migrations/00001_profiles.sql
supabase/migrations/00002_species.sql
supabase/migrations/00003_catches.sql
supabase/migrations/00004_achievements.sql
supabase/migrations/00005_rls_policies.sql
supabase/migrations/00006_achievements_seed.sql
supabase/migrations/00007_security_fixes.sql
```

**3. Seed species data** — In Table Editor → species, import:
```
data/species-seed-part1.json   (freshwater)
data/species-seed-part2.json   (saltwater)
data/species-seed-part3.json   (gamefish)
```

**4. Deploy Edge Functions:**
```bash
supabase functions deploy identify-fish
supabase functions deploy estimate-weight
supabase functions deploy community-heatmap
```

**5. Create storage bucket** — In Supabase Dashboard → Storage → New Bucket:
- Name: `catch-photos`
- Public: yes

**6. Set environment variables:**
```bash
cp .env.example .env
# Fill in EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY
```

## Project Structure

```
FishBook/
├── app/                    # Expo Router screens
│   ├── (auth)/             # Login + Signup
│   ├── (tabs)/             # Home, Camera, Library, Explore, Profile, Settings, Species
│   ├── catch/[id].tsx      # Catch detail
│   ├── species/[id].tsx    # Species detail
│   └── onboarding.tsx      # First-launch tutorial
├── components/             # Reusable UI components
├── lib/                    # Core logic (no UI)
│   ├── catches.ts          # React Query hooks for catch CRUD
│   ├── fish-id.ts          # AI identification (iNaturalist + on-device)
│   ├── bite-forecast.ts    # Predictive fishing engine
│   ├── weather.ts          # OpenWeatherMap integration
│   ├── community-map.ts    # Heatmap data
│   ├── sync-engine.ts      # Offline sync
│   └── offline-db.ts       # Local SQLite
├── supabase/
│   ├── migrations/         # SQL migrations (run in order)
│   └── functions/          # Edge Functions (Deno)
├── i18n/                   # Translations (6 languages)
├── models/                 # TFLite model + labels
├── data/                   # Species seed data
├── __tests__/              # Jest unit tests
└── scripts/                # Setup automation
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `EXPO_PUBLIC_SUPABASE_URL` | ✅ | Your Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Your Supabase anon/public key |
| `EXPO_PUBLIC_OPENWEATHER_API_KEY` | ❌ | OpenWeatherMap API key (enables weather + bite forecast) |
| `EXPO_PUBLIC_TFLITE_MODEL_URL` | ❌ | URL to download TFLite model (enables offline AI) |

## Testing

```bash
npm test
```

64 unit tests covering:
- FishBase weight/length calculations
- Unit conversions (metric/imperial)
- Species behavior profiles
- Photo calibration math
- Weather rating algorithm
- Bite forecast scoring

## Building for Production

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure builds
eas build:configure

# Build for both platforms
eas build --platform all

# Submit to stores
eas submit --platform all
```

## Architecture Decisions

- **Offline-first**: SQLite stores catches locally, sync engine queues changes for upload
- **Privacy-safe heatmap**: Catch locations are snapped to 2km grid cells, minimum 2 anglers required
- **AI fallback chain**: iNaturalist API → on-device TFLite → manual species entry
- **RLS everywhere**: Every table has Row Level Security; users can only access their own data
- **Trigger-based profiles**: The `handle_new_user()` trigger auto-creates profiles on signup

## License

MIT
