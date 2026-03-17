import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, typography } from '../../../lib/theme';
import Button from '../../../components/Button';
import { useSessionStore } from '../../../store/useSessionStore';

type RootStackParamList = {
  Login: undefined;
  WelcomeScreen: undefined;
  OnboardingProfile: undefined;
  OnboardingConditions: undefined;
  OnboardingSymptoms: undefined;
  OnboardingMeds: undefined;
  OnboardingPrivacy: undefined;
  OnboardingFinish: undefined;
  AppTabs: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'WelcomeScreen'>;

const WelcomeScreen: React.FC<Props> = ({ navigation }) => {
  const setProfile = useSessionStore((state) => state.setProfile);

  const handleSkip = async () => {
    // Mark onboarding as complete in store
    const profile = useSessionStore.getState().profile;
    if (profile) {
      setProfile({ ...profile, onboarding_complete: true });
      // Navigate to app tabs
      navigation.reset({
        index: 0,
        routes: [{ name: 'AppTabs' }],
      });
    }
  };

  const handleContinue = () => {
    navigation.navigate('OnboardingProfile');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Welcome to Capacity</Text>
          <Text style={styles.description}>
            Capacity helps you track your health symptoms, medications, and
            patterns to better understand your condition. Get personalized
            insights to share with your healthcare provider and take control of
            your health journey.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button title="Continue" onPress={handleContinue} />
        <Button
          title="Skip for now"
          variant="text"
          onPress={handleSkip}
          style={styles.skipButton}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  content: {
    alignItems: 'center',
  },
  title: {
    ...typography.screenTitle,
    fontSize: 28,
    fontWeight: '700',
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  description: {
    ...typography.body,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  footer: {
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  skipButton: {
    height: 48,
  },
});

export default WelcomeScreen;
