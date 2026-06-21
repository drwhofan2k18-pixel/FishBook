/**
 * FishBook Design System — Colors, Typography, Spacing
 * All screens/components MUST import colors from here.
 * NEVER use raw hex values in StyleSheet or inline styles.
 */

export type ColorTokens = {
  primary: string;
  background: string;
  surface: string;
  divider: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textOnPrimary: string;
  textBody: string;
  success: string;
  danger: string;
  warning: string;
  accent: string;
  accentAlt: string;
  heatmapLow: string;
  heatmapMed: string;
  heatmapHigh: string;
  infoBg: string;
  infoText: string;
  positiveBg: string;
  positiveText: string;
  gold: string;
  goldDark: string;
  goldAccent: string;
  pink: string;
  purple: string;
  cardSurface: string;
  chipBg: string;
  overlay: string;
  overlayLight: string;
  cardBg: string;
  shadow: string;
  black: string;
  white: string;
  transparent: string;
};

export const lightColors: ColorTokens = {
  primary: '#007AFF',
  background: '#FFFFFF',
  surface: '#F2F2F7',
  divider: '#E5E5EA',
  textPrimary: '#1C1C1E',
  textSecondary: '#8E8E93',
  textTertiary: '#C7C7CC',
  textOnPrimary: '#FFFFFF',
  textBody: '#3C3C43',
  success: '#34C759',
  danger: '#FF3B30',
  warning: '#FF9500',
  accent: '#89f972',
  accentAlt: '#41f551',
  heatmapLow: '#727a0b',
  heatmapMed: '#47a259',
  heatmapHigh: '#290bcc',
  infoBg: '#FFF3E0',
  infoText: '#E65100',
  positiveBg: '#E8F5E9',
  positiveText: '#2E7D32',
  gold: '#FFD60A',
  goldDark: '#B8860B',
  goldAccent: '#FFD700',
  pink: '#FF2D55',
  purple: '#AF52DE',
  cardSurface: '#FAFAFA',
  chipBg: '#E8F0FE',
  overlay: 'rgba(0,0,0,0.6)',
  overlayLight: 'rgba(0,0,0,0.3)',
  cardBg: '#E8F0FE',
  shadow: '#000000',
  black: '#000000',
  white: '#FFFFFF',
  transparent: 'transparent',
};

export const darkColors: ColorTokens = {
  primary: '#0A84FF',
  background: '#000000',
  surface: '#1C1C1E',
  divider: '#38383A',
  textPrimary: '#FFFFFF',
  textSecondary: '#98989F',
  textTertiary: '#636366',
  textOnPrimary: '#FFFFFF',
  textBody: '#E5E5EA',
  success: '#30D158',
  danger: '#FF453A',
  warning: '#FF9F0A',
  accent: '#89f972',
  accentAlt: '#41f551',
  heatmapLow: '#8a9133',
  heatmapMed: '#5fb370',
  heatmapHigh: '#5240d4',
  infoBg: '#3A2A14',
  infoText: '#FFB74D',
  positiveBg: '#1B3A1F',
  positiveText: '#81C784',
  gold: '#FFD60A',
  goldDark: '#E5C100',
  goldAccent: '#FFD700',
  pink: '#FF375F',
  purple: '#BF5AF2',
  cardSurface: '#2C2C2E',
  chipBg: '#1E3A5F',
  overlay: 'rgba(0,0,0,0.7)',
  overlayLight: 'rgba(0,0,0,0.4)',
  cardBg: '#1E3A5F',
  shadow: '#000000',
  black: '#000000',
  white: '#FFFFFF',
  transparent: 'transparent',
};

export const colors = lightColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  hero: 32,
} as const;

export type ColorKey = keyof ColorTokens;
export type SpacingKey = keyof typeof spacing;
export type ThemeMode = 'light' | 'dark';
export type ThemePreference = 'auto' | 'light' | 'dark';
