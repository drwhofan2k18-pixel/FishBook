import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { checkCompliance, getRegulation, getDailyCatchCount, type ComplianceResult } from '@/lib/regulations';
import { useAuth } from '@/lib/auth-context';
import { colors } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';

interface RegulationBadgeProps {
  speciesName: string;
  lengthCm?: number | null;
  isReleased?: boolean;
}

export default function RegulationBadge({ speciesName, lengthCm, isReleased }: RegulationBadgeProps) {

  const { colors } = useTheme();
  const { user } = useAuth();
  const [result, setResult] = useState<ComplianceResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!speciesName || !user?.id) {
        setLoading(false);
        return;
      }

      try {
        const [reg, dailyCount] = await Promise.all([
          getRegulation(speciesName),
          getDailyCatchCount(user.id, speciesName),
        ]);

        if (!cancelled) {
          const comp = checkCompliance(speciesName, lengthCm ?? null, dailyCount, reg);
          setResult(comp);
        }
      } catch {
        if (!cancelled) {
          setResult(checkCompliance(speciesName, lengthCm ?? null, 0, null));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [speciesName, lengthCm, user?.id]);

  if (loading) {
    return (
      <View style={styles.badge}>
        <ActivityIndicator size="small" color={colors.textSecondary} />
        <Text style={styles.loadingText}>Checking regs...</Text>
      </View>
    );
  }

  if (!result) return null;

  return (
    <View style={[styles.badge, { backgroundColor: result.color + '15' }]} accessibilityLabel={result.message} accessibilityRole="summary">
      <Ionicons
        name={result.icon as keyof typeof Ionicons.glyphMap}
        size={16}
        color={result.color}
      />
      <Text style={[styles.badgeText, { color: result.color }]}>
        {result.keepable ? 'Legal to Keep' : 'Must Release'}
      </Text>
      <Text style={[styles.badgeDetail, { color: result.color }]}>
        {result.message}
      </Text>
      {result.regulation && (
        <View style={styles.regDetails}>
          {result.regulation.min_length_cm && (
            <Text style={[styles.regDetail, { color: result.color }]}>
              Min: {result.regulation.min_length_cm}cm
            </Text>
          )}
          {result.regulation.daily_limit != null && (
            <Text style={[styles.regDetail, { color: result.color }]}>
              Limit: {result.regulation.daily_limit}/day
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
  loadingText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  badgeDetail: {
    fontSize: 12,
    marginTop: 2,
    width: '100%',
  },
  regDetails: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
    width: '100%',
  },
  regDetail: {
    fontSize: 11,
    fontWeight: '500',
  },
});
