import { Linking } from 'react-native';
import { router } from 'expo-router';

const SCHEME = 'fishbook';

export function generateCatchLink(catchId: string): string {
  return `${SCHEME}://catch/${catchId}`;
}

export function generateSpeciesLink(speciesId: number): string {
  return `${SCHEME}://species/${speciesId}`;
}

export function generateTournamentLink(tournamentId: string): string {
  return `${SCHEME}://tournament/${tournamentId}`;
}

export async function handleDeepLink(url: string): Promise<boolean> {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/^\//, '');

    if (path.startsWith('catch/')) {
      const id = path.replace('catch/', '');
      router.push(`/catch/${id}`);
      return true;
    }

    if (path.startsWith('species/')) {
      const id = path.replace('species/', '');
      router.push(`/species/${id}`);
      return true;
    }

    if (path.startsWith('tournament/')) {
      const id = path.replace('tournament/', '');
      router.push(`/(tabs)/tournaments`);
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

export function initDeepLinking() {
  Linking.getInitialURL().then((url) => {
    if (url) handleDeepLink(url);
  });

  const subscription = Linking.addEventListener('url', ({ url }) => {
    handleDeepLink(url);
  });

  return () => subscription.remove();
}

export async function shareDeepLink(
  type: 'catch' | 'species' | 'tournament',
  id: string,
  title: string,
): Promise<void> {
  const { Share } = require('react-native');
  let url = '';
  switch (type) {
    case 'catch': url = generateCatchLink(id); break;
    case 'species': url = generateSpeciesLink(parseInt(id, 10)); break;
    case 'tournament': url = generateTournamentLink(id); break;
  }
  await Share.share({ message: `${title}\n${url}`, url, title });
}
