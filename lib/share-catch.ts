import { Share } from 'react-native';
import { supabase } from './supabase';
import type { CatchRecord } from './catches';

export async function shareCatch(catchData: CatchRecord): Promise<boolean> {
  const species = catchData.species?.common_name ?? 'Unknown Species';
  const weight = catchData.weight_kg ? `${catchData.weight_kg} kg` : '';
  const location = catchData.location_name ? ` at ${catchData.location_name}` : '';
  const date = catchData.caught_at
    ? new Date(catchData.caught_at).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  const lines = [
    `🐟 ${species}`,
    weight ? `⚖️ ${weight}` : null,
    date ? `📅 ${date}` : null,
    location ? `📍${location}` : null,
    '',
    'Logged with FishBook',
  ].filter(Boolean);

  const message = lines.join('\n');

  try {
    const result = await Share.share(
      {
        message,
        url: catchData.photo_url || undefined,
        title: `My ${species} Catch`,
      },
      {
        dialogTitle: 'Share Your Catch',
        subject: `FishBook: ${species} Catch`,
      },
    );

    return result.action === Share.sharedAction;
  } catch {
    return false;
  }
}

export function generateCatchCardText(catchData: CatchRecord): string {
  const species = catchData.species?.common_name ?? 'Unknown Species';
  const weight = catchData.weight_kg ? `${catchData.weight_kg} kg` : '';
  const location = catchData.location_name ?? '';
  const date = catchData.caught_at
    ? new Date(catchData.caught_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '';

  return [species, weight, date, location].filter(Boolean).join(' · ');
}
