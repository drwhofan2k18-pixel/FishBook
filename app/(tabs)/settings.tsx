import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth-context';
import { useTranslation, languageNames } from '@/i18n';
import { useUnitStore, type WeightUnit, type LengthUnit, type TemperatureUnit } from '@/lib/units';
import { isModelDownloaded, deleteModel, onDownloadProgress, type DownloadProgress } from '@/lib/model-downloader';
import { downloadOnDeviceModel } from '@/lib/ondevice-id';
import { exportAndShareCSV } from '@/lib/export-data';
import { requestNotificationPermission, cancelAllNotifications } from '@/lib/notifications';
import { router } from 'expo-router';

export default function SettingsScreen() {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const { t, language, setLanguage, supportedLanguages } = useTranslation();
  const units = useUnitStore();
  const [modelDownloaded, setModelDownloaded] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [notifEnabled, setNotifEnabled] = useState(false);

  useEffect(() => {
    isModelDownloaded().then(setModelDownloaded);
    units.loadPreferences();
    const unsub = onDownloadProgress((p: DownloadProgress) => {
      setDownloadProgress(p.percent);
    });
    return () => { unsub(); };
  }, []);

  const handleDownloadModel = async () => {
    setDownloading(true);
    setDownloadProgress(0);
    const success = await downloadOnDeviceModel();
    setDownloading(false);
    setModelDownloaded(success);
    if (success) {
      Alert.alert('Model Downloaded', 'On-device fish identification is now available offline.');
    } else {
      Alert.alert('Download Failed', 'Could not download model. Ensure EXPO_PUBLIC_TFLITE_MODEL_URL is set.');
    }
  };

  const handleDeleteModel = async () => {
    Alert.alert('Delete Model', 'Remove the on-device AI model? (~5MB)', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await deleteModel();
          setModelDownloaded(false);
        },
      },
    ]);
  };

  const handleToggleNotifications = async () => {
    if (notifEnabled) {
      await cancelAllNotifications();
      setNotifEnabled(false);
    } else {
      const granted = await requestNotificationPermission();
      setNotifEnabled(granted);
      if (!granted) {
        Alert.alert('Permission Denied', 'Enable notifications in device settings.');
      }
    }
  };

  const handleExportCSV = async () => {
    if (!userId) return;
    const success = await exportAndShareCSV(userId);
    if (!success) Alert.alert('Export Failed', 'No catches to export.');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.screenTitle}>Settings</Text>

        <Text style={styles.sectionLabel}>Language</Text>
        <View style={styles.card}>
          {supportedLanguages.map((lang, i) => (
            <React.Fragment key={lang}>
              <TouchableOpacity style={styles.row} onPress={() => setLanguage(lang)}>
                <Text style={styles.rowLabel}>{languageNames[lang] ?? lang}</Text>
                {language === lang && <Ionicons name="checkmark" size={20} color="#007AFF" />}
              </TouchableOpacity>
              {i < supportedLanguages.length - 1 && <View style={styles.divider} />}
            </React.Fragment>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Units</Text>
        <View style={styles.card}>
          <UnitRow
            label="Weight"
            options={['kg', 'lb']}
            current={units.weight}
            onChange={(v) => units.setWeight(v as WeightUnit)}
          />
          <View style={styles.divider} />
          <UnitRow
            label="Length"
            options={['cm', 'in']}
            current={units.length}
            onChange={(v) => units.setLength(v as LengthUnit)}
          />
          <View style={styles.divider} />
          <UnitRow
            label="Temperature"
            options={['c', 'f']}
            current={units.temperature}
            onChange={(v) => units.setTemperature(v as TemperatureUnit)}
          />
        </View>

        <Text style={styles.sectionLabel}>AI Model</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="cube-outline" size={20} color="#007AFF" />
              <Text style={styles.rowLabel}>On-Device Fish ID</Text>
            </View>
            <Text style={styles.rowValue}>
              {modelDownloaded ? 'Downloaded' : 'Not downloaded'}
            </Text>
          </View>
          {downloading && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${downloadProgress * 100}%` }]} />
              </View>
              <Text style={styles.progressText}>{Math.round(downloadProgress * 100)}%</Text>
            </View>
          )}
          <View style={styles.divider} />
          {modelDownloaded ? (
            <TouchableOpacity style={styles.row} onPress={handleDeleteModel}>
              <Ionicons name="trash-outline" size={20} color="#FF3B30" />
              <Text style={[styles.rowLabel, { color: '#FF3B30' }]}>Delete Model</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.row} onPress={handleDownloadModel} disabled={downloading}>
              <Ionicons name="download-outline" size={20} color="#007AFF" />
              <Text style={[styles.rowLabel, { color: '#007AFF' }]}>
                {downloading ? 'Downloading...' : 'Download Model (~5MB)'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.sectionLabel}>Notifications</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.row} onPress={handleToggleNotifications}>
            <View style={styles.rowLeft}>
              <Ionicons name="notifications-outline" size={20} color="#007AFF" />
              <Text style={styles.rowLabel}>Push Notifications</Text>
            </View>
            <Ionicons
              name={notifEnabled ? 'toggle' : 'toggle-outline'}
              size={32}
              color={notifEnabled ? '#34C759' : '#C7C7CC'}
            />
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>Data</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.row} onPress={handleExportCSV}>
            <View style={styles.rowLeft}>
              <Ionicons name="download-outline" size={20} color="#007AFF" />
              <Text style={styles.rowLabel}>Export Catches (CSV)</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>Legal</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.row} onPress={() => router.push('/privacy-policy')}>
            <View style={styles.rowLeft}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#007AFF" />
              <Text style={styles.rowLabel}>Privacy Policy</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.row} onPress={() => router.push('/terms-of-service')}>
            <View style={styles.rowLeft}>
              <Ionicons name="document-text-outline" size={20} color="#007AFF" />
              <Text style={styles.rowLabel}>Terms of Service</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>FishBook v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function UnitRow({
  label,
  options,
  current,
  onChange,
}: {
  label: string;
  options: string[];
  current: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.unitRow}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.unitOptions}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt}
            style={[styles.unitOption, current === opt && styles.unitOptionActive]}
            onPress={() => onChange(opt)}
          >
            <Text style={[styles.unitOptionText, current === opt && styles.unitOptionTextActive]}>
              {opt.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  scrollContent: { padding: 16 },
  screenTitle: { fontSize: 28, fontWeight: '700', color: '#1C1C1E', marginBottom: 20 },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: '#8E8E93', textTransform: 'uppercase', marginBottom: 8, marginTop: 20, marginLeft: 4 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowLabel: { fontSize: 16, color: '#1C1C1E' },
  rowValue: { fontSize: 14, color: '#8E8E93' },
  divider: { height: 1, backgroundColor: '#F2F2F7', marginLeft: 52 },
  unitRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  unitOptions: { flexDirection: 'row', gap: 4 },
  unitOption: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, backgroundColor: '#E5E5EA' },
  unitOptionActive: { backgroundColor: '#007AFF' },
  unitOptionText: { fontSize: 13, fontWeight: '600', color: '#8E8E93' },
  unitOptionTextActive: { color: '#FFFFFF' },
  progressContainer: { paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressBar: { flex: 1, height: 6, backgroundColor: '#E5E5EA', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#007AFF', borderRadius: 3 },
  progressText: { fontSize: 12, color: '#8E8E93', width: 36, textAlign: 'right' },
  version: { textAlign: 'center', fontSize: 13, color: '#C7C7CC', marginTop: 24, marginBottom: 40 },
});
