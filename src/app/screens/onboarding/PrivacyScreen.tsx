import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Switch,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, typography } from '../../../lib/theme';
import Button from '../../../components/Button';
import Card from '../../../components/Card';

type RootStackParamList = {
  OnboardingPrivacy: undefined;
  OnboardingFinish: undefined;
  OnboardingMeds: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'OnboardingPrivacy'>;

interface PrivacySettings {
  personalUseOnly: boolean;
  anonymizedInsights: boolean;
  anonymizedResearch: boolean;
}

const PrivacyScreen: React.FC<Props> = ({ navigation }) => {
  const [privacy, setPrivacy] = useState<PrivacySettings>({
    personalUseOnly: true,
    anonymizedInsights: false,
    anonymizedResearch: false,
  });

  const handleToggle = (key: keyof PrivacySettings) => {
    setPrivacy((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleFinish = () => {
    // Privacy preferences are handled in store if needed
    // For MVP, just navigate to finish screen
    navigation.navigate('OnboardingFinish');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Privacy preferences</Text>
        <Text style={styles.subtitle}>
          Choose how your data is used to improve your experience
        </Text>

        <Card style={styles.privacyCard}>
          <View style={styles.privacyItem}>
            <View style={styles.privacyTextContainer}>
              <Text style={styles.privacyTitle}>Use my data only for me</Text>
              <Text style={styles.privacyDescription}>
                Your health data is stored securely and used only to provide
                you with insights about your health. It is never shared.
              </Text>
            </View>
            <Switch
              value={privacy.personalUseOnly}
              onValueChange={() => handleToggle('personalUseOnly')}
              trackColor={{ false: colors.lightGray, true: colors.primaryLight }}
              thumbColor={privacy.personalUseOnly ? colors.primary : colors.midGray}
              style={styles.switch}
              disabled
            />
          </View>
        </Card>

        <Card style={styles.privacyCard}>
          <View style={styles.privacyItem}>
            <View style={styles.privacyTextContainer}>
              <Text style={styles.privacyTitle}>
                Allow anonymized data to improve insights
              </Text>
              <Text style={styles.privacyDescription}>
                Your anonymized data helps us improve the algorithms that
                generate insights. No identifying information is included.
              </Text>
            </View>
            <Switch
              value={privacy.anonymizedInsights}
              onValueChange={() => handleToggle('anonymizedInsights')}
              trackColor={{ false: colors.lightGray, true: colors.primaryLight }}
              thumbColor={
                privacy.anonymizedInsights ? colors.primary : colors.midGray
              }
              style={styles.switch}
            />
          </View>
        </Card>

        <Card style={styles.privacyCard}>
          <View style={styles.privacyItem}>
            <View style={styles.privacyTextContainer}>
              <Text style={styles.privacyTitle}>
                Allow anonymized data for research dashboard
              </Text>
              <Text style={styles.privacyDescription}>
                Your anonymized health data helps researchers understand
                disease patterns. Opt-in to contribute to medical science.
              </Text>
            </View>
            <Switch
              value={privacy.anonymizedResearch}
              onValueChange={() => handleToggle('anonymizedResearch')}
              trackColor={{ false: colors.lightGray, true: colors.primaryLight }}
              thumbColor={
                privacy.anonymizedResearch ? colors.primary : colors.midGray
              }
              style={styles.switch}
            />
          </View>
        </Card>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            You can change these settings anytime in your account preferences.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button title="Finish" onPress={handleFinish} />
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
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
  },
  title: {
    ...typography.screenTitle,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.secondary,
    marginBottom: spacing.lg,
  },
  privacyCard: {
    marginBottom: spacing.lg,
  },
  privacyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.lg,
  },
  privacyTextContainer: {
    flex: 1,
  },
  privacyTitle: {
    ...typography.sectionHeader,
    marginBottom: spacing.sm,
  },
  privacyDescription: {
    ...typography.secondary,
    lineHeight: 20,
  },
  switch: {
    marginTop: spacing.sm,
  },
  infoBox: {
    backgroundColor: colors.primaryLight,
    borderRadius: 8,
    padding: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  infoText: {
    ...typography.secondary,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.xxl,
  },
});

export default PrivacyScreen;
