import { File, Paths } from 'expo-file-system';
import { Share } from 'react-native';
import { supabase } from './supabase';

interface ExportRow {
  date: string;
  species: string;
  scientific_name: string;
  weight_kg: string;
  length_cm: string;
  location: string;
  water_body: string;
  latitude: string;
  longitude: string;
  notes: string;
  released: string;
  weather: string;
}

export async function exportCatchesToCSV(userId: string): Promise<string | null> {
  try {
    const { data: catches, error } = await supabase
      .from('catches')
      .select(`
        caught_at,
        weight_kg,
        length_cm,
        latitude,
        longitude,
        location_name,
        water_body,
        notes,
        is_released,
        weather_conditions,
        species:final_species_id (
          common_name,
          scientific_name
        )
      `)
      .eq('user_id', userId)
      .order('caught_at', { ascending: false });

    if (error) throw new Error(error.message);
    if (!catches || catches.length === 0) return null;

    const headers = [
      'Date', 'Species', 'Scientific Name', 'Weight (kg)', 'Length (cm)',
      'Location', 'Water Body', 'Latitude', 'Longitude', 'Notes', 'Released', 'Weather',
    ];

    const rows: string[] = [headers.join(',')];

    for (const c of catches) {
      const species = c.species as unknown as { common_name: string; scientific_name: string } | null;
      const row: ExportRow = {
        date: c.caught_at ?? '',
        species: species?.common_name ?? '',
        scientific_name: species?.scientific_name ?? '',
        weight_kg: c.weight_kg?.toString() ?? '',
        length_cm: c.length_cm?.toString() ?? '',
        location: c.location_name ?? '',
        water_body: c.water_body ?? '',
        latitude: c.latitude?.toString() ?? '',
        longitude: c.longitude?.toString() ?? '',
        notes: (c.notes ?? '').replace(/"/g, '""'),
        released: c.is_released ? 'Yes' : 'No',
        weather: c.weather_conditions ? JSON.stringify(c.weather_conditions).replace(/"/g, '""') : '',
      };

      rows.push(
        Object.values(row)
          .map((v) => `"${v}"`)
          .join(','),
      );
    }

    return rows.join('\n');
  } catch (err) {
    console.error('CSV export failed:', err);
    return null;
  }
}

export async function exportAndShareCSV(userId: string): Promise<boolean> {
  const csv = await exportCatchesToCSV(userId);
  if (!csv) return false;

  try {
    const fileName = `fishbook-export-${Date.now()}.csv`;
    const file = new File(Paths.cache, fileName);
    file.write(csv);

    await Share.share(
      { url: file.uri, message: 'My FishBook catch data' },
      { dialogTitle: 'Export Catches', subject: 'FishBook Data Export' },
    );

    return true;
  } catch {
    return false;
  }
}
