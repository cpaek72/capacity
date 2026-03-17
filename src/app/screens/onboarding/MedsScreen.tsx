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
import Card from '../../../components/Card';
import { supabase } from '../../../lib/supabase';
import { useSessionStore } from '../../../store/useSessionStore';
import { useProfileStore } from '../../../store/useProfileStore';
import { ScheduleType } from '../../../types/db';

type RootStackParamList = {
  OnboardingMeds: undefined;
  OnboardingPrivacy: undefined;
  OnboardingSymptoms: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'OnboardingMeds'>;

interface Med {
  med_name: string;
  dose: string;
  schedule_type: ScheduleType;
  times: string[];
  notes: string;
}

const SCHEDULE_OPTIONS: { label: string; value: ScheduleType }[] = [
  { label: 'Daily', value: 'daily' },
  { label: 'As needed', value: 'as_needed' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Other', value: 'other' },
];

const MedsScreen: React.FC<Props> = ({ navigation }) => {
  const [meds, setMeds] = useState<Med[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState<Med>({
    med_name: '',
    dose: '',
    schedule_type: 'daily',
    times: [],
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const session = useSessionStore((state) => state.session);
  const addMed = useProfileStore((state) => state.addMed);

  const handleOpenModal = (index?: number) => {
    if (index !== undefined) {
      setEditingIndex(index);
      setFormData({ ...meds[index] });
    } else {
      setEditingIndex(null);
      setFormData({
        med_name: '',
        dose: '',
        schedule_type: 'daily',
        times: [],
        notes: '',
      });
    }
    setShowAddModal(true);
  };

  const handleSaveMed = () => {
    if (!formData.med_name.trim() || !formData.dose.trim()) {
      alert('Please enter medication name and dose');
      return;
    }

    if (editingIndex !== null) {
      const updatedMeds = [...meds];
      updatedMeds[editingIndex] = formData;
      setMeds(updatedMeds);
    } else {
      setMeds((prev) => [...prev, formData]);
    }

    setShowAddModal(false);
    setFormData({
      med_name: '',
      dose: '',
      schedule_type: 'daily',
      times: [],
      notes: '',
    });
  };

  const handleDeleteMed = (index: number) => {
    setMeds((prev) => prev.filter((_, i) => i !== index));
  };

  const handleNext = async (skipMeds: boolean = false) => {
    if (!skipMeds && meds.length === 0) {
      alert('Please add at least one medication or skip meds');
      return;
    }

    if (!session?.user?.id) {
      alert('No user session found');
      return;
    }

    setLoading(true);
    try {
      if (!skipMeds) {
        for (const med of meds) {
          const { data, error } = await supabase
            .from('user_meds')
            .insert({
              user_id: session.user.id,
              med_name: med.med_name,
              dose: med.dose,
              schedule_type: med.schedule_type,
              times: med.times,
              notes: med.notes,
              is_active: true,
            })
            .select()
            .single();

          if (error) throw error;
          addMed(data);
        }
      }

      navigation.navigate('OnboardingPrivacy');
    } catch (error) {
      console.error('Error saving medications:', error);
      alert('Failed to save medications. Please try again.');
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
        <Text style={styles.title}>What medications do you take?</Text>
        <Text style={styles.subtitle}>Optional - you can skip this step</Text>

        {meds.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No medications added yet</Text>
          </View>
        ) : (
          <View>
            {meds.map((med, index) => (
              <Card key={index} style={styles.medCard}>
                <View style={styles.medHeader}>
                  <View style={styles.medInfo}>
                    <Text style={styles.medName}>{med.med_name}</Text>
                    <Text style={styles.medDose}>{med.dose}</Text>
                    <Text style={styles.medSchedule}>{med.schedule_type}</Text>
                  </View>
                  <View style={styles.medActions}>
                    <TouchableOpacity
                      onPress={() => handleOpenModal(index)}
                      style={styles.actionButton}
                    >
                      <Text style={styles.actionText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteMed(index)}
                      style={[styles.actionButton, styles.deleteButton]}
                    >
                      <Text style={[styles.actionText, styles.deleteText]}>
                        Delete
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        )}

        <Button
          title="+ Add medication"
          variant="secondary"
          onPress={() => handleOpenModal()}
          style={styles.addButton}
        />
      </ScrollView>

      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {editingIndex !== null ? 'Edit medication' : 'Add medication'}
              </Text>

              <Input
                label="Medication name"
                value={formData.med_name}
                onChangeText={(text) =>
                  setFormData({ ...formData, med_name: text })
                }
                placeholder="e.g., Ibuprofen"
              />

              <Input
                label="Dose"
                value={formData.dose}
                onChangeText={(text) =>
                  setFormData({ ...formData, dose: text })
                }
                placeholder="e.g., 500mg"
              />

              <View>
                <Text style={styles.label}>Schedule</Text>
                <View style={styles.scheduleButtons}>
                  {SCHEDULE_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.scheduleButton,
                        formData.schedule_type === option.value &&
                          styles.scheduleButtonSelected,
                      ]}
                      onPress={() =>
                        setFormData({
                          ...formData,
                          schedule_type: option.value,
                        })
                      }
                    >
                      <Text
                        style={[
                          styles.scheduleButtonText,
                          formData.schedule_type === option.value &&
                            styles.scheduleButtonTextSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <Input
                label="Times (e.g., 8:00 AM, 8:00 PM)"
                value={formData.times.join(', ')}
                onChangeText={(text) =>
                  setFormData({
                    ...formData,
                    times: text.split(',').map((t) => t.trim()),
                  })
                }
                placeholder="Leave blank if not applicable"
              />

              <Input
                label="Notes (optional)"
                value={formData.notes}
                onChangeText={(text) =>
                  setFormData({ ...formData, notes: text })
                }
                placeholder="e.g., Take with food"
                multiline
              />

              <View style={styles.modalButtons}>
                <Button
                  title="Save"
                  onPress={handleSaveMed}
                  style={styles.modalButton}
                />
                <Button
                  title="Cancel"
                  variant="secondary"
                  onPress={() => setShowAddModal(false)}
                  style={styles.modalButton}
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <View style={styles.footer}>
        <Button
          title="Next"
          onPress={() => handleNext(false)}
          loading={loading}
          disabled={loading}
        />
        <Button
          title="Skip meds"
          variant="secondary"
          onPress={() => handleNext(true)}
          disabled={loading}
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
  emptyState: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.secondary,
  },
  medCard: {
    marginBottom: spacing.md,
  },
  medHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  medInfo: {
    flex: 1,
  },
  medName: {
    ...typography.sectionHeader,
    marginBottom: spacing.sm,
  },
  medDose: {
    ...typography.body,
    color: colors.midGray,
    marginBottom: spacing.xs,
  },
  medSchedule: {
    ...typography.secondary,
    color: colors.primary,
  },
  medActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  deleteButton: {
    borderColor: colors.error,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  deleteText: {
    color: colors.error,
  },
  addButton: {
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  footer: {
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  skipButton: {
    marginTop: spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalScrollContent: {
    paddingBottom: spacing.xxl,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    minHeight: '50%',
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
  scheduleButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  scheduleButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.lightGray,
  },
  scheduleButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  scheduleButtonText: {
    fontSize: 13,
    color: colors.darkGray,
  },
  scheduleButtonTextSelected: {
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

export default MedsScreen;
