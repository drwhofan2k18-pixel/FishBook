import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  type LayoutRectangle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '@/lib/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const STORAGE_KEY = 'fishbook_coachmarks_seen';

export interface CoachStep {
  id: string;
  title: string;
  description: string;
  targetLayout?: LayoutRectangle;
  icon: keyof typeof Ionicons.glyphMap;
}

interface CoachMarkProps {
  steps: CoachStep[];
  visible: boolean;
  onComplete: () => void;
}

export default function CoachMark({ steps, visible, onComplete }: CoachMarkProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      AsyncStorage.setItem(`${STORAGE_KEY}_${steps.map(s => s.id).join('_')}`, 'true');
      onComplete();
    }
  };

  const handleSkip = () => {
    AsyncStorage.setItem(`${STORAGE_KEY}_${steps.map(s => s.id).join('_')}`, 'true');
    onComplete();
  };

  if (!visible || steps.length === 0) return null;

  const step = steps[currentStep];

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Ionicons name={step.icon} size={32} color={colors.primary} />
          </View>
          <Text style={styles.title}>{step.title}</Text>
          <Text style={styles.description}>{step.description}</Text>

          <View style={styles.footer}>
            <View style={styles.dots}>
              {steps.map((_, i) => (
                <View key={i} style={[styles.dot, i === currentStep && styles.dotActive]} />
              ))}
            </View>
            <View style={styles.buttons}>
              <TouchableOpacity onPress={handleSkip} accessibilityLabel="Skip tutorial" accessibilityRole="button">
                <Text style={styles.skipText}>Skip</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.nextButton} onPress={handleNext} accessibilityLabel={currentStep === steps.length - 1 ? 'Finish tutorial' : 'Next step'} accessibilityRole="button">
                <Text style={styles.nextText}>
                  {currentStep === steps.length - 1 ? 'Got it!' : 'Next'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export async function hasSeenCoachMarks(stepIds: string[]): Promise<boolean> {
  const key = `${STORAGE_KEY}_${stepIds.join('_')}`;
  const value = await AsyncStorage.getItem(key);
  return value === 'true';
}

export async function resetCoachMarks(stepIds: string[]): Promise<void> {
  const key = `${STORAGE_KEY}_${stepIds.join('_')}`;
  await AsyncStorage.removeItem(key);
}

export const CAMERA_COACH_STEPS: CoachStep[] = [
  {
    id: 'camera_take',
    title: 'Take a Photo',
    description: 'Point your camera at the fish and tap the capture button. The AI will identify the species automatically.',
    icon: 'camera-outline',
  },
  {
    id: 'camera_measure',
    title: 'Add Measurements',
    description: 'Enter the length to auto-calculate weight using FishBase formulas. Use the calibration tool for photo-based measurement.',
    icon: 'resize-outline',
  },
  {
    id: 'camera_regs',
    title: 'Check Regulations',
    description: 'FishBook checks local fishing regulations automatically. Green means legal to keep, red means catch and release only.',
    icon: 'shield-checkmark-outline',
  },
];

export const LIBRARY_COACH_STEPS: CoachStep[] = [
  {
    id: 'lib_search',
    title: 'Search & Filter',
    description: 'Search by location or notes. Filter by habitat type. Sort by date, weight, or species.',
    icon: 'search-outline',
  },
  {
    id: 'lib_grid',
    title: 'Grid or List',
    description: 'Toggle between photo grid and detailed list view. Infinite scroll loads more as you go.',
    icon: 'grid-outline',
  },
];

export const EXPLORE_COACH_STEPS: CoachStep[] = [
  {
    id: 'exp_heatmap',
    title: 'Community Heatmap',
    description: 'See where other anglers are catching fish. Zones are blurred for privacy — minimum 2 anglers required.',
    icon: 'globe-outline',
  },
  {
    id: 'exp_filter',
    title: 'Filter by Species',
    description: 'Tap species chips to see activity for specific fish. Hot zones are color-coded by activity level.',
    icon: 'fish-outline',
  },
];

export const TOURNAMENT_COACH_STEPS: CoachStep[] = [
  {
    id: 'tourn_create',
    title: 'Create a Tournament',
    description: 'Host your own fishing competition. Choose scoring method (biggest fish, total weight, or species count).',
    icon: 'trophy-outline',
  },
  {
    id: 'tourn_leaderboard',
    title: 'Live Leaderboard',
    description: 'Tap any tournament to see the real-time leaderboard. Enter catches to climb the ranks.',
    icon: 'podium-outline',
  },
];

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: colors.textBody,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  footer: {
    width: '100%',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.divider,
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.primary,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipText: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  nextButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  nextText: {
    color: colors.textOnPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
});
