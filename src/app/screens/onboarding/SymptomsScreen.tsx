import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, borderRadius, typography } from '../../../lib/theme';
import Button from '../../../components/Button';
import Input from '../../../components/Input';
import { supabase } from '../../../lib/supabase';
import { useSessionStore } from '../../../store/useSessionStore';
import { useProfileStore } from '../../../store/useProfileStore';
import { SYMPTOM_CATEGORIES } from '../../../types/models';

type RootStackParamList = {
  OnboardingSymptoms: undefined;
  OnboardingMeds: undefined;
  OnboardingConditions: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'OnboardingSymptoms'>;

interface SymptomsByCategory {
  [key: string]: string[];
}

const PREDEFINED_SYMPTOMS: SymptomsByCategory = {
  Pain: ['Joint pain', 'Muscle pain', 'Headache', 'Back pain', 'Nerve pain'],
  Fatigue: ['General fatigue', 'Brain fog', 'Post-exertional malaise'],
  Digestive: ['Nausea', 'Bloating', 'Abdominal pain', 'Diarrhea'],
  Skin: ['Rash', 'Itching', 'Swelling', 'Dry skin'],
  Other: ['Fever', 'Dizziness', 'Insomnia', 'Anxiety', 'Depression'],
};

type SelectedSymptomType = {
  symptom_name: string;
  category: string;
};

const SymptomsScreen: React.FC<Props> = ({ navigation }) => {
  const [selectedSymptoms, setSelectedSymptoms] = useState<
    SelectedSymptomType[]
  >([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [customSymptomName, setCustomSymptomName] = useState('');
  const [customSymptomCategory, setCustomSymptomCategory] =
    useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const session = useSessionStore((state) => state.session);
  const addSymptom = useProfileStore((state) => state.addSymptom);

  const handleSymptomToggle = (symptom: string, category: string) => {
    setSelectedSymptoms((prev) => {
      const isSelected = prev.some(
        (s) => s.symptom_name === symptom && s.category === category
      );
      if (isSelected) {
        return prev.filter(
          (s) => !(s.symptom_name === symptom && s.category === category)
        );
      } else {
        return [...prev, { symptom_name: symptom, category }];
      }
    });
  };

  const handleAddCustomSymptom = () => {
    if (!customSymptomName.trim() || !customSymptomCategory) {
      alert('Please enter symptom name and select a category');
      return;
    }

    setSelectedSymptoms((prev) => [
      ...prev,
      {
        symptom_name: customSymptomName.trim(),
        category: customSymptomCategory,
      },
    ]);

    setCustomSymptomName('');
    setCustomSymptomCategory(null);
    setShowAddModal(false);
  };

  const handleNext = async () => {
    if (selectedSymptoms.length === 0) {
      alert('Please select at least one symptom');
      return;
    }

    if (!session?.user?.id) {
      alert('No user session found');
      return;
    }

    setLoading(true);
    try {
      for (const symptom of selectedSymptoms) {
        const { data, error } = await supabase
          .from('user_symptoms')
          .insert({
            user_id: session.user.id,
            symptom_name: symptom.symptom_name,
            category: symptom.category,
            is_active: true,
          })
          .select()
          .single();

        if (error) throw error;
        addSymptom(data);
      }

      navigation.navigate('OnboardingMeds');
    } catch (error) {
      console.error('Error saving symptoms:', error);
      alert('Failed to save symptoms. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isSymptomSelected = (symptom: string, category: string) => {
    return selectedSymptoms.some(
      (s) => s.symptom_name === symptom && s.category === category
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>What symptoms do you experience?</Text>
        <Text style={styles.subtitle}>
          Select all that apply or add your own
        </Text>

        {Object.entries(PREDEFINED_SYMPTOMS).map(([category, symptoms]) => (
          <View key={category}>
            <Text style={styles.categoryHeader}>{category}</Text>
            {symptoms.map((symptom) => (
              <TouchableOpacity
                key={symptom}
                style={[
                  styles.checklistItem,
                  isSymptomSelected(symptom, category) &&
                    styles.checklistItemSelected,
                ]}
                onPress={() => handleSymptomToggle(symptom, category)}
              >
                <View
                  style={[
                    styles.checkbox,
                    isSymptomSelected(symptom, category) &&
                      styles.checkboxSelected,
                  ]}
                >
                  {isSymptomSelected(symptom, category) && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </View>
                <Text style={styles.checklistText}>{symptom}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}

        <Button
          title="+ Add custom symptom"
          variant="secondary"
          onPress={() => setShowAddModal(true)}
          style={styles.addButton}
        />

        {selectedSymptoms.length > 0 && (
          <View style={styles.selectedContainer}>
            <Text style={styles.selectedLabel}>
              Selected ({selectedSymptoms.length})
            </Text>
            {selectedSymptoms.map((symptom, index) => (
              <View key={index} style={styles.selectedTag}>
                <Text style={styles.selectedTagText}>
                  {symptom.symptom_name}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add custom symptom</Text>

            <Input
              label="Symptom name"
              value={customSymptomName}
              onChangeText={setCustomSymptomName}
              placeholder="e.g., Swollen joints"
            />

            <View>
              <Text style={styles.label}>Category</Text>
              <View style={styles.categoryGrid}>
                {SYMPTOM_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryOption,
                      customSymptomCategory === cat &&
                        styles.categoryOptionSelected,
                    ]}
                    onPress={() => setCustomSymptomCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.categoryOptionText,
                        customSymptomCategory === cat &&
                          styles.categoryOptionTextSelected,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.modalButtons}>
              <Button
                title="Add"
                onPress={handleAddCustomSymptom}
                style={styles.modalButton}
              />
              <Button
                title="Cancel"
                variant="secondary"
                onPress={() => {
                  setShowAddModal(false);
                  setCustomSymptomName('');
                  setCustomSymptomCategory(null);
                }}
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>

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
  categoryHeader: {
    ...typography.sectionHeader,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
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
  addButton: {
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  selectedContainer: {
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginTop: spacing.lg,
  },
  selectedLabel: {
    ...typography.sectionHeader,
    marginBottom: spacing.md,
  },
  selectedTag: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    alignSelf: 'flex-start',
  },
  selectedTagText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.xxl,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    maxHeight: '90%',
  },
  modalTitle: {
    ...typography.screenTitle,
    fontSize: 18,
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.darkGray,
    marginBottom: spacing.sm,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  categoryOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.lightGray,
  },
  categoryOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryOptionText: {
    fontSize: 13,
    color: colors.darkGray,
  },
  categoryOptionTextSelected: {
    color: colors.white,
    fontWeight: '600',
  },
  modalButtons: {
    gap: spacing.md,
  },
  modalButton: {
    marginBottom: spacing.sm,
  },
});

export default SymptomsScreen;
