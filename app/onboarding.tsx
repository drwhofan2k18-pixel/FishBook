import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
  FlatList,
  type ViewToken,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestLocationPermission } from '@/lib/location';
import { requestNotificationPermission } from '@/lib/notifications';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface OnboardingStep {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  action?: () => Promise<boolean | void>;
  actionLabel?: string;
}

const ONBOARDING_KEY = 'fishbook_onboarding_complete';

export async function hasCompletedOnboarding(): Promise<boolean> {
  const value = await AsyncStorage.getItem(ONBOARDING_KEY);
  return value === 'true';
}

export async function markOnboardingComplete() {
  await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
}

export default function OnboardingScreen() {
  const [currentStep, setCurrentStep] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      icon: 'fish',
      title: 'Welcome to FishBook',
      description: 'Your intelligent fishing companion. Log catches, identify species with AI, and track your angling journey.',
    },
    {
      id: 'camera',
      icon: 'camera',
      title: 'Snap & Identify',
      description: 'Take a photo of your catch and our AI will identify the species, estimate weight, and log everything automatically.',
    },
    {
      id: 'offline',
      icon: 'cloud-offline',
      title: 'Works Offline',
      description: 'No signal? No problem. FishBook stores your catches locally and syncs when you\'re back online. Download the AI model for offline species identification.',
    },
    {
      id: 'location',
      icon: 'location',
      title: 'Track Your Spots',
      description: 'FishBook auto-detects your location and builds a personal map of your fishing spots over time.',
      action: async () => { await requestLocationPermission(); },
      actionLabel: 'Enable Location',
    },
    {
      id: 'notifications',
      icon: 'notifications',
      title: 'Stay in the Loop',
      description: 'Get notified when you unlock achievements, and gentle reminders if you haven\'t been fishing in a while.',
      action: async () => { await requestNotificationPermission(); },
      actionLabel: 'Enable Notifications',
    },
    {
      id: 'ready',
      icon: 'rocket',
      title: 'You\'re All Set!',
      description: 'Start by taking a photo of your first catch. The AI will handle the rest. Tight lines!',
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentStep + 1, animated: true });
      setCurrentStep(currentStep + 1);
    } else {
      finishOnboarding();
    }
  };

  const handleSkip = () => {
    finishOnboarding();
  };

  const finishOnboarding = async () => {
    await markOnboardingComplete();
    router.replace('/(tabs)');
  };

  const handleAction = async () => {
    const step = steps[currentStep];
    if (step.action) {
      await step.action();
    }
    handleNext();
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      setCurrentStep(viewableItems[0].index);
    }
  }).current;

  return (
    <SafeAreaView style={styles.container}>
      {currentStep < steps.length - 1 && (
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}

      <FlatList
        ref={flatListRef}
        data={steps}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        renderItem={({ item }) => (
          <View style={styles.stepContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name={item.icon} size={64} color="#007AFF" />
            </View>
            <Text style={styles.stepTitle}>{item.title}</Text>
            <Text style={styles.stepDescription}>{item.description}</Text>
          </View>
        )}
      />

      <View style={styles.bottomSection}>
        <View style={styles.dots}>
          {steps.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === currentStep && styles.dotActive]}
            />
          ))}
        </View>

        {steps[currentStep].action ? (
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.secondaryButton} onPress={handleNext}>
              <Text style={styles.secondaryButtonText}>Not Now</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={handleAction}>
              <Text style={styles.primaryButtonText}>{steps[currentStep].actionLabel}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.fullButton} onPress={handleNext}>
            <Text style={styles.primaryButtonText}>
              {currentStep === steps.length - 1 ? "Let's Go!" : 'Continue'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  skipButton: { alignSelf: 'flex-end', padding: 16 },
  skipText: { fontSize: 16, color: '#8E8E93', fontWeight: '500' },
  stepContainer: { width: SCREEN_WIDTH, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  iconCircle: {
    width: 120, height: 120, borderRadius: 60, backgroundColor: '#E8F0FE',
    justifyContent: 'center', alignItems: 'center', marginBottom: 32,
  },
  stepTitle: { fontSize: 28, fontWeight: '700', color: '#1C1C1E', textAlign: 'center', marginBottom: 12 },
  stepDescription: { fontSize: 16, color: '#8E8E93', textAlign: 'center', lineHeight: 24 },
  bottomSection: { paddingHorizontal: 32, paddingBottom: 40 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 24 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E5E5EA' },
  dotActive: { backgroundColor: '#007AFF', width: 24 },
  buttonRow: { flexDirection: 'row', gap: 12 },
  primaryButton: { flex: 1, backgroundColor: '#007AFF', borderRadius: 28, paddingVertical: 16, alignItems: 'center' },
  primaryButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
  secondaryButton: { flex: 1, backgroundColor: '#F2F2F7', borderRadius: 28, paddingVertical: 16, alignItems: 'center' },
  secondaryButtonText: { color: '#8E8E93', fontSize: 17, fontWeight: '500' },
  fullButton: { backgroundColor: '#007AFF', borderRadius: 28, paddingVertical: 16, alignItems: 'center' },
});
