import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getTackleAdvice, getConditionsSummary, type TackleRecommendation } from '@/lib/tackle-advisor';
import { colors } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';

interface TackleSuggestionProps {
  speciesName: string;
  tempC?: number;
  windKph?: number;
}

const priorityColors: Record<string, string> = {
  primary: colors.primary,
  secondary: colors.success,
  situational: colors.warning,
};

const priorityLabels: Record<string, string> = {
  primary: 'Go-To',
  secondary: 'Alternate',
  situational: 'Situational',
};

export default function TackleSuggestion({ speciesName, tempC, windKph }: TackleSuggestionProps) {

  const { colors } = useTheme();
  const hour = new Date().getHours();

  const recommendations = useMemo(
    () => getTackleAdvice(speciesName, tempC, windKph, hour),
    [speciesName, tempC, windKph, hour],
  );

  const conditions = useMemo(
    () => getConditionsSummary(tempC ?? 22, windKph ?? 10, hour),
    [tempC, windKph, hour],
  );

  if (!speciesName) return null;

  return (
    <View style={styles.container} accessibilityLabel={`Tackle suggestions for ${speciesName}`} accessibilityRole="summary">
      <View style={styles.header}>
        <Ionicons name="fish" size={18} color={colors.primary} />
        <Text style={styles.title}>What to Throw</Text>
      </View>

      <View style={styles.conditionsRow}>
        <Ionicons name={conditions.icon as keyof typeof Ionicons.glyphMap} size={14} color={colors.textSecondary} />
        <Text style={styles.conditionsText}>{conditions.label}</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.cardsRow}
      >
        {recommendations.map((rec, i) => (
          <View key={i} style={[styles.card, { borderLeftColor: priorityColors[rec.priority] }]}>
            <View style={[styles.priorityBadge, { backgroundColor: priorityColors[rec.priority] }]}>
              <Text style={styles.priorityText}>{priorityLabels[rec.priority]}</Text>
            </View>
            <Text style={styles.lureName}>{rec.lure_name}</Text>
            <Text style={styles.lureType}>{rec.lure_type} · {rec.color}</Text>
            <View style={styles.techniqueRow}>
              <Ionicons name="flash-outline" size={12} color={colors.textSecondary} />
              <Text style={styles.technique}>{rec.technique}</Text>
            </View>
            <Text style={styles.reason}>{rec.reason}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  conditionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 8,
  },
  conditionsText: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
  },
  cardsRow: {
    gap: 10,
    paddingRight: 8,
  },
  card: {
    width: 160,
    backgroundColor: colors.cardSurface,
    borderRadius: 10,
    padding: 10,
    borderLeftWidth: 3,
  },
  priorityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 6,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textOnPrimary,
    textTransform: 'uppercase',
  },
  lureName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  lureType: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  techniqueRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    marginTop: 6,
  },
  technique: {
    fontSize: 11,
    color: colors.textBody,
    flex: 1,
  },
  reason: {
    fontSize: 10,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
  },
});
