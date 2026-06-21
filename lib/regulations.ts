import { supabase } from './supabase';
import { colors } from './theme';

export interface Regulation {
  id: number;
  zone: string;
  species_name: string;
  scientific_name: string | null;
  min_length_cm: number | null;
  max_length_cm: number | null;
  daily_limit: number | null;
  season_open_month: number | null;
  season_close_month: number | null;
  special_rules: string | null;
  source: string | null;
}

export type ComplianceStatus = 'legal' | 'too_small' | 'too_large' | 'over_limit' | 'out_of_season' | 'unknown';

export interface ComplianceResult {
  status: ComplianceStatus;
  keepable: boolean;
  message: string;
  regulation: Regulation | null;
  icon: string;
  color: string;
}

const DEFAULT_ZONE = 'general';

function getCurrentMonth(): number {
  return new Date().getMonth() + 1;
}

function isInSeason(reg: Regulation): boolean {
  if (!reg.season_open_month || !reg.season_close_month) return true;
  const month = getCurrentMonth();
  if (reg.season_open_month <= reg.season_close_month) {
    return month >= reg.season_open_month && month <= reg.season_close_month;
  }
  return month >= reg.season_open_month || month <= reg.season_close_month;
}

export function checkCompliance(
  speciesName: string,
  lengthCm: number | null,
  dailyCount: number,
  regulation: Regulation | null,
): ComplianceResult {
  if (!regulation) {
    return {
      status: 'unknown',
      keepable: true,
      message: 'No regulation data available for this species in your area. Check local rules.',
      regulation: null,
      icon: 'help-circle-outline',
      color: colors.textSecondary,
    };
  }

  if (!isInSeason(regulation)) {
    return {
      status: 'out_of_season',
      keepable: false,
      message: `Season closed. Open ${getMonthName(regulation.season_open_month!)} - ${getMonthName(regulation.season_close_month!)}. Catch & release only.`,
      regulation,
      icon: 'calendar-outline',
      color: colors.danger,
    };
  }

  if (lengthCm != null && regulation.min_length_cm != null && lengthCm < regulation.min_length_cm) {
    return {
      status: 'too_small',
      keepable: false,
      message: `Below minimum size (${regulation.min_length_cm} cm). Must be released.`,
      regulation,
      icon: 'resize-outline',
      color: colors.danger,
    };
  }

  if (lengthCm != null && regulation.max_length_cm != null && lengthCm > regulation.max_length_cm) {
    return {
      status: 'too_large',
      keepable: false,
      message: `Above maximum slot size (${regulation.max_length_cm} cm). Must be released (trophy fish).`,
      regulation,
      icon: 'resize-outline',
      color: colors.warning,
    };
  }

  if (regulation.daily_limit != null && dailyCount >= regulation.daily_limit) {
    return {
      status: 'over_limit',
      keepable: false,
      message: `Daily limit reached (${regulation.daily_limit}/day). Catch & release only.`,
      regulation,
      icon: 'alert-circle-outline',
      color: colors.danger,
    };
  }

  return {
    status: 'legal',
    keepable: true,
    message: regulation.daily_limit
      ? `Legal to keep. ${dailyCount}/${regulation.daily_limit} daily limit.`
      : 'Legal to keep.',
    regulation,
    icon: 'checkmark-circle',
    color: colors.success,
  };
}

function getMonthName(month: number): string {
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return names[month - 1] ?? '';
}

export async function getRegulation(speciesName: string, zone?: string): Promise<Regulation | null> {
  const targetZone = zone ?? DEFAULT_ZONE;

  const { data } = await supabase
    .from('regulations')
    .select('*')
    .or(`species_name.ilike.%${speciesName}%,common_name.ilike.%${speciesName}%`)
    .or(`zone.eq.${targetZone},zone.eq.general`)
    .limit(1)
    .maybeSingle();

  return data as Regulation | null;
}

export async function getAllRegulations(zone?: string): Promise<Regulation[]> {
  const targetZone = zone ?? DEFAULT_ZONE;

  const { data } = await supabase
    .from('regulations')
    .select('*')
    .or(`zone.eq.${targetZone},zone.eq.general`)
    .order('species_name');

  return (data ?? []) as Regulation[];
}

export async function getDailyCatchCount(userId: string, speciesName: string): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from('catches')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_released', false)
    .gte('caught_at', today.toISOString());

  return count ?? 0;
}
