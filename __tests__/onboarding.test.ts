import AsyncStorage from '@react-native-async-storage/async-storage';

async function hasCompletedOnboarding(): Promise<boolean> {
  const value = await AsyncStorage.getItem('fishbook_onboarding_complete');
  return value === 'true';
}

async function markOnboardingComplete() {
  await AsyncStorage.setItem('fishbook_onboarding_complete', 'true');
}

describe('onboarding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('hasCompletedOnboarding', () => {
    it('returns true when stored value is "true"', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('true');
      const result = await hasCompletedOnboarding();
      expect(result).toBe(true);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('fishbook_onboarding_complete');
    });

    it('returns false when stored value is null', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      const result = await hasCompletedOnboarding();
      expect(result).toBe(false);
    });

    it('returns false when stored value is "false"', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('false');
      const result = await hasCompletedOnboarding();
      expect(result).toBe(false);
    });
  });

  describe('markOnboardingComplete', () => {
    it('stores "true" in AsyncStorage', async () => {
      await markOnboardingComplete();
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('fishbook_onboarding_complete', 'true');
    });
  });
});
