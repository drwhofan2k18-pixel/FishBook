import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { getUserStats, getRecentCatches } from '@/lib/stats-aggregation';
import { getCurrentWeather, type WeatherConditions, fishingRatingColor, fishingRatingLabel } from '@/lib/weather';
import { getCurrentPosition } from '@/lib/location';
import { generateBiteForecast, type DayBiteForecast } from '@/lib/bite-forecast';
import { getNearestWaterConditions, type WaterConditions } from '@/lib/usgs-water';
import { getNearestTideStation, getTidePredictions, getNextTide, type TidePrediction, isNearCoast } from '@/lib/noaa-tides';
import { getMoonPhase, getSolunarPeriods, isInSolunarPeriod } from '@/lib/moon-phase';
import BiteForecastWidget from '@/components/bite-forecast-widget';
import { colors } from '@/lib/theme';

export default function HomeScreen() {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const username = (user?.user_metadata as Record<string, string> | undefined)?.username ?? 'Angler';
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getUserStats>> | null>(null);
  const [recentCatches, setRecentCatches] = useState<Awaited<ReturnType<typeof getRecentCatches>>>([]);
  const [weather, setWeather] = useState<WeatherConditions | null>(null);
  const [biteForecast, setBiteForecast] = useState<DayBiteForecast[]>([]);
  const [waterConditions, setWaterConditions] = useState<WaterConditions | null>(null);
  const [nextTide, setNextTide] = useState<TidePrediction | null>(null);
  const [moonPhase] = useState(() => getMoonPhase());
  const [solunar, setSolunar] = useState<ReturnType<typeof isInSolunarPeriod> | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    try {
      const [s, r, pos] = await Promise.all([
        getUserStats(userId),
        getRecentCatches(userId, 5),
        getCurrentPosition(),
      ]);
      setStats(s);
      setRecentCatches(r);

      if (pos) {
        const [w, bf, water] = await Promise.all([
          getCurrentWeather(pos.latitude, pos.longitude),
          generateBiteForecast(pos.latitude, pos.longitude),
          getNearestWaterConditions(pos.latitude, pos.longitude),
        ]);
        setWeather(w);
        setBiteForecast(bf);
        setWaterConditions(water);

        const sol = isInSolunarPeriod(new Date(), getSolunarPeriods(new Date(), pos.longitude));
        setSolunar(sol);

        if (isNearCoast(pos.latitude, pos.longitude)) {
          const station = await getNearestTideStation(pos.latitude, pos.longitude);
          if (station) {
            const tide = await getNextTide(station.id);
            setNextTide(tide);
          }
        }
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.welcomeSection}>
          <Text style={styles.greeting}>Welcome, {username}</Text>
          <Text style={styles.tagline}>Ready to log your next catch?</Text>
          <TouchableOpacity
            style={styles.quickLogButton}
            onPress={() => router.push('/(tabs)/camera')}
          >
            <Ionicons name="camera" size={18} color={colors.textOnPrimary} />
            <Text style={styles.quickLogText}>Quick Log</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            {weather && (
              <View style={[styles.weatherCard, { borderColor: fishingRatingColor(weather.fishing_rating) }]}>
                <View style={styles.weatherMain}>
                  <View>
                    <Text style={styles.weatherRating}>{fishingRatingLabel(weather.fishing_rating)}</Text>
                    <Text style={styles.weatherTemp}>{Math.round(weather.temp_c)}°C · {weather.sky_conditions}</Text>
                  </View>
                  <Ionicons name="sunny-outline" size={32} color="colors.gold" />
                </View>
                <View style={styles.weatherDetails}>
                  <View style={styles.weatherDetailItem}>
                    <Ionicons name="leaf-outline" size={14} color={colors.textSecondary} />
                    <Text style={styles.weatherDetailText}>{Math.round(weather.wind_kph)} km/h {weather.wind_dir}</Text>
                  </View>
                  <View style={styles.weatherDetailItem}>
                    <Ionicons name="water-outline" size={14} color={colors.textSecondary} />
                    <Text style={styles.weatherDetailText}>{weather.humidity_pct}% Humid</Text>
                  </View>
                  <View style={styles.weatherDetailItem}>
                    <Ionicons name="speedometer-outline" size={14} color={colors.textSecondary} />
                    <Text style={styles.weatherDetailText}>{weather.pressure_mb} hPa</Text>
                  </View>
                </View>
              </View>
            )}

            <BiteForecastWidget forecast={biteForecast} />

            {solunar && (
              <View style={styles.infoCard}>
                <View style={styles.infoCardHeader}>
                  <Ionicons name="moon-outline" size={20} color={colors.warning} />
                  <Text style={styles.infoCardTitle}>{moonPhase.emoji} {moonPhase.phase}</Text>
                </View>
                <View style={styles.infoCardRow}>
                  <View style={styles.infoCardItem}>
                    <Text style={styles.infoCardLabel}>Illumination</Text>
                    <Text style={styles.infoCardValue}>{Math.round(moonPhase.illumination * 100)}%</Text>
                  </View>
                  <View style={styles.infoCardItem}>
                    <Text style={styles.infoCardLabel}>Solunar</Text>
                    <Text style={[styles.infoCardValue, solunar.inMajor && { color: colors.success }]}>
                      {solunar.inMajor ? 'MAJOR' : solunar.inMinor ? 'Minor' : 'Quiet'}
                    </Text>
                  </View>
                  <View style={styles.infoCardItem}>
                    <Text style={styles.infoCardLabel}>Strength</Text>
                    <Text style={styles.infoCardValue}>{Math.round(solunar.strength * 100)}%</Text>
                  </View>
                </View>
              </View>
            )}

            {waterConditions && (
              <View style={styles.infoCard}>
                <View style={styles.infoCardHeader}>
                  <Ionicons name="water-outline" size={20} color={colors.primary} />
                  <Text style={styles.infoCardTitle}>Water — {waterConditions.site_name}</Text>
                </View>
                <View style={styles.infoCardRow}>
                  {waterConditions.water_temp_c != null && (
                    <View style={styles.infoCardItem}>
                      <Text style={styles.infoCardLabel}>Temp</Text>
                      <Text style={styles.infoCardValue}>{waterConditions.water_temp_c}°C</Text>
                    </View>
                  )}
                  {waterConditions.flow_rate_cfs != null && (
                    <View style={styles.infoCardItem}>
                      <Text style={styles.infoCardLabel}>Flow</Text>
                      <Text style={styles.infoCardValue}>{waterConditions.flow_rate_cfs} cfs</Text>
                    </View>
                  )}
                  {waterConditions.gauge_height_ft != null && (
                    <View style={styles.infoCardItem}>
                      <Text style={styles.infoCardLabel}>Gauge</Text>
                      <Text style={styles.infoCardValue}>{waterConditions.gauge_height_ft} ft</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.infoCardFooter}>Source: USGS Water Services</Text>
              </View>
            )}

            {nextTide && (
              <View style={styles.infoCard}>
                <View style={styles.infoCardHeader}>
                  <Ionicons name="boat-outline" size={20} color={colors.warning} />
                  <Text style={styles.infoCardTitle}>Next Tide</Text>
                </View>
                <View style={styles.infoCardRow}>
                  <View style={styles.infoCardItem}>
                    <Text style={styles.infoCardLabel}>Type</Text>
                    <Text style={styles.infoCardValue}>{nextTide.type === 'high' ? '🔺 High' : '🔻 Low'}</Text>
                  </View>
                  <View style={styles.infoCardItem}>
                    <Text style={styles.infoCardLabel}>Time</Text>
                    <Text style={styles.infoCardValue}>
                      {new Date(nextTide.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  <View style={styles.infoCardItem}>
                    <Text style={styles.infoCardLabel}>Height</Text>
                    <Text style={styles.infoCardValue}>{nextTide.height_m}m</Text>
                  </View>
                </View>
                <Text style={styles.infoCardFooter}>Source: NOAA Tides & Currents</Text>
              </View>
            )}

            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Ionicons name="fish-outline" size={24} color={colors.primary} />
                <Text style={styles.statNumber}>{stats?.totalCatches ?? 0}</Text>
                <Text style={styles.statLabel}>Total Catches</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="grid-outline" size={24} color={colors.success} />
                <Text style={styles.statNumber}>{stats?.uniqueSpecies ?? 0}</Text>
                <Text style={styles.statLabel}>Species</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="trophy-outline" size={24} color={colors.warning} />
                <Text style={styles.statNumber}>{stats?.biggestFishKg ? `${stats.biggestFishKg} kg` : '0 kg'}</Text>
                <Text style={styles.statLabel}>Biggest Fish</Text>
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Catches</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/library')}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>

            {recentCatches.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="fish-outline" size={48} color={colors.textTertiary} />
                <Text style={styles.emptyText}>No catches yet</Text>
                <Text style={styles.emptySubtext}>Go to the Catch tab to log your first one!</Text>
              </View>
            ) : (
              recentCatches.map((c) => {
                const species = c.species as unknown as { common_name: string } | null;
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={styles.catchCard}
                    onPress={() => router.push(`/catch/${c.id}`)}
                  >
                    <View style={styles.catchIconContainer}>
                      <Ionicons name="fish-outline" size={28} color={colors.primary} />
                    </View>
                    <View style={styles.catchInfo}>
                      <Text style={styles.catchSpecies}>{species?.common_name ?? 'Unknown'}</Text>
                      <Text style={styles.catchMeta}>
                        {c.weight_kg ? `${c.weight_kg} kg · ` : ''}
                        {c.caught_at ? new Date(c.caught_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
                  </TouchableOpacity>
                );
              })
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scrollContent: {
    padding: 16,
  },
  welcomeSection: {
    marginBottom: 16,
  },
  quickLogButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 12,
    gap: 6,
  },
  quickLogText: {
    color: colors.textOnPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  tagline: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 4,
  },
  weatherCard: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  weatherMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  weatherRating: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  weatherTemp: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  weatherDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.surface,
    paddingTop: 12,
  },
  weatherDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  weatherDetailText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  seeAllText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  catchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  catchIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.cardBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  catchInfo: {
    flex: 1,
  },
  catchSpecies: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  catchMeta: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textTertiary,
    marginTop: 4,
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  infoCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  infoCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoCardItem: {
    alignItems: 'center',
    flex: 1,
  },
  infoCardLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  infoCardValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  infoCardFooter: {
    fontSize: 10,
    color: colors.textTertiary,
    marginTop: 8,
    textAlign: 'right',
  },
});
