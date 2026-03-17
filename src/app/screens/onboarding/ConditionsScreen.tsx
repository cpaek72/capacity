import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, borderRadius, typography } from '../../../lib/theme';
import Button from '../../../components/Button';
import Input from '../../../components/Input';
import { supabase } from '../../../lib/supabase';
import { useSessionStore } from '../../../store/useSessionStore';
import { useProfileStore } from '../../../store/useProfileStore';

type RootStackParamList = {
  OnboardingConditions: undefined;
  OnboardingSymptoms: undefined;
  OnboardingProfile: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'OnboardingConditions'>;

const PREDEFINED_CONDITIONS = [
  'Lupus',
  'Rheumatoid Arthritis',
  'Fibromyalgia',
  "Crohn's Disease",
  'Ulcerative Colitis',
  'Multiple Sclerosis',
  'Psoriatic Arthritis',
  'Ankylosing Spondylitis',
  'Celiac Disease',
  "Hashimoto's",
  "Graves' Disease",
  'Type 1 Diabetes',
  "Sjogren's Syndrome",
  'Ehlers-Danlos',
  'POTS',
  'ME/CFS',
  'Endometriosis',
  'PCOS',
  'Other',
];

const ConditionsScreen: React.FC<Props> = ({ navigation }) => {
  const [searchText, setSearchText] = useState('');
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [customCondition, setCustomCondition] = useState('');
  const [loading, setLoading] = useState(false);
  const session = useSessionStore((state) => state.session);
  const addCondition = useProfileStore((state) => state.addCondition);

  const filteredConditions = useMemo(() => {
    return PREDEFINED_CONDITIONS.filter((condition) =>
      condition.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [searchText]);

  const isOtherSelected = selectedConditions.includes('Other');

  const handleConditionToggle = (condition: string) => {
    setSelectedConditions((prev) =>
      prev.includes(condition)
        ? prev.filter((c) => c !== condition)
        : [...prev, condition]
    );
    if (condition === 'Other') {
      setCustomCondition('');
    }
  };

  const handleNext = async () => {
    const conditionsToSave = selectedConditions.filter((c) => c !== 'Other');
    if (isOtherSelected && customCondition.trim()) {
      conditionsToSave.push(customCondition.trim());
    }

    if (conditionsToSave.length === 0) {
      alert('Please select at least one condition');
      return;
    }

    if (!session?.user?.id) {
      alert('No user session found');
      return;
    }

    setLoading(true);
    try {
      for (const conditionName of conditionsToSave) {
        const { data, error } = await supabase
          .from('user_conditions')
          .insert({
            user_id: session.user.id,
            condition_name: conditionName,
          })
          .select()
          .single();

        if (error) throw error;
        addCondition(data);
      }

      navigation.navigate('OnboardingSymptoms');
    } catch (error) {
      console.error('Error saving conditions:', error);
      alert('Failed to save conditions. Please try again.');
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
        <Text style={styles.title}>What conditions do you have?</Text>
        <Text style={styles.subtitle}>
          Select all that apply or add your own
        </Text>

        <Input
          placeholder="Search conditions..."
          value={searchText}
          onChangeText={setSearchText}
        />

        <View>
          {filteredConditions.map((condition) => (
            <TouchableOpacity
              key={condition}
              style={[
                styles.checklistItem,
                selectedConditions.includes(condition) &&
                  styles.checklistItemSelected,
              ]}
              onPress={() => handleConditionToggle(condition)}
            >
              <View
                style={[
                  styles.checkbox,
                  selectedConditions.includes(condition) &&
                    styles.checkboxSelected,
                ]}
              >
                {selectedConditions.includes(condition) && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </View>
              <Text style={styles.checklistText}>{condition}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {isOtherSelected && (
          <Input
            placeholder="Enter custom condition"
            value={customCondition}
            onChangeText={setCustomCondition}
          />
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Next"
          onPress={handleNext}
          loading={loading}
          disabled={loading}
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
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.lightGray,
  },
  checklistItemSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: colors.lightGray,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
  checklistText: {
    ...typography.body,
    flex: 1,
  },
  footer: {
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.xxl,
  },
});

export default ConditionsScreen;
