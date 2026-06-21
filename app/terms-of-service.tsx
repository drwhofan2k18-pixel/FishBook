import { ScrollView, Text, StyleSheet, SafeAreaView, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';

export default function TermsOfServiceScreen() {

  const { colors } = useTheme();
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={styles.backButton} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.lastUpdated}>Last updated: June 15, 2026</Text>

        <Text style={styles.heading}>1. Acceptance of Terms</Text>
        <Text style={styles.paragraph}>
          By using FishBook, you agree to these Terms of Service. If you do not agree, do not use the app.
        </Text>

        <Text style={styles.heading}>2. Description of Service</Text>
        <Text style={styles.paragraph}>
          FishBook is a fishing companion app that provides catch logging, AI-powered fish species identification, weather forecasts, fishing regulations reference, tackle recommendations, community heatmaps, and tournament management.
        </Text>

        <Text style={styles.heading}>3. User Accounts</Text>
        <Text style={styles.paragraph}>
          You are responsible for maintaining the security of your account. You must provide a valid email address. You are responsible for all activity that occurs under your account.
        </Text>

        <Text style={styles.heading}>4. User Content</Text>
        <Text style={styles.paragraph}>
          You retain ownership of your catch photos and data. By uploading content, you grant FishBook a license to store, process, and display your content within the app. Community heatmap data is aggregated and anonymized — no individual catch locations are shared.
        </Text>

        <Text style={styles.heading}>5. AI Species Identification</Text>
        <Text style={styles.paragraph}>
          Fish species identification is provided as a guide only. AI identification may not be 100% accurate. Always verify species identification before making harvest decisions. FishBook is not responsible for misidentification.
        </Text>

        <Text style={styles.heading}>6. Fishing Regulations</Text>
        <Text style={styles.paragraph}>
          FishBook provides general fishing regulations as a reference. Regulations may not reflect the most current local rules. Always check official government sources for current regulations before fishing. FishBook is not responsible for regulatory violations.
        </Text>

        <Text style={styles.heading}>7. Weather and Bite Forecasts</Text>
        <Text style={styles.paragraph}>
          Weather data and bite forecasts are provided for informational purposes only. Forecasts may not be accurate. Always check official weather services and exercise caution when fishing in adverse conditions.
        </Text>

        <Text style={styles.heading}>8. Tournaments</Text>
        <Text style={styles.paragraph}>
          Tournament hosts are responsible for verifying catch legitimacy and resolving disputes. FishBook provides automated scoring tools but does not moderate tournaments. Participants must follow all applicable fishing regulations.
        </Text>

        <Text style={styles.heading}>9. Prohibited Uses</Text>
        <Text style={styles.paragraph}>You may not:</Text>
        <Text style={styles.bullet}>• Upload false or misleading catch data</Text>
        <Text style={styles.bullet}>• Use the app to facilitate illegal fishing</Text>
        <Text style={styles.bullet}>• Attempt to access other users' data</Text>
        <Text style={styles.bullet}>• Use automated tools to scrape or extract data</Text>
        <Text style={styles.bullet}>• Harass or abuse other users in tournaments</Text>

        <Text style={styles.heading}>10. Limitation of Liability</Text>
        <Text style={styles.paragraph}>
          FishBook is provided "as is" without warranties. We are not liable for any damages arising from use of the app, including but not limited to: misidentified fish, incorrect regulations, inaccurate weather forecasts, or tournament disputes.
        </Text>

        <Text style={styles.heading}>11. Termination</Text>
        <Text style={styles.paragraph}>
          We may suspend or terminate your account if you violate these terms. You may delete your account at any time through the app settings.
        </Text>

        <Text style={styles.heading}>12. Changes to Terms</Text>
        <Text style={styles.paragraph}>
          We may modify these terms at any time. Continued use of FishBook after changes constitutes acceptance of the new terms.
        </Text>

        <Text style={styles.heading}>13. Contact</Text>
        <Text style={styles.paragraph}>
          Questions about these terms? Contact us at legal@fishbook.app
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.divider },
  backButton: { width: 40 },
  headerTitle: { fontSize: 17, fontWeight: '600', color: colors.textPrimary },
  content: { padding: 16, paddingBottom: 40 },
  lastUpdated: { fontSize: 13, color: colors.textSecondary, marginBottom: 20 },
  heading: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginTop: 20, marginBottom: 8 },
  paragraph: { fontSize: 15, color: colors.textBody, lineHeight: 22, marginBottom: 8 },
  bullet: { fontSize: 15, color: colors.textBody, lineHeight: 22, paddingLeft: 8, marginBottom: 4 },
});
