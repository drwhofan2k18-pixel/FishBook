import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';
import {
  type DayBiteForecast,
  type BiteForecast,
  type SpeciesBiteScore,
  getRatingColor,
  getRatingIcon,
} from '@/lib/bite-forecast';

interface BiteForecastWidgetProps {
  forecast: DayBiteForecast[];
}

export default function BiteForecastWidget({ forecast }: BiteForecastWidgetProps) {

  const { colors } = useTheme();
  if (!forecast || forecast.length === 0) return null;

  const today = forecast[0];
  if (!today) return null;

  return (
    <View style={styles.container} accessibilityLabel="Bite forecast" accessibilityRole="summary">
      <View style={styles.header}>
        <Ionicons name="flash" size={20} color={colors.warning} />
        <Text style={styles.title}>Bite Forecast</Text>
      </View>

      <View style={styles.todaySection}>
        <View style={styles.bestBanner}>
          <View style={styles.bestInfo}>
            <Text style={styles.bestLabel}>Best Window Today</Text>
            {today.best_window && (
              <>
                <Text style={styles.bestTime}>
                  {today.best_window.time_window.label}
                </Text>
                <Text style={styles.bestTemp}>
                  {today.best_window.temp_c}°C · {today.best_window.sky}
                </Text>
              </>
            )}
          </View>
          {today.best_species && (
            <View style={styles.bestSpeciesTag}>
              <Ionicons
                name={getRatingIcon(today.best_species.rating) as keyof typeof Ionicons.glyphMap}
                size={16}
                color={getRatingColor(today.best_species.rating)}
              />
              <Text style={[styles.bestSpeciesName, { color: getRatingColor(today.best_species.rating) }]}>
                {today.best_species.species_name}
              </Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.windowsRow}
      >
        {today.windows.map((w) => (
          <TimeWindowCard key={w.time_window.key} forecast={w} />
        ))}
      </ScrollView>

      {forecast.length > 1 && forecast[1] && (
        <TomorrowPreview tomorrow={forecast[1]} />
      )}
    </View>
  );
}

function TimeWindowCard({ forecast }: { forecast: BiteForecast }) {
  const top3 = forecast.species_scores.slice(0, 3);
  const ratingColor = getRatingColor(forecast.overall_rating);

  return (
    <View style={[styles.windowCard, { borderLeftColor: ratingColor }]}>
      <Text style={styles.windowTime}>{forecast.time_window.label}</Text>
      <View style={[styles.ratingBadge, { backgroundColor: ratingColor }]}>
        <Text style={styles.ratingText}>
          {forecast.overall_rating.charAt(0).toUpperCase() + forecast.overall_rating.slice(1)}
        </Text>
      </View>
      <Text style={styles.windowWeather}>
        {forecast.temp_c}°C · {forecast.wind_kph}km/h
      </Text>
      {top3.map((s) => (
        <View key={s.scientific_name} style={styles.speciesRow}>
          <View style={[styles.miniDot, { backgroundColor: getRatingColor(s.rating) }]} />
          <Text style={styles.speciesName} numberOfLines={1}>
            {s.species_name}
          </Text>
        </View>
      ))}
    </View>
  );
}

function TomorrowPreview({ tomorrow }: { tomorrow: DayBiteForecast }) {
  return (
    <View style={styles.tomorrowSection}>
      <Text style={styles.tomorrowLabel}>{tomorrow.day_label}</Text>
      {tomorrow.best_window && (
        <View style={styles.tomorrowRow}>
          <Text style={styles.tomorrowText}>
            Best: <Text style={styles.tomorrowBold}>{tomorrow.best_window.time_window.label}</Text>
          </Text>
          {tomorrow.best_species && (
            <Text style={[styles.tomorrowSpecies, { color: getRatingColor(tomorrow.best_species.rating) }]}>
              {tomorrow.best_species.species_name} — {tomorrow.best_species.rating}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  todaySection: {
    marginBottom: 14,
  },
  bestBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
  },
  bestInfo: {
    flex: 1,
  },
  bestLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  bestTime: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 2,
  },
  bestTemp: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  bestSpeciesTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 12,
  },
  bestSpeciesName: {
    fontSize: 14,
    fontWeight: '600',
  },
  windowsRow: {
    gap: 10,
    paddingBottom: 4,
  },
  windowCard: {
    width: 120,
    backgroundColor: colors.cardSurface,
    borderRadius: 10,
    padding: 10,
    borderLeftWidth: 3,
  },
  windowTime: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  ratingBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginBottom: 6,
  },
  ratingText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textOnPrimary,
    textTransform: 'uppercase',
  },
  windowWeather: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  speciesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 3,
  },
  miniDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  speciesName: {
    fontSize: 11,
    color: colors.textBody,
  },
  tomorrowSection: {
    borderTopWidth: 1,
    borderTopColor: colors.surface,
    paddingTop: 12,
    marginTop: 4,
  },
  tomorrowLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  tomorrowRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tomorrowText: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  tomorrowBold: {
    fontWeight: '700',
  },
  tomorrowSpecies: {
    fontSize: 13,
    fontWeight: '600',
  },
});
