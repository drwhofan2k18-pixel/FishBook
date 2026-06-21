import * as Updates from 'expo-updates';
import NetInfo from '@react-native-community/netinfo';

export async function checkForOTAUpdate(): Promise<void> {
  try {
    if (!Updates.isEnabled) return;

    const online = await NetInfo.fetch();
    if (!online.isConnected) return;

    const update = await Updates.checkForUpdateAsync();
    if (update.isAvailable) {
      const result = await Updates.fetchUpdateAsync();
      if (result.isNew) {
        await Updates.reloadAsync();
      }
    }
  } catch {
    // Silent fail — updates are best-effort
  }
}

export async function checkOTAUpdateManual(): Promise<{
  available: boolean;
  message: string;
}> {
  try {
    if (!Updates.isEnabled) {
      return { available: false, message: 'Updates not enabled in this build' };
    }

    const update = await Updates.checkForUpdateAsync();
    if (update.isAvailable) {
      const result = await Updates.fetchUpdateAsync();
      if (result.isNew) {
        return { available: true, message: 'Update downloaded — will apply on next restart' };
      }
    }
    return { available: false, message: 'You\'re on the latest version' };
  } catch (err) {
    return {
      available: false,
      message: err instanceof Error ? err.message : 'Update check failed',
    };
  }
}
