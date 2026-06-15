import React from 'react';
import { ScrollView, Text, StyleSheet, SafeAreaView, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function PrivacyPolicyScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={styles.backButton} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.lastUpdated}>Last updated: June 15, 2026</Text>

        <Text style={styles.heading}>1. Information We Collect</Text>
        <Text style={styles.paragraph}>
          FishBook collects the following information to provide and improve our fishing companion service:
        </Text>
        <Text style={styles.bullet}>• Account information: email address, username, display name</Text>
        <Text style={styles.bullet}>• Catch data: fish photos, species identification, weight, length, location coordinates, date/time, weather conditions, notes</Text>
        <Text style={styles.bullet}>• Device information: device type, operating system, app version</Text>
        <Text style={styles.bullet}>• Location data: GPS coordinates when logging catches (only when actively using the app)</Text>

        <Text style={styles.heading}>2. How We Use Your Information</Text>
        <Text style={styles.paragraph}>We use your information to:</Text>
        <Text style={styles.bullet}>• Provide fish species identification via AI (iNaturalist API)</Text>
        <Text style={styles.bullet}>• Estimate fish weight from length measurements</Text>
        <Text style={styles.bullet}>• Display your catch history and statistics</Text>
        <Text style={styles.bullet}>• Show community fishing activity heatmaps (anonymized, grid-based)</Text>
        <Text style={styles.bullet}>• Provide weather-based fishing forecasts</Text>
        <Text style={styles.bullet}>• Track achievements and tournament participation</Text>

        <Text style={styles.heading}>3. Data Sharing</Text>
        <Text style={styles.paragraph}>
          We do not sell your personal data. We share data only in the following circumstances:
        </Text>
        <Text style={styles.bullet}>• iNaturalist API: Fish photos are sent for species identification. iNaturalist's privacy policy applies to this data.</Text>
        <Text style={styles.bullet}>• Community Heatmap: Catch locations are aggregated into anonymized 2km grid cells. No individual catch locations are exposed. A minimum of 2 anglers and 3 catches per cell is required before data appears.</Text>
        <Text style={styles.bullet}>• OpenWeatherMap: Your GPS coordinates are sent to provide weather forecasts. OpenWeatherMap's privacy policy applies.</Text>
        <Text style={styles.bullet}>• Supabase: All data is stored on Supabase infrastructure. Supabase's privacy policy applies.</Text>

        <Text style={styles.heading}>4. Data Storage and Security</Text>
        <Text style={styles.paragraph}>
          Your data is stored on Supabase (PostgreSQL) with Row Level Security enabled. Each user can only access their own data. Authentication tokens are stored in secure device storage (iOS Keychain / Android Keystore). Catch photos are stored in Supabase Storage with public read access for sharing.
        </Text>

        <Text style={styles.heading}>5. Data Retention</Text>
        <Text style={styles.paragraph}>
          Your catch data is retained as long as your account is active. You may delete individual catches or your entire account at any time. When you delete your account, all personal data is permanently removed.
        </Text>

        <Text style={styles.heading}>6. Your Rights</Text>
        <Text style={styles.paragraph}>You have the right to:</Text>
        <Text style={styles.bullet}>• Access all your stored data</Text>
        <Text style={styles.bullet}>• Export your catch data as CSV</Text>
        <Text style={styles.bullet}>• Delete individual catches</Text>
        <Text style={styles.bullet}>• Delete your entire account and all associated data</Text>
        <Text style={styles.bullet}>• Opt out of community heatmap contributions (use catch & release mode)</Text>

        <Text style={styles.heading}>7. Children's Privacy</Text>
        <Text style={styles.paragraph}>
          FishBook is not intended for children under 13. We do not knowingly collect personal information from children under 13.
        </Text>

        <Text style={styles.heading}>8. Changes to This Policy</Text>
        <Text style={styles.paragraph}>
          We may update this privacy policy from time to time. We will notify you of any changes by updating the "Last updated" date and, for significant changes, through an in-app notification.
        </Text>

        <Text style={styles.heading}>9. Contact Us</Text>
        <Text style={styles.paragraph}>
          If you have questions about this privacy policy, please contact us at privacy@fishbook.app
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E5EA' },
  backButton: { width: 40 },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#1C1C1E' },
  content: { padding: 16, paddingBottom: 40 },
  lastUpdated: { fontSize: 13, color: '#8E8E93', marginBottom: 20 },
  heading: { fontSize: 18, fontWeight: '700', color: '#1C1C1E', marginTop: 20, marginBottom: 8 },
  paragraph: { fontSize: 15, color: '#3C3C43', lineHeight: 22, marginBottom: 8 },
  bullet: { fontSize: 15, color: '#3C3C43', lineHeight: 22, paddingLeft: 8, marginBottom: 4 },
});
