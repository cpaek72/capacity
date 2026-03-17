import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { colors, spacing, typography } from '../../../lib/theme';

interface TermsScreenProps {
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

const TermsScreen: React.FC<TermsScreenProps> = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Terms of Service</Text>

        <Text style={styles.sectionTitle}>1. Agreement to Terms</Text>
        <Text style={styles.paragraph}>
          By accessing and using the Capacity mobile application ("Service"),
          you accept and agree to be bound by the terms and provision of this
          agreement. If you do not agree to abide by the above, please do not
          use this service.
        </Text>

        <Text style={styles.sectionTitle}>2. Use License</Text>
        <Text style={styles.paragraph}>
          Permission is granted to temporarily download one copy of the
          materials (information or software) on Capacity for personal,
          non-commercial transitory viewing only. This is the grant of a license,
          not a transfer of title, and under this license you may not:
        </Text>
        <Text style={styles.listItem}>
          • Modify or copy the materials
        </Text>
        <Text style={styles.listItem}>
          • Use the materials for any commercial purpose or for any public display
        </Text>
        <Text style={styles.listItem}>
          • Attempt to reverse engineer, disassemble, or hack the application
        </Text>
        <Text style={styles.listItem}>
          • Remove any copyright or other proprietary notations from the materials
        </Text>
        <Text style={styles.listItem}>
          • Transfer the materials to another person or "mirror" the materials on any other server
        </Text>

        <Text style={styles.sectionTitle}>3. Disclaimer</Text>
        <Text style={styles.paragraph}>
          The materials on Capacity are provided on an 'as is' basis. Capacity
          makes no warranties, expressed or implied, and hereby disclaims and
          negates all other warranties including, without limitation, implied
          warranties or conditions of merchantability, fitness for a particular
          purpose, or non-infringement of intellectual property or other
          violation of rights.
        </Text>

        <Text style={styles.sectionTitle}>4. Limitations</Text>
        <Text style={styles.paragraph}>
          In no event shall Capacity or its suppliers be liable for any damages
          (including, without limitation, damages for loss of data or profit,
          or due to business interruption) arising out of the use or inability
          to use the materials on Capacity.
        </Text>

        <Text style={styles.sectionTitle}>5. Accuracy of Materials</Text>
        <Text style={styles.paragraph}>
          The materials appearing on Capacity could include technical,
          typographical, or photographic errors. Capacity does not warrant that
          any of the materials on its website are accurate, complete, or current.
          Capacity may make changes to the materials contained on its website at
          any time without notice.
        </Text>

        <Text style={styles.sectionTitle}>6. Links</Text>
        <Text style={styles.paragraph}>
          Capacity has not reviewed all of the sites linked to its website and
          is not responsible for the contents of any such linked site. The
          inclusion of any link does not imply endorsement by Capacity of the
          site. Use of any such linked website is at the user's own risk.
        </Text>

        <Text style={styles.sectionTitle}>7. Modifications</Text>
        <Text style={styles.paragraph}>
          Capacity may revise these terms of service for its website at any time
          without notice. By using this website, you are agreeing to be bound by
          the then current version of these terms of service.
        </Text>

        <Text style={styles.sectionTitle}>8. Contact Information</Text>
        <Text style={styles.paragraph}>
          If you have any questions about these Terms and Conditions, please
          contact us at:
        </Text>
        <Text style={styles.listItem}>• Email: support@capacity.app</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

export default TermsScreen;
