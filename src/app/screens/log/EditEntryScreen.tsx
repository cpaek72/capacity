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
  ActivityIndicator,
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
import { Entry, EntrySymptom, EntryTrigger, EntryMed } from '../../../types/db';

type RootStackParamList = {
  EditEntry: { entryId: string };
};

type Props = NativeStackScreenProps<RootStackParamList, 'EditEntry'>;

interface FormState {
  entry_date: string;
  flare_rating: number;
  symptoms: {
    id?: string;
    symptom_id: string;
    symptom_name: string;
    severity: number;
    is_present: boolean;
  }[];
  triggers: {
    id?: string;
    trigger_name: string;
  }[];
  meds: {
    id?: string;
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

const EditEntryScreen: React.FC<Props> = ({ navigation, route }) => {
  const entryId = route.params?.entryId;

  const [form, setForm] = useState<FormState>({
    entry_date: toISODateString(),
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

  const [initialForm, setInitialForm] = useState<FormState>(form);
  const [isDirty, setIsDirty] = useState(false);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCustomTriggerModal, setShowCustomTriggerModal] = useState(false);
  const [customTrigger, setCustomTrigger] = useState('');
  const [showAddSymptomModal, setShowAddSymptomModal] = useState(false);
  const [savingLoading, setSavingLoading] = useState(false);
  const [deletingLoading, setDeletingLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [customSymptomName, setCustomSymptomName] = useState('');
  const [selectedSymptomCategory, setSelectedSymptomCategory] = useState('');

  const session = useSessionStore((state) => state.session);
  const symptoms = useProfileStore((state) => state.symptoms);
  const meds = useProfileStore((state) => state.meds);

  const handleFormChange = useCallback(() => {
    setIsDirty(JSON.stringify(form) !== JSON.stringify(initialForm));
  }, [form, initialForm]);

  useEffect(() => {
    handleFormChange();
  }, [form, handleFormChange]);

  const fetchEntry = useCallback(async () => {
    if (!entryId) {
      showToast('error', 'No entry ID provided');
      return;
    }

    try {
      const [entryRes, symptomsRes, triggersRes, medsRes] = await Promise.all([
        supabase.from('entries').select('*').eq('id', entryId).single(),
        supabase.from('entry_symptoms').select('*').eq('entry_id', entryId),
        supabase.from('entry_triggers').select('*').eq('entry_id', entryId),
        supabase.from('entry_meds').select('*').eq('entry_id', entryId),
      ]);

      if (entryRes.error) throw entryRes.error;

      const entry = entryRes.data as Entry;

      const allSymptoms = symptoms;
      const formSymptoms = (symptomsRes.data || []).map((es: EntrySymptom) => {
        const sym = allSymptoms.find((s) => s.id === es.symptom_id);
        return {
          id: es.id,
          symptom_id: es.symptom_id,
          symptom_name: sym?.symptom_name || 'Unknown',
          severity: es.severity || 0,
          is_present: es.is_present,
        };
      });

      const formTriggers = (triggersRes.data || []).map((et: EntryTrigger) => ({
        id: et.id,
        trigger_name: et.trigger_name,
      }));

      const allMeds = meds;
      const formMeds = allMeds.map((m) => {
        const em = (medsRes.data || []).find((x: EntryMed) => x.med_id === m.id);
        return {
          id: em?.id,
          med_id: m.id,
          med_name: m.med_name,
          taken: em?.taken || false,
          reason_not_taken: em?.reason_not_taken || null,
        };
      });

      const newForm: FormState = {
        entry_date: entry.entry_date,
        flare_rating: entry.flare_rating,
        symptoms: formSymptoms,
        triggers: formTriggers,
        meds: formMeds,
        sleep_hours: entry.sleep_hours,
        sleep_quality: entry.sleep_quality,
        stress: entry.stress,
        mood: entry.mood,
        notes: entry.notes,
      };

      setForm(newForm);
      setInitialForm(newForm);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching entry:', error);
      showToast('error', 'Failed to load entry');
      navigation.goBack();
    }
  }, [entryId, symptoms, meds, navigation]);

  useEffect(() => {
    fetchEntry();
  }, [fetchEntry]);

  const handleUpdate = useCallback(async () => {
    if (!session?.user?.id || !entryId) {
      showToast('error', 'Missing user or entry ID');
      return;
    }

    setSavingLoading(true);
    try {
      // Update entry
      const { error: updateError } = await supabase
        .from('entries')
        .update({
          flare_rating: form.flare_rating,
          sleep_hours: form.sleep_hours,
          sleep_quality: form.sleep_quality,
          stress: form.stress,
          mood: form.mood,
          notes: form.notes,
        })
        .eq('id', entryId);

      if (updateError) throw updateError;

      // Delete and re-insert symptoms
      await supabase.from('entry_symptoms').delete().eq('entry_id', entryId);
      if (form.symptoms.length > 0) {
        const symptomInserts = form.symptoms.map((s) => ({
          entry_id: entryId,
          symptom_id: s.symptom_id,
          severity: s.is_present ? s.severity : null,
          is_present: s.is_present,
        }));
        const { error } = await supabase
          .from('entry_symptoms')
          .insert(symptomInserts);
        if (error) throw error;
      }

      // Delete and re-insert triggers
      await supabase.from('entry_triggers').delete().eq('entry_id', entryId);
      if (form.triggers.length > 0) {
        const triggerInserts = form.triggers.map((t) => ({
          entry_id: entryId,
          trigger_name: t.trigger_name,
        }));
        const { error } = await supabase
          .from('entry_triggers')
          .insert(triggerInserts);
        if (error) throw error;
      }

      // Delete and re-insert meds
      await supabase.from('entry_meds').delete().eq('entry_id', entryId);
      if (form.meds.some((m) => m.taken)) {
        const medInserts = form.meds
          .filter((m) => m.taken)
          .map((m) => ({
            entry_id: entryId,
            med_id: m.med_id,
            taken: m.taken,
            reason_not_taken: m.reason_not_taken,
          }));
        const { error } = await supabase.from('entry_meds').insert(medInserts);
        if (error) throw error;
      }

      showToast('success', 'Check-in updated');
      setIsDirty(false);
      navigation.goBack();
    } catch (error) {
      console.error('Error updating entry:', error);
      showToast('error', 'Failed to update check-in');
    } finally {
      setSavingLoading(false);
    }
  }, [form, session?.user?.id, entryId, navigation]);

  const handleDelete = useCallback(async () => {
    if (!entryId) return;

    setDeletingLoading(true);
    try {
      await Promise.all([
        supabase.from('entry_symptoms').delete().eq('entry_id', entryId),
        supabase.from('entry_triggers').delete().eq('entry_id', entryId),
        supabase.from('entry_meds').delete().eq('entry_id', entryId),
        supabase.from('entries').delete().eq('id', entryId),
      ]);

      showToast('success', 'Entry deleted');
      setIsDirty(false);
      navigation.goBack();
    } catch (error) {
      console.error('Error deleting entry:', error);
      showToast('error', 'Failed to delete entry');
    } finally {
      setDeletingLoading(false);
    }
  }, [entryId, navigation]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <HeaderActionButton
          title="Update"
          onPress={handleUpdate}
          disabled={savingLoading || !isDirty}
        />
      ),
      headerTitle: 'Edit Check-in',
    });
  }, [navigation, handleUpdate, savingLoading, isDirty]);

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
      }
      setShowAddSymptomModal(false);
    },
    [form.symptoms]
  );

  const handleCreateCustomSymptom = useCallback(() => {
    if (!customSymptomName.trim() || !selectedSymptomCategory) {
      showToast('error', 'Please fill in all fields');
      return;
    }

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
    setCustomSymptomName('');
    setSelectedSymptomCategory('');
    setShowAddSymptomModal(false);
  }, [customSymptomName, selectedSymptomCategory]);

  const handleAddCustomTrigger = useCallback(() => {
    if (!customTrigger.trim()) return;

    const triggerExists = form.triggers.some((t) => t.trigger_name === customTrigger);
    if (!triggerExists) {
      setForm((prev) => ({
        ...prev,
        triggers: [...prev.triggers, { trigger_name: customTrigger }],
      }));
    }
    setCustomTrigger('');
    setShowCustomTriggerModal(false);
  }, [customTrigger, form.triggers]);

  const handleUpdateSymptom = useCallback(
    (symptomId: string, updates: Partial<typeof form.symptoms[0]>) => {
      setForm((prev) => ({
        ...prev,
        symptoms: prev.symptoms.map((s) =>
          s.symptom_id === symptomId ? { ...s, ...updates } : s
        ),
      }));
    },
    []
  );

  const handleRemoveSymptom = useCallback(
    (symptomId: string) => {
      setForm((prev) => ({
        ...prev,
        symptoms: prev.symptoms.filter((s) => s.symptom_id !== symptomId),
      }));
    },
    []
  );

  const handleToggleTrigger = useCallback(
    (triggerName: string) => {
      setForm((prev) => ({
        ...prev,
        triggers: prev.triggers.some((t) => t.trigger_name === triggerName)
          ? prev.triggers.filter((t) => t.trigger_name !== triggerName)
          : [...prev.triggers, { trigger_name: triggerName }],
      }));
    },
    []
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
    },
    []
  );

  const handleUpdateMedReason = useCallback(
    (medId: string, reason: string) => {
      setForm((prev) => ({
        ...prev,
        meds: prev.meds.map((m) =>
          m.med_id === medId ? { ...m, reason_not_taken: reason } : m
        ),
      }));
    },
    []
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Date */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Date</Text>
          <TouchableOpacity style={styles.dateInput}>
            <Text style={styles.dateText}>{formatDate(form.entry_date)}</Text>
          </TouchableOpacity>
        </Card>

        {/* Overall Flare Rating */}
        <Card style={styles.section}>
          <SliderRow
            label="Overall Flare Rating"
            value={form.flare_rating}
            onValueChange={(value) => {
              setForm((prev) => ({ ...prev, flare_rating: value }));
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
            title="+ Add symptom"
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
                selected={form.triggers.some((t) => t.trigger_name === trigger)}
                onPress={() => handleToggleTrigger(trigger)}
                style={styles.chip}
              />
            ))}
          </View>
          {form.triggers
            .filter((t) => !DEFAULT_TRIGGERS.includes(t.trigger_name))
            .map((trigger) => (
              <Chip
                key={trigger.trigger_name}
                label={trigger.trigger_name}
                selected={true}
                onPress={() => handleToggleTrigger(trigger.trigger_name)}
                style={styles.chip}
              />
            ))}
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
            }}
            placeholder="Add any additional notes..."
            multiline
            style={styles.notesInput}
          />
        </Card>

        {/* Delete Button */}
        <Button
          title="Delete entry"
          onPress={() => setShowDeleteModal(true)}
          variant="secondary"
          style={[styles.section, styles.deleteButton]}
        />
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

      {/* Delete Modal */}
      <ConfirmModal
        visible={showDeleteModal}
        title="Delete entry?"
        message="This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        onConfirm={() => {
          setShowDeleteModal(false);
          handleDelete();
        }}
        onCancel={() => setShowDeleteModal(false)}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  deleteButton: {
    borderColor: colors.error,
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

export default EditEntryScreen;
