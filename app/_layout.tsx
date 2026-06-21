import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/lib/auth-context';
import { View, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import ErrorBoundary from '@/components/error-boundary';
import { hasCompletedOnboarding } from '@/app/onboarding';
import { initSyncEngine } from '@/lib/sync-engine';
import { loadOnDeviceModel } from '@/lib/ondevice-id';
import { useUnitStore } from '@/lib/units';
import { initDeepLinking } from '@/lib/deep-linking';
import { scheduleCatchReminder } from '@/lib/notifications';
import { colors } from '@/lib/theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
    },
  },
});

function RootLayoutNav() {
  const { isLoading, isAuthenticated } = useAuth();
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    hasCompletedOnboarding().then(setOnboarded);
    initSyncEngine();
    loadOnDeviceModel();
    useUnitStore.getState().loadPreferences();
    const removeDeepLink = initDeepLinking();
    scheduleCatchReminder(7);
    return () => removeDeepLink();
  }, []);

  if (isLoading || onboarded === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} accessibilityLabel="Loading" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
        ) : !onboarded ? (
          <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
        ) : (
          <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        )}
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RootLayoutNav />
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
