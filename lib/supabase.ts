import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Supabase URL and anon key - these must be set via environment variables
// or configured in the Supabase dashboard
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/**
 * Cross-platform storage adapter for Supabase auth.
 * Uses SecureStore on native (keychain/keystore) and AsyncStorage on web.
 */
const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    if (Platform.OS === 'web') {
      return AsyncStorage.getItem(key);
    }
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    if (Platform.OS === 'web') {
      return AsyncStorage.setItem(key, value);
    }
    await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string) => {
    if (Platform.OS === 'web') {
      return AsyncStorage.removeItem(key);
    }
    await SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/**
 * Helper to build a typed Supabase client.
 * Use with `import { supabase } from '@/lib/supabase'` after
 * generating types via `supabase gen types typescript --linked`.
 */
export type Database = Record<string, never>; // Placeholder - replace with generated types

export async function uploadCatchPhoto(
  userId: string,
  localUri: string,
): Promise<{ url: string; thumbnailUrl: string; error: string | null }> {
  try {
    const fileName = `${userId}/catches/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;

    const response = await fetch(localUri);
    const blob = await response.blob();

    const { data, error } = await supabase.storage
      .from('catch-photos')
      .upload(fileName, blob, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (error) {
      return { url: '', thumbnailUrl: '', error: `Upload failed: ${error.message}` };
    }

    const { data: urlData } = supabase.storage
      .from('catch-photos')
      .getPublicUrl(data.path);

    return {
      url: urlData.publicUrl,
      thumbnailUrl: urlData.publicUrl,
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { url: '', thumbnailUrl: '', error: `Upload failed: ${message}` };
  }
}
