import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, borderRadius, typography } from '../../../lib/theme';
import Button from '../../../components/Button';
import Card from '../../../components/Card';
import { showToast } from '../../../components/Toast';

type RootStackParamList = {
  Help: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'Help'>;

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

interface BugReportCategory {
  id: string;
  label: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    id: '1',
    question: 'How do I log a check-in?',
    answer:
      'To log a check-in, go to the Logging tab and tap "Log Today". Fill out your daily health status including flare rating, mood, sleep quality, stress level, and any notes. You can also track which symptoms are present and if you took your medications.',
  },
  {
    id: '2',
    question: 'What is a flare rating?',
    answer:
      'Your flare rating is a number from 0-10 that indicates how severe your condition is today. 0 means no symptoms or minimal impact, while 10 means the most severe symptoms you experience. This helps you track disease activity over time.',
  },
  {
    id: '3',
    question: 'How are insights generated?',
    answer:
      'Capacity analyzes your logged data to identify patterns and correlations. It looks for relationships between your daily activities, triggers, symptoms, and severity to help you understand what impacts your health. Insights are generated based on at least 2 weeks of data.',
  },
  {
    id: '4',
    question: 'Is my data private?',
    answer:
      'Yes, your data is private by default. All your personal health information is only used to provide you with personalized insights. You can optionally choose to contribute anonymized data for research through Privacy Settings.',
  },
  {
    id: '5',
    question: 'How do I export my data?',
    answer:
      'Go to Settings > Data & Account and tap "Download My Data". Your health records will be exported as a JSON file that you can download and keep. You can use this to switch apps or analyze your data yourself.',
  },
];

const BUG_CATEGORIES: BugReportCategory[] = [
  { id: 'ui', label: 'UI Issue' },
  { id: 'data', label: 'Data Issue' },
  { id: 'crash', label: 'App Crash' },
  { id: 'other', label: 'Other' },
];

const HelpScreen: React.FC<Props> = ({ navigation }) => {
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('ui');
  const [bugDescription, setBugDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const toggleFAQ = (id: string) => {
    setExpandedFAQ(expandedFAQ === id ? null : id);
  };

  const handleSubmitBugReport = async () => {
    if (!bugDescription.trim()) {
      showToast('error', 'Please describe the issue');
      return;
    }

    setSubmitting(true);
    try {
      // For MVP, just show a success toast
      // In production, you would send this to a backend service
      console.log('Bug report submitted:', {
        category: selectedCategory,
        description: bugDescription,
        timestamp: new Date().toISOString(),
      });

      showToast('success', 'Bug report submitted. Thank you!');
      setBugDescription('');
      setSelectedCategory('ui');
    } catch (error) {
      console.error('Error submitting bug report:', error);
      showToast('error', 'Failed to submit bug report');
    } finally {
      setSubmitting(false);
    }
  };

  const handleContactSupport = async () => {
    try {
      await Linking.openURL('mailto:support@capacity-app.com');
    } catch (error) {
      console.error('Error opening email:', error);
      showToast('error', 'Could not open email client');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>

        {FAQ_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.faqItem}
            onPress={() => toggleFAQ(item.id)}
            activeOpacity={0.7}
          >
            <View style={styles.faqHeader}>
              <Text style={styles.faqQuestion}>{item.question}</Text>
              <Text style={styles.faqToggle}>
                {expandedFAQ === item.id ? '−' : '+'}
              </Text>
            </View>

            {expandedFAQ === item.id && (
              <Text style={styles.faqAnswer}>{item.answer}</Text>
            )}
          </TouchableOpacity>
        ))}

        <Text style={styles.sectionTitle}>Report a Bug</Text>

        <Card style={styles.section}>
          <Text style={styles.fieldLabel}>Category</Text>
          <View style={styles.categoryGrid}>
            {BUG_CATEGORIES.map((category) => (
              <Pressable
                key={category.id}
                style={[
                  styles.categoryButton,
                  selectedCategory === category.id &&
                    styles.categoryButtonSelected,
                ]}
                onPress={() => setSelectedCategory(category.id)}
              >
                <Text
                  style={[
                    styles.categoryButtonText,
                    selectedCategory === category.id &&
                      styles.categoryButtonTextSelected,
                  ]}
                >
                  {category.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Describe the issue</Text>
          <TextInput
            style={styles.descriptionInput}
            placeholder="Tell us what happened..."
            value={bugDescription}
            onChangeText={setBugDescription}
            placeholderTextColor={colors.midGray}
            multiline
            numberOfLines={5}
          />

          <Button
            title={submitting ? 'Submitting...' : 'Submit Report'}
            onPress={handleSubmitBugReport}
            loading={submitting}
            disabled={submitting}
            style={styles.submitButton}
          />
        </Card>

        <Text style={styles.sectionTitle}>Get Help</Text>

        <Card style={styles.section}>
          <Text style={styles.helpTitle}>Contact Support</Text>
          <Text style={styles.helpDescription}>
            Have questions or need help? Reach out to our support team.
          </Text>
          <Button
            title="Email Support"
            onPress={handleContactSupport}
            style={styles.contactButton}
          />
        </Card>

        <View style={styles.footerInfo}>
          <Text style={styles.footerTitle}>About Capacity</Text>
          <Text style={styles.footerText}>
            Capacity is a health tracking app designed for people with chronic conditions. It helps you log symptoms, track triggers, and gain insights into your health.
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
  sectionTitle: {
    ...typography.sectionHeader,
    fontSize: 16,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  faqItem: {
    marginBottom: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundGray,
    padding: spacing.md,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  faqQuestion: {
    ...typography.body,
    fontWeight: '600',
    flex: 1,
    marginRight: spacing.md,
    paddingRight: spacing.sm,
  },
  faqToggle: {
    fontSize: 20,
    fontWeight: '300',
    color: colors.primary,
  },
  faqAnswer: {
    ...typography.secondary,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.lightGray,
    lineHeight: 20,
    fontSize: 13,
  },
  section: {
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  fieldLabel: {
    ...typography.label,
    fontSize: 12,
    marginBottom: spacing.sm,
    color: colors.midGray,
    textTransform: 'uppercase',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  categoryButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.lightGray,
    backgroundColor: colors.white,
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
  },
  categoryButtonSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  categoryButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.darkGray,
  },
  categoryButtonTextSelected: {
    color: colors.primary,
  },
  descriptionInput: {
    borderWidth: 1,
    borderColor: colors.lightGray,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 100,
    fontSize: 14,
    color: colors.darkGray,
    marginBottom: spacing.lg,
    textAlignVertical: 'top',
  },
  submitButton: {
    marginTop: spacing.md,
  },
  helpTitle: {
    ...typography.body,
    fontWeight: '700',
    fontSize: 16,
    marginBottom: spacing.sm,
  },
  helpDescription: {
    ...typography.secondary,
    fontSize: 13,
    marginBottom: spacing.lg,
    lineHeight: 18,
  },
  contactButton: {
    marginTop: spacing.md,
  },
  footerInfo: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xxl,
  },
  footerTitle: {
    ...typography.label,
    fontSize: 12,
    marginBottom: spacing.sm,
    color: colors.primary,
    textTransform: 'uppercase',
  },
  footerText: {
    ...typography.secondary,
    fontSize: 13,
    color: colors.darkGray,
    lineHeight: 18,
  },
});

export default HelpScreen;
