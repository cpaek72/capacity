import React, { useState, useCallback, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Switch,
  ScrollView,
  Pressable,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, borderRadius, typography } from '../../../lib/theme';
import Button from '../../../components/Button';
import ConfirmModal from '../../../components/ConfirmModal';
import BottomSheet from '../../../components/BottomSheet';
import { showToast } from '../../../components/Toast';
import { supabase } from '../../../lib/supabase';
import { useSessionStore } from '../../../store/useSessionStore';
import { useProfileStore } from '../../../store/useProfileStore';
import { UserMed } from '../../../types/db';

type RootStackParamList = {
  MedsManage: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'MedsManage'>;

const SCHEDULE_TYPES = ['daily', 'as_needed', 'weekly', 'other'] as const;

const MedsManageScreen: React.FC<Props> = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedMed, setSelectedMed] = useState<UserMed | null>(null);
  const [medName, setMedName] = useState('');
  const [dose, setDose] = useState('');
  const [selectedSchedule, setSelectedSchedule] = useState<'daily' | 'as_needed' | 'weekly' | 'other'>('daily');
  const [times, setTimes] = useState<string[]>(['']);
  const [notes, setNotes] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [updating, setUpdating] = useState(false);

  const session = useSessionStore((state) => state.session);
  const meds = useProfileStore((state) => state.meds);
  const addMed = useProfileStore((state) => state.addMed);
  const updateMed = useProfileStore((state) => state.updateMed);
  const removeMed = useProfileStore((state) => state.removeMed);
  const setMeds = useProfileStore((state) => state.setMeds);

  const loadMeds = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_meds')
        .select('*')
        .eq('user_id', session.user.id);

      if (error) throw error;
      setMeds(data || []);
    } catch (error) {
      console.error('Error loading meds:', error);
      showToast('error', 'Failed to load medications');
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id, setMeds]);

  useEffect(() => {
    loadMeds();
  }, [loadMeds]);

  useFocusEffect(
    useCallback(() => {
      loadMeds();
    }, [loadMeds])
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => {
            resetForm();
            setShowAddModal(true);
          }}
          style={{ marginRight: spacing.md }}
        >
          <Text style={[styles.headerButton, { color: colors.primary }]}>+ Add</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const resetForm = () => {
    setMedName('');
    setDose('');
    setSelectedSchedule('daily');
    setTimes(['']);
    setNotes('');
    setSelectedMed(null);
  };

  const validateForm = (): boolean => {
    if (!medName.trim() || !dose.trim()) {
      showToast('error', 'Please fill in medication name and dose');
      return false;
    }
    if (times.some((t) => t.trim() === '')) {
      showToast('error', 'Please fill in all time fields');
      return false;
    }
    return true;
  };

  const handleAddMed = async () => {
    if (!validateForm() || !session?.user?.id) {
      showToast('error', 'No user session found');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_meds')
        .insert({
          user_id: session.user.id,
          med_name: medName.trim(),
          dose: dose.trim(),
          schedule_type: selectedSchedule,
          times: times.filter((t) => t.trim()),
          notes: notes.trim(),
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      addMed(data);
      resetForm();
      setShowAddModal(false);
      showToast('success', 'Medication added');
    } catch (error) {
      console.error('Error adding medication:', error);
      showToast('error', 'Failed to add medication');
    }
  };

  const handleEditMed = async () => {
    if (!validateForm() || !selectedMed) return;

    setUpdating(true);
    try {
      const { data, error } = await supabase
        .from('user_meds')
        .update({
          med_name: medName.trim(),
          dose: dose.trim(),
          schedule_type: selectedSchedule,
          times: times.filter((t) => t.trim()),
          notes: notes.trim(),
        })
        .eq('id', selectedMed.id)
        .select()
        .single();

      if (error) throw error;

      updateMed(selectedMed.id, data);
      resetForm();
      setShowEditModal(false);
      showToast('success', 'Medication updated');
    } catch (error) {
      console.error('Error updating medication:', error);
      showToast('error', 'Failed to update medication');
    } finally {
      setUpdating(false);
    }
  };

  const handleToggleActive = async (med: UserMed) => {
    try {
      const { data, error } = await supabase
        .from('user_meds')
        .update({ is_active: !med.is_active })
        .eq('id', med.id)
        .select()
        .single();

      if (error) throw error;

      updateMed(med.id, data);
      showToast('success', `Medication ${!med.is_active ? 'activated' : 'deactivated'}`);
    } catch (error) {
      console.error('Error toggling medication:', error);
      showToast('error', 'Failed to update medication');
    }
  };

  const handleDeleteMed = async () => {
    if (!selectedMed) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('user_meds')
        .delete()
        .eq('id', selectedMed.id);

      if (error) throw error;

      removeMed(selectedMed.id);
      setShowDeleteConfirm(false);
      setSelectedMed(null);
      showToast('success', 'Medication deleted');
    } catch (error) {
      console.error('Error deleting medication:', error);
      showToast('error', 'Failed to delete medication');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={meds}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.medRow}
            onPress={() => {
              setSelectedMed(item);
              setMedName(item.med_name);
              setDose(item.dose);
              setSelectedSchedule(item.schedule_type);
              setTimes(item.times);
              setNotes(item.notes);
              setShowEditModal(true);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.medInfo}>
              <Text style={styles.medName}>{item.med_name}</Text>
              <Text style={styles.medDose}>{item.dose}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.scheduleText}>{item.schedule_type}</Text>
                {item.times.length > 0 && (
                  <Text style={styles.timesText}>{item.times.join(', ')}</Text>
                )}
              </View>
            </View>
            <View style={styles.medActions}>
              <Switch
                value={item.is_active}
                onValueChange={() => handleToggleActive(item)}
              />
              <TouchableOpacity
                onPress={() => {
                  setSelectedMed(item);
                  setShowDeleteConfirm(true);
                }}
                style={styles.deleteButton}
              >
                <Text style={styles.deleteButtonText}>×</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No medications added yet</Text>
            <Text style={styles.emptySubtext}>
              Track your medications and their schedules
            </Text>
          </View>
        }
      />

      <BottomSheet
        visible={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          resetForm();
        }}
      >
        <ScrollView style={styles.bottomSheetContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.bottomSheetTitle}>Add Medication</Text>

          <Text style={styles.fieldLabel}>Medication name</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Enter medication name"
            value={medName}
            onChangeText={setMedName}
            placeholderTextColor={colors.midGray}
          />

          <Text style={styles.fieldLabel}>Dose</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g., 500mg twice daily"
            value={dose}
            onChangeText={setDose}
            placeholderTextColor={colors.midGray}
          />

          <Text style={styles.fieldLabel}>Schedule</Text>
          <View style={styles.scheduleButtons}>
            {SCHEDULE_TYPES.map((schedule) => (
              <Pressable
                key={schedule}
                style={[
                  styles.scheduleButton,
                  selectedSchedule === schedule && styles.scheduleButtonSelected,
                ]}
                onPress={() => setSelectedSchedule(schedule)}
              >
                <Text
                  style={[
                    styles.scheduleButtonText,
                    selectedSchedule === schedule &&
                      styles.scheduleButtonTextSelected,
                  ]}
                >
                  {schedule}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Times</Text>
          {times.map((time, index) => (
            <View key={index} style={styles.timeInputRow}>
              <TextInput
                style={[styles.textInput, { flex: 1 }]}
                placeholder="e.g., 9:00 AM"
                value={time}
                onChangeText={(text) => {
                  const newTimes = [...times];
                  newTimes[index] = text;
                  setTimes(newTimes);
                }}
                placeholderTextColor={colors.midGray}
              />
              {times.length > 1 && (
                <TouchableOpacity
                  onPress={() => setTimes(times.filter((_, i) => i !== index))}
                  style={styles.removeTimeButton}
                >
                  <Text style={styles.removeTimeText}>−</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
          <Button
            title="Add Time"
            variant="secondary"
            onPress={() => setTimes([...times, ''])}
            style={styles.addTimeButton}
          />

          <Text style={styles.fieldLabel}>Notes (optional)</Text>
          <TextInput
            style={[styles.textInput, { minHeight: 80 }]}
            placeholder="Any notes about this medication"
            value={notes}
            onChangeText={setNotes}
            placeholderTextColor={colors.midGray}
            multiline
          />

          <Button
            title="Add Medication"
            onPress={handleAddMed}
            style={styles.submitButton}
          />
        </ScrollView>
      </BottomSheet>

      <BottomSheet
        visible={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          resetForm();
        }}
      >
        <ScrollView style={styles.bottomSheetContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.bottomSheetTitle}>Edit Medication</Text>

          <Text style={styles.fieldLabel}>Medication name</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Enter medication name"
            value={medName}
            onChangeText={setMedName}
            placeholderTextColor={colors.midGray}
          />

          <Text style={styles.fieldLabel}>Dose</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g., 500mg twice daily"
            value={dose}
            onChangeText={setDose}
            placeholderTextColor={colors.midGray}
          />

          <Text style={styles.fieldLabel}>Schedule</Text>
          <View style={styles.scheduleButtons}>
            {SCHEDULE_TYPES.map((schedule) => (
              <Pressable
                key={schedule}
                style={[
                  styles.scheduleButton,
                  selectedSchedule === schedule && styles.scheduleButtonSelected,
                ]}
                onPress={() => setSelectedSchedule(schedule)}
              >
                <Text
                  style={[
                    styles.scheduleButtonText,
                    selectedSchedule === schedule &&
                      styles.scheduleButtonTextSelected,
                  ]}
                >
                  {schedule}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Times</Text>
          {times.map((time, index) => (
            <View key={index} style={styles.timeInputRow}>
              <TextInput
                style={[styles.textInput, { flex: 1 }]}
                placeholder="e.g., 9:00 AM"
                value={time}
                onChangeText={(text) => {
                  const newTimes = [...times];
                  newTimes[index] = text;
                  setTimes(newTimes);
                }}
                placeholderTextColor={colors.midGray}
              />
              {times.length > 1 && (
                <TouchableOpacity
                  onPress={() => setTimes(times.filter((_, i) => i !== index))}
                  style={styles.removeTimeButton}
                >
                  <Text style={styles.removeTimeText}>−</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
          <Button
            title="Add Time"
            variant="secondary"
            onPress={() => setTimes([...times, ''])}
            style={styles.addTimeButton}
          />

          <Text style={styles.fieldLabel}>Notes (optional)</Text>
          <TextInput
            style={[styles.textInput, { minHeight: 80 }]}
            placeholder="Any notes about this medication"
            value={notes}
            onChangeText={setNotes}
            placeholderTextColor={colors.midGray}
            multiline
          />

          <Button
            title="Update Medication"
            onPress={handleEditMed}
            loading={updating}
            style={styles.submitButton}
          />
        </ScrollView>
      </BottomSheet>

      <ConfirmModal
        visible={showDeleteConfirm}
        title="Delete Medication?"
        message={`Are you sure you want to delete "${selectedMed?.med_name}"?`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteMed}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setSelectedMed(null);
        }}
        isDangerous
        isLoading={deleting}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  medRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.backgroundGray,
    borderRadius: borderRadius.md,
  },
  medInfo: {
    flex: 1,
  },
  medName: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  medDose: {
    ...typography.secondary,
    marginBottom: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  scheduleText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.midGray,
    textTransform: 'capitalize',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  timesText: {
    fontSize: 11,
    color: colors.midGray,
  },
  medActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  deleteButton: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 22,
    color: colors.error,
    fontWeight: '300',
  },
  headerButton: {
    fontSize: 14,
    fontWeight: '600',
  },
  bottomSheetContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  bottomSheetTitle: {
    ...typography.sectionHeader,
    fontSize: 18,
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    ...typography.label,
    fontSize: 13,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    color: colors.midGray,
    textTransform: 'uppercase',
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.lightGray,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 14,
    color: colors.darkGray,
  },
  scheduleButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    flexWrap: 'wrap',
  },
  scheduleButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.lightGray,
    backgroundColor: colors.white,
  },
  scheduleButtonSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  scheduleButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.darkGray,
    textTransform: 'capitalize',
  },
  scheduleButtonTextSelected: {
    color: colors.primary,
  },
  timeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  removeTimeButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundGray,
  },
  removeTimeText: {
    fontSize: 20,
    color: colors.error,
    fontWeight: '300',
  },
  addTimeButton: {
    marginBottom: spacing.lg,
  },
  submitButton: {
    marginBottom: spacing.lg,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    ...typography.sectionHeader,
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    ...typography.secondary,
  },
});

export default MedsManageScreen;
