import { Stack } from 'expo-router';
import { colors } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';

export default function AuthLayout() {

  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
    </Stack>
  );
}
