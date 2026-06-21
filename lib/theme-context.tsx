import React, { createContext, useContext, useEffect, useState, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkColors, type ThemePreference, type ThemeMode } from './theme';

const STORAGE_KEY = 'fishbook_theme_preference';

interface ThemeContextValue {
  preference: ThemePreference;
  mode: ThemeMode;
  colors: typeof lightColors;
  setPreference: (pref: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('auto');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored === 'light' || stored === 'dark' || stored === 'auto') {
          setPreferenceState(stored);
        }
      } catch {}
      setLoaded(true);
    })();
  }, []);

  const setPreference = async (pref: ThemePreference) => {
    setPreferenceState(pref);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, pref);
    } catch {}
  };

  const mode: ThemeMode = useMemo(() => {
    if (preference === 'auto') {
      return systemScheme === 'dark' ? 'dark' : 'light';
    }
    return preference;
  }, [preference, systemScheme]);

  const colors = useMemo(() => (mode === 'dark' ? darkColors : lightColors), [mode]);

  if (!loaded) return null;

  return (
    <ThemeContext.Provider value={{ preference, mode, colors, setPreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      preference: 'auto' as ThemePreference,
      mode: 'light' as ThemeMode,
      colors: lightColors,
      setPreference: () => {},
    };
  }
  return ctx;
}
