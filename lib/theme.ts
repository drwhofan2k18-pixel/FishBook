/**
 * FishBook Design System — Colors, Typography, Spacing
 *
 * All screens/components MUST import colors from here.
 * NEVER use raw hex values in StyleSheet or inline styles.
 */

export const colors = {
  // ── Core ──────────────────────────────────────────────
  primary: '#007AFF',       // iOS system blue — buttons, links, active states
  background: '#FFFFFF',    // Screen background
  surface: '#F2F2F7',       // Cards, section backgrounds
  divider: '#E5E5EA',       // Borders, separators

  // ── Text ─────────────────────────────────────────────
  textPrimary: '#1C1C1E',   // Main body text
  textSecondary: '#8E8E93', // Captions, hints, disabled text
  textTertiary: '#C7C7CC',  // Placeholder, very subtle labels
  textOnPrimary: '#FFFFFF', // Text on colored backgrounds

  // ── Semantic ─────────────────────────────────────────
  success: '#34C759',       // Catches, confirmations, positive stats
  danger: '#FF3B30',        // Errors, delete, over-limit warnings
  warning: '#FF9500',       // Caution, approaching limits
  accent: '#89f972',        // Gamification highlights, achievements
  accentAlt: '#41f551',     // Secondary accent (alternating chart bars)

  // ── Heatmap Gradient ────────────────────────────────
  heatmapLow: '#727a0b',    // Low catch density
  heatmapMed: '#47a259',    // Medium catch density
  heatmapHigh: '#290bcc',   // High catch density

  // ── Text Extended ─────────────────────────────────────
  textBody: '#3C3C43',       // Body text, descriptions (between primary & secondary)

  // ── Surface Extended ─────────────────────────────────
  cardSurface: '#FAFAFA',    // Inner card backgrounds (nested within white cards)
  chipBg: '#E8F0FE',         // Chip/icon circle backgrounds (light blue tint)

  // ── Chart ────────────────────────────────────────────
  chartBar1: '#007AFF',
  chartBar2: '#41f551',

  // ── Overlay ──────────────────────────────────────────
  overlay: 'rgba(0,0,0,0.6)',       // Dark overlay (modals, coach marks)
  overlayLight: 'rgba(0,0,0,0.3)',  // Light overlay (image preview)
  cardBg: '#E8F0FE',                // Light blue card background

  // ── Extended Semantic ─────────────────────────────────
  infoBg: '#FFF3E0',         // Info card backgrounds (light orange)
  infoText: '#E65100',       // Info card text (dark orange)
  positiveBg: '#E8F5E9',    // Positive/compliant backgrounds (light green)
  positiveText: '#2E7D32',  // Positive/compliant text (dark green)
  gold: '#FFD60A',           // Gold — achievements, ratings, premium
  goldDark: '#B8860B',       // Dark gold — subtitles on gold
  goldAccent: '#FFD700',     // Gold accent — trophy/stars
  pink: '#FF2D55',           // Pink — sport/entertainment tags
  purple: '#AF52DE',         // Purple — specialty/premium tags

  // ── Shadow ───────────────────────────────────────────
  shadow: '#000000',

  // ── Utility ──────────────────────────────────────────
  black: '#000000',
  white: '#FFFFFF',
  transparent: 'transparent',
} as const;

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

export type ColorKey = keyof typeof colors;
export type SpacingKey = keyof typeof spacing;
