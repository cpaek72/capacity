import React, { useState, useCallback, useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Modal,
  FlatList,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, borderRadius, typography } from '../../../lib/theme';
import Button from '../../../components/Button';
import Card from '../../../components/Card';
import Input from '../../../components/Input';
import SliderRow from '../../../components/SliderRow';
import Chip from '../../../components/Chip';
import ConfirmModal from '../../../components/ConfirmModal';
import BottomSheet from '../../../components/BottomSheet';
import HeaderActionButton from '../../../components/HeaderActionButton';
import { showToast } from '../../../components/Toast';
import { supabase } from '../../../lib/supabase';
import { useSessionStore } from '../../../store/useSessionStore';
import { useProfileStore } from '../../../store/useProfileStore';
import { formatDate, toISODateString } from '../../../lib/dates';
import { DEFAULT_TRIGGERS, MOOD_OPTIONS, SYMPTOM_CATEGORIES } from '../../../types/models';
import { EntryFormData, MedFormData, SymptomFormData } from '../../../types/models';

type RootStackParamList = {
  NewEntry: { date: string };
};

type Props = NativeStackScreenProps<RootStackParamList, 'NewEntry'>;

interface FormState {
  entry_date: string;
  flare_rating: number;
  symptoms: {
    symptom_id: string;
    symptom_name: string;
    severity: number;
    is_present: boolean;
  }[];
  triggers: string[];
  meds: {
    med_id: string;
    med_name: string;
    taken: boolean;
    reason_not_taken: string | null;
  }[];
  sleep_hours: number;
  sleep_quality: number;
  stress: number;
  mood: string | null;
  notes: string;
}

const NewEntryScreen: React.FC<Props> = ({ navigation, route }) => {
  const dateParam = route.params?.date || toISODateString();
  const [form, setForm] = useState<FormState>({
    entry_date: dateParam,
    flare_rating: 5,
    symptoms: [],
    triggers: [],
    meds: [],
    sleep_hours: 8,
    sleep_quality: 3,
    stress: 5,
    mood: null,
    notes: '',
  });

  const [isDirty, setIsDirty] = useState(false);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [showCustomTriggerModal, setShowCustomTriggerModal] = useState(false);
  const [customTrigger, setCustomTrigger] = useState('');
  const [showAddSymptomModal, setShowAddSymptomModal] = useState(false);
  const [savingLoading, setSavingLoading] = useState(false);
  const [customSymptomName, setCustomSymptomName] = useState('');
  const [selectedSymptomCategory, setSelectedSymptomCategory] = useState('');

  const session = useSessionStore((state) => state.session);
  const symptoms = useProfileStore((state) => state.symptoms);
  const meds = useProfileStore((state) => state.meds);

  const handleFormChange = useCallback(() => {
    setIsDirty(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!session?.user?.id) {
      showToast('error', 'No user session found');
      return;
    }

    if (!form.entry_date.trim()) {
      showToast('error', 'Please select a date');
      return;
    }

    setSavingLoading(true);
    try {
      const { data: entryData, error: entryError } = await supabase
        .from('entries')
        .insert([
          {
            user_id: session.user.id,
            entry_date: form.entry_date,
            flare_rating: form.flare_rating,
            sleep_hours: form.sleep_hours,
            sleep_quality: form.sleep_quality,
            stress: form.stress,
            mood: form.mood,
            notes: form.notes,
          },
        ])
        .select()
        .single();

      if (entryError) throw entryError;

      if (entryData) {
        // Insert symptoms
        if (form.symptoms.length > 0) {
          const symptomInserts = form.symptoms.map((s) => ({
            entry_id: entryData.id,
            symptom_id: s.symptom_id,
            severity: s.is_present ? s.severity : null,
            is_present: s.is_present,
          }));
          const { error: symptomsError } = await supabase
            .from('entry_symptoms')
            .insert(symptomInserts);
          if (symptomsError) throw symptomsError;
        }

        // Insert triggers
        if (form.triggers.length > 0) {
          const triggerInserts = form.triggers.map((t) => ({
            entry_id: entryData.id,
            trigger_name: t,
          }));
          const { error: triggersError } = await supabase
            .from('entry_triggers')
            .insert(triggerInserts);
          if (triggersError) throw triggersError;
        }

        // Insert meds
        if (form.meds.length > 0) {
          const medInserts = form.meds.map((m) => ({
            entry_id: entryData.id,
            med_id: m.med_id,
            taken: m.taken,
            reason_not_taken: m.reason_not_taken,
          }));
          const { error: medsError } = await supabase
            .from('entry_meds')
            .insert(medInserts);
          if (medsError) throw medsError;
        }
      }

      showToast('success', 'Check-in saved');
      setIsDirty(false);
      navigation.goBack();
    } catch (error) {
      console.error('Error saving entry:', error);
      showToast('error', 'Failed to save check-in');
    } finally {
      setSavingLoading(false);
    }
  }, [form, session?.user?.id, navigation]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <HeaderActionButton
          title="Save"
          onPress={handleSave}
          disabled={savingLoading}
        />
      ),
      headerTitle: 'New Check-in',
    });
  }, [navigation, handleSave, savingLoading]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!isDirty) return;
      e.preventDefault();
      setShowDiscardModal(true);
    });
    return unsubscribe;
  }, [isDirty, navigation]);

  const handleAddSymptom = useCallback(
    (symptom: any) => {
      const existingSymptom = form.symptoms.find((s) => s.symptom_id === symptom.id);
      if (!existingSymptom) {
        setForm((prev) => ({
          ...prev,
          symptoms: [
            ...prev.symptoms,
            {
              symptom_id: symptom.id,
              symptom_name: symptom.symptom_name,
              severity: 5,
              is_present: true,
            },
          ],
        }));
        handleFormChange();
      }
      setShowAddSymptomModal(false);
    },
    [form.symptoms, handleFormChange]
  );

  const handleCreateCustomSymptom = useCallback(() => {
    if (!customSymptomName.trim() || !selectedSymptomCategory) {
      showToast('error', 'Please fill in all fields');
      return;
    }

    // For MVP, use a temporary ID
    const tempId = `custom_${Date.now()}`;
    setForm((prev) => ({
      ...prev,
      symptoms: [
        ...prev.symptoms,
        {
          symptom_id: tempId,
          symptom_name: customSymptomName,
          severity: 5,
          is_present: true,
        },
      ],
    }));
    handleFormChange();
    setCustomSymptomName('');
    setSelectedSymptomCategory('');
    setShowAddSymptomModal(false);
  }, [customSymptomName, selectedSymptomCategory, handleFormChange]);

  const handleAddCustomTrigger = useCallback(() => {
    if (!customTrigger.trim()) return;

    if (!form.triggers.includes(customTrigger)) {
      setForm((prev) => ({
        ...prev,
        triggers: [...prev.triggers, customTrigger],
      }));
      handleFormChange();
    }
    setCustomTrigger('');
    setShowCustomTriggerModal(false);
  }, [customTrigger, form.triggers, handleFormChange]);

  const handleUpdateSymptom = useCallback(
    (symptomId: string, updates: Partial<typeof form.symptoms[0]>) => {
      setForm((prev) => ({
        ...prev,
        symptoms: prev.symptoms.map((s) =>
          s.symptom_id === symptomId ? { ...s, ...updates } : s
        ),
      }));
      handleFormChange();
    },
    [handleFormChange]
  );

  const handleRemoveSymptom = useCallback(
    (symptomId: string) => {
      setForm((prev) => ({
        ...prev,
        symptoms: prev.symptoms.filter((s) => s.symptom_id !== symptomId),
      }));
      handleFormChange();
    },
    [handleFormChange]
  );

  const handleToggleTrigger = useCallback(
    (trigger: string) => {
      setForm((prev) => ({
        ...prev,
        triggers: prev.triggers.includes(trigger)
          ? prev.triggers.filter((t) => t !== trigger)
          : [...prev.triggers, trigger],
      }));
      handleFormChange();
    },
    [handleFormChange]
  );

  const handleToggleMed = useCallback(
    (medId: string) => {
      setForm((prev) => ({
        ...prev,
        meds: prev.meds.map((m) =>
          m.med_id === medId
            ? { ...m, taken: !m.taken, reason_not_taken: null }
            : m
        ),
      }));
      handleFormChange();
    },
    [handleFormChange]
  );

  const handleUpdateMedReason = useCallback(
    (medId: string, reason: string) => {
      setForm((prev) => ({
        ...prev,
        meds: prev.meds.map((m) =>
          m.med_id === medId ? { ...m, reason_not_taken: reason } : m
        ),
      }));
      handleFormChange();
    },
    [handleFormChange]
  );

  // Initialize meds
  useEffect(() => {
    if (form.meds.length === 0 && meds.length > 0) {
      const initialMeds = meds.map((m) => ({
        med_id: m.id,
        med_name: m.med_name,
        taken: false,
        reason_not_taken: null,
      }));
      setForm((prev) => ({ ...prev, meds: initialMeds }));
    }
  }, [meds]);

  // Initialize symptoms
  useEffect(() => {
    if (form.symptoms.length === 0 && symptoms.length > 0) {
      const initialSymptoms = symptoms
        .filter((s) => s.is_active)
        .map((s) => ({
          symptom_id: s.id,
          symptom_name: s.symptom_name,
          severity: 5,
          is_present: false,
        }));
      setForm((prev) => ({ ...prev, symptoms: initialSymptoms }));
    }
  }, [symptoms]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Date Selector */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Date</Text>
          <TouchableOpacity style={styles.dateInput}>
            <Text style={styles.dateText}>{formatDate(form.entry_date)}</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.hiddenDateInput}
            value={form.entry_date}
            onChangeText={(text) => {
              setForm((prev) => ({ ...prev, entry_date: text }));
              handleFormChange();
            }}
            placeholder="YYYY-MM-DD"
          />
        </Card>

        {/* Overall Flare Rating */}
        <Card style={styles.section}>
          <SliderRow
            label="Overall Flare Rating"
            value={form.flare_rating}
            onValueChange={(value) => {
              setForm((prev) => ({ ...prev, flare_rating: value }));
              handleFormChange();
            }}
            min={0}
            max={10}
            showValue
          />
        </Card>

        {/* Symptoms */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Symptoms</Text>
          {form.symptoms.map((symptom) => (
            <View key={symptom.symptom_id} style={styles.symptomRow}>
              <View style={styles.symptomHeader}>
                <Text style={styles.symptomName}>{symptom.symptom_name}</Text>
                <TouchableOpacity
                  onPress={() => handleRemoveSymptom(symptom.symptom_id)}
                >
                  <Text style={styles.removeButton}>✕</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.symptomControls}>
                <View style={styles.switchContainer}>
                  <Text style={styles.label}>Not present</Text>
                  <Switch
                    value={!symptom.is_present}
                    onValueChange={(value) => {
                      handleUpdateSymptom(symptom.symptom_id, {
                        is_present: !value,
                      });
                    }}
                  />
                </View>
              </View>
              {symptom.is_present && (
                <SliderRow
                  label="Severity"
                  value={symptom.severity}
                  onValueChange={(value) => {
                    handleUpdateSymptom(symptom.symptom_id, { severity: value });
                  }}
                  min={0}
                  max={10}
                  showValue
                />
              )}
            </View>
          ))}
          <Button
            title="+ Add symptom for today"
            onPress={() => setShowAddSymptomModal(true)}
            variant="text"
            style={styles.addButton}
          />
        </Card>

        {/* Triggers */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Triggers</Text>
          <View style={styles.chipRow}>
            {DEFAULT_TRIGGERS.map((trigger) => (
              <Chip
                key={trigger}
                label={trigger}
                selected={form.triggers.includes(trigger)}
                onPress={() => handleToggleTrigger(trigger)}
                style={styles.chip}
              />
            ))}
          </View>
          <Chip
            label="+ Custom trigger"
            selected={false}
            onPress={() => setShowCustomTriggerModal(true)}
            style={styles.customChip}
          />
        </Card>

        {/* Meds */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Medications</Text>
          {form.meds.length === 0 ? (
            <Text style={styles.emptyText}>No medications added</Text>
          ) : (
            form.meds.map((med) => (
              <View key={med.med_id} style={styles.medItem}>
                <TouchableOpacity
                  style={styles.medCheckbox}
                  onPress={() => handleToggleMed(med.med_id)}
                >
                  <Text style={styles.checkmark}>
                    {med.taken ? '✓' : ''}
                  </Text>
                </TouchableOpacity>
                <Text style={[styles.medName, med.taken && styles.medNameTaken]}>
                  {med.med_name}
                </Text>
              </View>
            ))
          )}
        </Card>

        {/* Sleep */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Sleep</Text>
          <View style={styles.sleepHoursContainer}>
            <Text style={styles.label}>Sleep Hours</Text>
            <View style={styles.steeperContainer}>
              <TouchableOpacity
                style={styles.steeperButton}
                onPress={() =>
                  setForm((prev) => ({
                    ...prev,
                    sleep_hours: Math.max(0, prev.sleep_hours - 1),
                  }))
                }
              >
                <Text style={styles.steeperText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.steeperValue}>{form.sleep_hours}</Text>
              <TouchableOpacity
                style={styles.steeperButton}
                onPress={() =>
                  setForm((prev) => ({
                    ...prev,
                    sleep_hours: Math.min(14, prev.sleep_hours + 1),
                  }))
                }
              >
                <Text style={styles.steeperText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
          <SliderRow
            label="Sleep Quality"
            value={form.sleep_quality}
            onValueChange={(value) => {
              setForm((prev) => ({ ...prev, sleep_quality: value }));
              handleFormChange();
            }}
            min={1}
            max={5}
            showValue
          />
        </Card>

        {/* Stress */}
        <Card style={styles.section}>
          <SliderRow
            label="Stress Level"
            value={form.stress}
            onValueChange={(value) => {
              setForm((prev) => ({ ...prev, stress: value }));
              handleFormChange();
            }}
            min={1}
            max={5}
            showValue
          />
        </Card>

        {/* Mood */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Mood</Text>
          <View style={styles.chipRow}>
            {MOOD_OPTIONS.map((mood) => (
              <Chip
                key={mood.value}
                label={mood.label}
                selected={form.mood === mood.value}
                onPress={() => {
                  setForm((prev) => ({ ...prev, mood: mood.value }));
                  handleFormChange();
                }}
                style={styles.chip}
              />
            ))}
          </View>
        </Card>

        {/* Notes */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <Input
            value={form.notes}
            onChangeText={(text) => {
              setForm((prev) => ({ ...prev, notes: text }));
              handleFormChange();
            }}
            placeholder="Add any additional notes..."
            multiline
            style={styles.notesInput}
          />
        </Card>
      </ScrollView>

      {/* Discard Modal */}
      <ConfirmModal
        visible={showDiscardModal}
        title="Discard changes?"
        message="You have unsaved changes. Are you sure you want to discard them?"
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        destructive
        onConfirm={() => {
          setShowDiscardModal(false);
          setIsDirty(false);
          navigation.goBack();
        }}
        onCancel={() => setShowDiscardModal(false)}
      />

      {/* Custom Trigger Modal */}
      <BottomSheet
        visible={showCustomTriggerModal}
        onClose={() => {
          setShowCustomTriggerModal(false);
          setCustomTrigger('');
        }}
        title="Add custom trigger"
      >
        <Input
          value={customTrigger}
          onChangeText={setCustomTrigger}
          placeholder="Enter trigger"
          style={styles.modalInput}
        />
        <Button
          title="Add trigger"
          onPress={handleAddCustomTrigger}
          disabled={!customTrigger.trim()}
          style={styles.modalButton}
        />
      </BottomSheet>

      {/* Add Symptom Modal */}
      <BottomSheet
        visible={showAddSymptomModal}
        onClose={() => {
          setShowAddSymptomModal(false);
          setCustomSymptomName('');
          setSelectedSymptomCategory('');
        }}
        title="Add symptom"
      >
        <FlatList
          data={symptoms.filter((s) => s.is_active)}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.symptomOption}
              onPress={() => handleAddSymptom(item)}
            >
              <Text style={styles.symptomOptionText}>{item.symptom_name}</Text>
            </TouchableOpacity>
          )}
        />
        <View style={styles.divider} />
        <Text style={styles.customTitle}>Or create a custom symptom</Text>
        <Input
          value={customSymptomName}
          onChangeText={setCustomSymptomName}
          placeholder="Symptom name"
          style={styles.modalInput}
        />
        <TouchableOpacity style={styles.categoryPicker}>
          <Text style={styles.categoryPickerText}>
            {selectedSymptomCategory || 'Select category'}
          </Text>
        </TouchableOpacity>
        <FlatList
          data={SYMPTOM_CATEGORIES}
          keyExtractor={(item) => item}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.categoryOption,
                selectedSymptomCategory === item && styles.categoryOptionSelected,
              ]}
              onPress={() => setSelectedSymptomCategory(item)}
            >
              <Text
                style={[
                  styles.categoryOptionText,
                  selectedSymptomCategory === item &&
                    styles.categoryOptionTextSelected,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />
        <Button
          title="Create symptom"
          onPress={handleCreateCustomSymptom}
          disabled={!customSymptomName.trim() || !selectedSymptomCategory}
          style={styles.modalButton}
        />
      </BottomSheet>
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
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.sectionHeader,
    marginBottom: spacing.md,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: colors.lightGray,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    justifyContent: 'center',
  },
  dateText: {
    ...typography.body,
    color: colors.darkGray,
  },
  hiddenDateInput: {
    display: 'none',
  },
  label: {
    ...typography.body,
    fontWeight: '500',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  chip: {
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  customChip: {
    marginTop: spacing.md,
  },
  addButton: {
    marginTop: spacing.md,
  },
  symptomRow: {
    marginBottom: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  symptomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  symptomName: {
    ...typography.sectionHeader,
  },
  removeButton: {
    fontSize: 20,
    color: colors.error,
    fontWeight: '500',
  },
  symptomControls: {
    marginBottom: spacing.md,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  medItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  medCheckbox: {
    width: 32,
    height: 32,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  checkmark: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: '600',
  },
  medName: {
    ...typography.body,
    flex: 1,
  },
  medNameTaken: {
    textDecorationLine: 'line-through',
    color: colors.midGray,
  },
  emptyText: {
    ...typography.secondary,
    fontStyle: 'italic',
  },
  sleepHoursContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  steeperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  steeperButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  steeperText: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: '600',
  },
  steeperValue: {
    ...typography.sectionHeader,
    color: colors.primary,
    minWidth: 30,
    textAlign: 'center',
  },
  notesInput: {
    minHeight: 100,
  },
  modalInput: {
    marginBottom: spacing.md,
  },
  modalButton: {
    marginTop: spacing.md,
  },
  symptomOption: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  symptomOptionText: {
    ...typography.body,
  },
  divider: {
    height: 1,
    backgroundColor: colors.lightGray,
    marginVertical: spacing.lg,
  },
  customTitle: {
    ...typography.sectionHeader,
    marginBottom: spacing.md,
  },
  categoryPicker: {
    borderWidth: 1,
    borderColor: colors.lightGray,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  categoryPickerText: {
    ...typography.body,
    color: colors.darkGray,
  },
  categoryOption: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.lightGray,
  },
  categoryOptionSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  categoryOptionText: {
    ...typography.body,
    color: colors.darkGray,
  },
  categoryOptionTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
});

export default NewEntryScreen;
