import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { colors, spacing, typography } from '../../../lib/theme';

interface PrivacyScreenProps {
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
  title: {
    ...typography.screenTitle,
    fontSize: 24,
    fontWeight: '700' as const,
    marginBottom: spacing.xl,
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
  listItem: {
    ...typography.body,
    lineHeight: 22,
    marginBottom: spacing.md,
    marginLeft: spacing.lg,
  },
});

const PrivacyScreen: React.FC<PrivacyScreenProps> = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Privacy Policy</Text>

        <Text style={styles.sectionTitle}>1. Introduction</Text>
        <Text style={styles.paragraph}>
          Capacity ("we," "us," "our," or "Company") operates the Capacity
          mobile application. This page informs you of our policies regarding
          the collection, use, and disclosure of personal data when you use our
          Service and the choices you have associated with that data.
        </Text>

        <Text style={styles.sectionTitle}>2. Information Collection and Use</Text>
        <Text style={styles.paragraph}>
          We collect several different types of information for various purposes
          to provide and improve our Service to you.
        </Text>

        <Text style={styles.sectionTitle}>2.1 Personal Data</Text>
        <Text style={styles.paragraph}>
          While using our Service, we may ask you to provide us with certain
          personally identifiable information that can be used to contact or
          identify you ("Personal Data"). This may include, but is not limited to:
        </Text>
        <Text style={styles.listItem}>• Email address</Text>
        <Text style={styles.listItem}>• First name and last name</Text>
        <Text style={styles.listItem}>
          • Cookies and Usage Data
        </Text>

        <Text style={styles.sectionTitle}>3. Use of Data</Text>
        <Text style={styles.paragraph}>
          Capacity uses the collected data for various purposes:
        </Text>
        <Text style={styles.listItem}>
          • To provide and maintain our Service
        </Text>
        <Text style={styles.listItem}>
          • To notify you about changes to our Service
        </Text>
        <Text style={styles.listItem}>
          • To provide customer support
        </Text>
        <Text style={styles.listItem}>
          • To gather analysis or valuable information so that we can improve our Service
        </Text>
        <Text style={styles.listItem}>
          • To monitor the usage of our Service
        </Text>

        <Text style={styles.sectionTitle}>4. Security of Data</Text>
        <Text style={styles.paragraph}>
          The security of your data is important to us, but remember that no
          method of transmission over the Internet or method of electronic
          storage is 100% secure. While we strive to use commercially acceptable
          means to protect your Personal Data, we cannot guarantee its absolute
          security.
        </Text>

        <Text style={styles.sectionTitle}>5. Changes to This Privacy Policy</Text>
        <Text style={styles.paragraph}>
          We may update our Privacy Policy from time to time. We will notify you
          of any changes by posting the new Privacy Policy on this page and
          updating the "effective date" at the top of this Privacy Policy.
        </Text>

        <Text style={styles.sectionTitle}>6. Contact Us</Text>
        <Text style={styles.paragraph}>
          If you have any questions about this Privacy Policy, please contact us at:
        </Text>
        <Text style={styles.listItem}>• Email: privacy@capacity.app</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

export default PrivacyScreen;
