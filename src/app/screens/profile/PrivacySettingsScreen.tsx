import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Switch,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, borderRadius, typography } from '../../../lib/theme';
import { showToast } from '../../../components/Toast';

type RootStackParamList = {
  PrivacySettings: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'PrivacySettings'>;

interface PrivacyPreferences {
  personalOnly: boolean;
  anonymizedInsights: boolean;
  anonymizedResearch: boolean;
}

const PrivacySettingsScreen: React.FC<Props> = ({ navigation }) => {
  const [personalOnly, setPersonalOnly] = useState(true);
  const [anonymizedInsights, setAnonymizedInsights] = useState(false);
  const [anonymizedResearch, setAnonymizedResearch] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialPrefs, setInitialPrefs] = useState<PrivacyPreferences | null>(null);

  useEffect(() => {
    loadPrivacySettings();
  }, []);

  const loadPrivacySettings = async () => {
    try {
      const saved = await AsyncStorage.getItem('privacyPrefs');
      if (saved) {
        const prefs = JSON.parse(saved);
        setPersonalOnly(prefs.personalOnly !== false);
        setAnonymizedInsights(prefs.anonymizedInsights || false);
        setAnonymizedResearch(prefs.anonymizedResearch || false);
        setInitialPrefs(prefs);
      } else {
        const defaultPrefs = {
          personalOnly: true,
          anonymizedInsights: false,
          anonymizedResearch: false,
        };
        setInitialPrefs(defaultPrefs);
      }
    } catch (error) {
      console.error('Error loading privacy settings:', error);
    }
  };

  useEffect(() => {
    if (initialPrefs) {
      const hasChanges =
        personalOnly !== initialPrefs.personalOnly ||
        anonymizedInsights !== initialPrefs.anonymizedInsights ||
        anonymizedResearch !== initialPrefs.anonymizedResearch;
      setIsDirty(hasChanges);
    }
  }, [personalOnly, anonymizedInsights, anonymizedResearch, initialPrefs]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const prefs: PrivacyPreferences = {
        personalOnly,
        anonymizedInsights,
        anonymizedResearch,
      };
      await AsyncStorage.setItem('privacyPrefs', JSON.stringify(prefs));
      setInitialPrefs(prefs);
      setIsDirty(false);
      showToast('success', 'Privacy settings updated');
    } catch (error) {
      console.error('Error saving privacy settings:', error);
      showToast('error', 'Failed to save privacy settings');
    } finally {
      setLoading(false);
    }
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={handleSave}
          disabled={loading || !isDirty}
          style={{ opacity: loading || !isDirty ? 0.5 : 1, marginRight: spacing.md }}
        >
          <Text style={[styles.headerButton, { color: colors.primary }]}>Save</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, isDirty, loading]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.introText}>
          Control how your data is used to improve Capacity.
        </Text>

        <View style={styles.section}>
          <View style={styles.settingRow}>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Use my data only for me</Text>
              <Text style={styles.settingDescription}>
                Your data will only be used to provide you with personalized insights and features
              </Text>
            </View>
            <Switch
              value={personalOnly}
              onValueChange={setPersonalOnly}
              disabled={true}
              trackColor={{ false: colors.lightGray, true: colors.primaryLight }}
              thumbColor={personalOnly ? colors.primary : colors.midGray}
            />
          </View>
          <Text style={styles.alwaysOnNote}>Always on for your privacy</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.settingRow}>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Allow anonymized data for insights</Text>
              <Text style={styles.settingDescription}>
                Your anonymized data may be used to generate population-level health insights and trends
              </Text>
            </View>
            <Switch
              value={anonymizedInsights}
              onValueChange={setAnonymizedInsights}
              trackColor={{ false: colors.lightGray, true: colors.primaryLight }}
              thumbColor={anonymizedInsights ? colors.primary : colors.midGray}
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.settingRow}>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Allow anonymized data for research</Text>
              <Text style={styles.settingDescription}>
                Your anonymized data may be used by researchers to study chronic health conditions
              </Text>
            </View>
            <Switch
              value={anonymizedResearch}
              onValueChange={setAnonymizedResearch}
              trackColor={{ false: colors.lightGray, true: colors.primaryLight }}
              thumbColor={anonymizedResearch ? colors.primary : colors.midGray}
            />
          </View>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>What is anonymized data?</Text>
          <Text style={styles.infoText}>
            Anonymized data has all personally identifiable information removed. This means your name, email, and other personal details are not included. Capacity can never identify you from anonymized data.
          </Text>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Your control</Text>
          <Text style={styles.infoText}>
            You can change these settings at any time. Your current settings apply to all data stored going forward.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  introText: {
    ...typography.secondary,
    marginBottom: spacing.lg,
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    marginBottom: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundGray,
    padding: spacing.md,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  settingDescription: {
    ...typography.secondary,
    fontSize: 13,
    lineHeight: 18,
  },
  alwaysOnNote: {
    ...typography.secondary,
    fontSize: 12,
    marginTop: spacing.sm,
    fontStyle: 'italic',
    color: colors.midGray,
  },
  infoSection: {
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.md,
  },
  infoTitle: {
    ...typography.label,
    fontSize: 12,
    marginBottom: spacing.sm,
    color: colors.primary,
    textTransform: 'uppercase',
  },
  infoText: {
    ...typography.secondary,
    fontSize: 13,
    color: colors.darkGray,
    lineHeight: 18,
  },
  headerButton: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PrivacySettingsScreen;
