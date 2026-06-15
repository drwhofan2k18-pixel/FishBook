#!/usr/bin/env bash
set -euo pipefail

echo "🎣 FishBook Setup Script"
echo "========================"
echo ""

# Check prerequisites
check_prereq() {
  if ! command -v "$1" &> /dev/null; then
    echo "❌ $1 is required but not installed. $2"
    exit 1
  fi
  echo "✅ $1 found"
}

check_prereq "npx" "Install Node.js from https://nodejs.org"
check_prereq "supabase" "Install with: npm install -g supabase"

# Check .env file
if [ ! -f .env ]; then
  echo ""
  echo "📋 Creating .env from .env.example..."
  cp .env.example .env
  echo "⚠️  Please edit .env and fill in your Supabase credentials:"
  echo "   EXPO_PUBLIC_SUPABASE_URL"
  echo "   EXPO_PUBLIC_SUPABASE_ANON_KEY"
  echo ""
  echo "Get these from: https://supabase.com/dashboard → Project Settings → API"
  echo ""
  read -p "Press Enter when .env is configured..."
fi

# Load env vars
set -a
source .env
set +a

# Validate required vars
if [ -z "${EXPO_PUBLIC_SUPABASE_URL:-}" ] || [ -z "${EXPO_PUBLIC_SUPABASE_ANON_KEY:-}" ]; then
  echo "❌ EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are required in .env"
  exit 1
fi

echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "🗃️  Running database migrations..."
echo "   This creates all tables, indexes, RLS policies, and seeds achievements."
echo ""
echo "   Option A: Run via Supabase CLI (linked project)"
echo "   Option B: Copy SQL from supabase/migrations/ and run in Supabase SQL Editor"
echo ""
read -p "Run migrations via Supabase CLI? (y/N) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
  # Check if project is linked
  if supabase projects list &> /dev/null; then
    echo "Running migrations..."
    supabase db push
    echo "✅ Migrations applied"
  else
    echo "⚠️  No Supabase project linked. Run: supabase link"
    echo "   Then re-run this script, or copy the SQL manually."
  fi
else
  echo "📋 Manual migration instructions:"
  echo "   1. Go to https://supabase.com/dashboard → SQL Editor"
  echo "   2. Run each file in order:"
  for f in supabase/migrations/*.sql; do
    echo "      - $f"
  done
  echo ""
fi

echo ""
echo "📤 Deploying Edge Functions..."
read -p "Deploy Edge Functions to Supabase? (y/N) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
  for func_dir in supabase/functions/*/; do
    func_name=$(basename "$func_dir")
    echo "  Deploying $func_name..."
    supabase functions deploy "$func_name" --no-verify-jwt
  done
  echo "✅ Edge Functions deployed"
else
  echo "📋 Edge Function deployment skipped. Deploy later with:"
  echo "   supabase functions deploy identify-fish"
  echo "   supabase functions deploy estimate-weight"
  echo "   supabase functions deploy community-heatmap"
fi

echo ""
echo "🌱 Seeding species data..."
echo "   Load the JSON seed files into the species table."
echo "   Seed files: data/species-seed-part1.json, part2.json, part3.json"
echo ""
echo "   To seed via Supabase dashboard:"
echo "   1. Go to Table Editor → species"
echo "   2. Use 'Import data' → JSON for each file"
echo ""

echo "🧪 Running tests..."
npm test

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "  1. npx expo start          — Start the dev server"
echo "  2. Scan QR with Expo Go    — Test on your device"
echo "  3. Create a test account    — Walk through the onboarding flow"
echo ""
echo "For app store submission:"
echo "  npx expo prebuild          — Generate native projects"
echo "  eas build --platform all   — Build for iOS + Android"
echo ""
