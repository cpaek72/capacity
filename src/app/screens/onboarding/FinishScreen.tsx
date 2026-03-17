import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, typography } from '../../../lib/theme';
import Button from '../../../components/Button';
import { supabase } from '../../../lib/supabase';
import { useSessionStore } from '../../../store/useSessionStore';

type RootStackParamList = {
  OnboardingFinish: undefined;
  AppTabs: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'OnboardingFinish'>;

const FinishScreen: React.FC<Props> = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const session = useSessionStore((state) => state.session);
  const profile = useSessionStore((state) => state.profile);
  const setProfile = useSessionStore((state) => state.setProfile);

  const handleGoHome = async () => {
    if (!session?.user?.id) {
      alert('No user session found');
      return;
    }

    setLoading(true);
    try {
      // Update profile with onboarding_complete = true
      const { data, error } = await supabase
        .from('profiles')
        .update({ onboarding_complete: true })
        .eq('id', session.user.id)
        .select()
        .single();

      if (error) throw error;

      // Update store
      setProfile(data);

      // Navigate to AppTabs
      navigation.reset({
        index: 0,
        routes: [{ name: 'AppTabs' }],
      });
    } catch (error) {
      console.error('Error completing onboarding:', error);
      alert('Failed to complete onboarding. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <Text style={styles.celebration}>🎉</Text>
          <Text style={styles.title}>You're all set!</Text>
          <Text style={styles.description}>
            Your profile is ready. Start tracking your health, symptoms, and
            medications to discover patterns and get personalized insights.
          </Text>

          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <Text style={styles.featureBullet}>✓</Text>
              <Text style={styles.featureText}>
                Track daily symptoms and flare-ups
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureBullet}>✓</Text>
              <Text style={styles.featureText}>
                Monitor medication effectiveness
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureBullet}>✓</Text>
              <Text style={styles.featureText}>
                Discover health patterns and triggers
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureBullet}>✓</Text>
              <Text style={styles.featureText}>
                Get AI-powered insights for your doctor
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {loading ? (
          <ActivityIndicator
            size="large"
            color={colors.primary}
            style={styles.loader}
          />
        ) : (
          <Button title="Go to Home" onPress={handleGoHome} />
        )}
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
  celebration: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.screenTitle,
    fontSize: 28,
    fontWeight: '700',
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  description: {
    ...typography.body,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xxl,
  },
  featuresList: {
    width: '100%',
    gap: spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  featureBullet: {
    fontSize: 18,
    color: colors.success,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  featureText: {
    ...typography.body,
    flex: 1,
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.xxl,
    justifyContent: 'center',
    minHeight: 60,
  },
  loader: {
    paddingVertical: spacing.lg,
  },
});

export default FinishScreen;
