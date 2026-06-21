import NetInfo from '@react-native-community/netinfo';

const BRAVE_API_BASE = 'https://api.search.brave.com/res/v1/web/search';
const BRAVE_API_KEY = process.env.EXPO_PUBLIC_BRAVE_API_KEY ?? '';

export interface SearchResult {
  title: string;
  url: string;
  description: string;
}

export interface SearchResponse {
  results: SearchResult[];
  query: string;
}

async function braveSearch(query: string, count: number = 5): Promise<SearchResponse> {
  if (!BRAVE_API_KEY) {
    return { results: [], query };
  }

  try {
    const online = await NetInfo.fetch();
    if (!online.isConnected) return { results: [], query };

    const url = `${BRAVE_API_BASE}?q=${encodeURIComponent(query)}&count=${count}`;
    const resp = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': BRAVE_API_KEY,
      },
    });

    if (!resp.ok) return { results: [], query };

    const data = await resp.json();
    const results: SearchResult[] = (data.web?.results ?? []).map((r: any) => ({
      title: r.title ?? '',
      url: r.url ?? '',
      description: r.description ?? '',
    }));

    return { results, query };
  } catch {
    return { results: [], query };
  }
}

export async function searchFishingSpots(
  location: string,
  species?: string,
): Promise<SearchResponse> {
  const speciesFilter = species ? ` for ${species}` : '';
  return braveSearch(`best fishing spots near ${location}${speciesFilter}`, 8);
}

export async function searchBaitShops(location: string): Promise<SearchResponse> {
  return braveSearch(`bait and tackle shops near ${location}`, 5);
}

export async function searchSpeciesInfo(speciesName: string): Promise<SearchResponse> {
  return braveSearch(`${speciesName} fishing tips habitat behavior`, 5);
}

export async function searchRegulations(
  state: string,
  species?: string,
): Promise<SearchResponse> {
  const speciesQuery = species ? ` ${species}` : '';
  return braveSearch(`${state} fishing regulations${speciesQuery} 2025 2026`, 5);
}

export async function searchLocalFishingReport(
  location: string,
): Promise<SearchResponse> {
  return braveSearch(`fishing report ${location} this week`, 5);
}

export async function searchFishingTechniques(
  species: string,
  waterType?: string,
): Promise<SearchResponse> {
  const water = waterType ? ` in ${waterType}` : '';
  return braveSearch(`how to catch ${species}${water} best techniques baits`, 5);
}
