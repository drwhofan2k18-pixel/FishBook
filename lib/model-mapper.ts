import type { IdentificationMatch } from './catch-store';
import labelsData from '../models/labels.json';
import { supabase } from './supabase';

interface LabelEntry {
  index: number;
  common_name: string;
  scientific_name: string;
  family: string;
}

const labels: LabelEntry[] = labelsData.labels as LabelEntry[];
const SPECIES_CACHE = new Map<string, number>();

const CONFIDENCE_THRESHOLD = 0.15;
const TOP_N_DEFAULT = 3;

export async function mapOutputToSpecies(
  outputTensor: Float32Array,
  topN: number = TOP_N_DEFAULT,
): Promise<IdentificationMatch[]> {
  const sorted = getTopIndices(outputTensor, topN + 2);

  const matches: IdentificationMatch[] = [];

  for (const { index, confidence } of sorted) {
    if (confidence < CONFIDENCE_THRESHOLD) continue;
    if (matches.length >= topN) break;

    const label = labels[index];
    if (!label) continue;

    const speciesId = await resolveSpeciesId(label);

    matches.push({
      species_id: speciesId ?? 0,
      common_name: label.common_name,
      scientific_name: label.scientific_name,
      confidence: Math.round(confidence * 1000) / 1000,
      iNaturalistTaxonId: 0,
      image_url: '',
    });
  }

  return matches;
}

function getTopIndices(
  tensor: Float32Array,
  n: number,
): Array<{ index: number; confidence: number }> {
  const indexed: Array<{ index: number; confidence: number }> = [];

  for (let i = 0; i < tensor.length; i++) {
    indexed.push({ index: i, confidence: tensor[i] });
  }

  indexed.sort((a, b) => b.confidence - a.confidence);
  return indexed.slice(0, n);
}

async function resolveSpeciesId(label: LabelEntry): Promise<number | null> {
  const cacheKey = label.scientific_name;
  if (SPECIES_CACHE.has(cacheKey)) {
    return SPECIES_CACHE.get(cacheKey)!;
  }

  try {
    const { data } = await supabase
      .from('species')
      .select('id')
      .eq('scientific_name', label.scientific_name)
      .maybeSingle();

    const id = data?.id ?? null;
    if (id) SPECIES_CACHE.set(cacheKey, id);
    return id;
  } catch {
    return null;
  }
}

export function getLabelCount(): number {
  return labels.length;
}

export function getLabelByIndex(index: number): LabelEntry | null {
  return labels[index] ?? null;
}
