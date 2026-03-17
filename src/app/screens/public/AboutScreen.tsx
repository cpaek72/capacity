import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { colors, spacing, typography } from '../../../lib/theme';

interface AboutScreenProps {
  navigation: any;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: spacing.xxxl,
  },
  appName: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: colors.darkGray,
    marginBottom: spacing.sm,
  },
  version: {
    ...typography.secondary,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.sectionHeader,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  paragraph: {
    ...typography.body,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  featureList: {
    marginLeft: spacing.lg,
    marginBottom: spacing.lg,
  },
  feature: {
    ...typography.body,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  highlight: {
    fontWeight: '600' as const,
    color: colors.primary,
  },
  missionStatement: {
    backgroundColor: colors.primaryLight,
    borderRadius: spacing.md,
    padding: spacing.lg,
    marginVertical: spacing.xl,
  },
  missionText: {
    ...typography.body,
    color: colors.primaryDark,
    lineHeight: 22,
    fontWeight: '600' as const,
  },
  footerText: {
    ...typography.secondary,
    textAlign: 'center',
    marginTop: spacing.xxxl,
  },
});

const AboutScreen: React.FC<AboutScreenProps> = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.logoSection}>
          <Text style={styles.appName}>Capacity</Text>
          <Text style={styles.version}>Version 1.0.0</Text>
        </View>

        <View style={styles.missionStatement}>
          <Text style={styles.missionText}>
            Capacity helps you track symptoms and identify patterns in your chronic and autoimmune conditions.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>About the App</Text>
        <Text style={styles.paragraph}>
          Living with chronic and autoimmune conditions requires constant awareness of your physical
          and mental capacity. Capacity is designed to help you understand your limits, recognize
          patterns, and make informed decisions about your health.
        </Text>

        <Text style={styles.sectionTitle}>Key Features</Text>
        <View style={styles.featureList}>
          <Text style={styles.feature}>
            <Text style={styles.highlight}>Symptom Tracking</Text> - Log daily
            symptoms and their severity to identify patterns over time
          </Text>
          <Text style={styles.feature}>
            <Text style={styles.highlight}>Insights</Text> - Visualize trends and
            correlations in your health data
          </Text>
          <Text style={styles.feature}>
            <Text style={styles.highlight}>Personal Capacity</Text> - Understand your
            limits and plan your activities accordingly
          </Text>
          <Text style={styles.feature}>
            <Text style={styles.highlight}>Export Data</Text> - Share your health
            records with healthcare providers
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Our Mission</Text>
        <Text style={styles.paragraph}>
          We believe that people living with chronic and autoimmune conditions deserve tools
          that help them take control of their health. By providing a simple yet powerful
          tracking and analysis platform, we aim to empower you to make better health decisions
          and improve your quality of life.
        </Text>

        <Text style={styles.sectionTitle}>Privacy & Security</Text>
        <Text style={styles.paragraph}>
          Your health data is sensitive and personal. We are committed to protecting your privacy
          and ensuring that your information is stored securely. All data is encrypted and only
          accessible to you. We never sell or share your data with third parties without your
          explicit consent.
        </Text>

        <Text style={styles.sectionTitle}>Get In Touch</Text>
        <Text style={styles.paragraph}>
          We'd love to hear from you! If you have questions, feedback, or feature requests,
          please don't hesitate to reach out.
        </Text>
        <Text style={styles.paragraph}>
          Email: support@capacity.app{'\n'}
          Website: www.capacity.app
        </Text>

        <Text style={styles.footerText}>
          Made with care for those understanding their limits.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

export default AboutScreen;
