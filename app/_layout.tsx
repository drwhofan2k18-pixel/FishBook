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
import { ThemeProvider, useTheme } from '@/lib/theme-context';
import { checkForOTAUpdate } from '@/lib/ota-updates';
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
  const { mode } = useTheme();
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    hasCompletedOnboarding().then(setOnboarded);
    initSyncEngine();
    loadOnDeviceModel();
    useUnitStore.getState().loadPreferences();
    const removeDeepLink = initDeepLinking();
    scheduleCatchReminder(7);
    checkForOTAUpdate();
    return () => removeDeepLink();
  }, []);

  if (isLoading || onboarded === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: mode === 'dark' ? '#000000' : '#FFFFFF' }}>
        <ActivityIndicator size="large" color={colors.primary} accessibilityLabel="Loading" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
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
        <ThemeProvider>
          <AuthProvider>
            <RootLayoutNav />
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
