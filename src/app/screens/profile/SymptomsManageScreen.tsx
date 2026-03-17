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
  Modal,
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
import { UserSymptom } from '../../../types/db';
import { SYMPTOM_CATEGORIES } from '../../../types/models';

type RootStackParamList = {
  SymptomsManage: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'SymptomsManage'>;

const SymptomsManageScreen: React.FC<Props> = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedSymptom, setSelectedSymptom] = useState<UserSymptom | null>(null);
  const [symptomName, setSymptomName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [updating, setUpdating] = useState(false);

  const session = useSessionStore((state) => state.session);
  const symptoms = useProfileStore((state) => state.symptoms);
  const addSymptom = useProfileStore((state) => state.addSymptom);
  const updateSymptom = useProfileStore((state) => state.updateSymptom);
  const removeSymptom = useProfileStore((state) => state.removeSymptom);
  const setSymptoms = useProfileStore((state) => state.setSymptoms);

  const loadSymptoms = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_symptoms')
        .select('*')
        .eq('user_id', session.user.id);

      if (error) throw error;
      setSymptoms(data || []);
    } catch (error) {
      console.error('Error loading symptoms:', error);
      showToast('error', 'Failed to load symptoms');
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id, setSymptoms]);

  useEffect(() => {
    loadSymptoms();
  }, [loadSymptoms]);

  useFocusEffect(
    useCallback(() => {
      loadSymptoms();
    }, [loadSymptoms])
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => {
            setSymptomName('');
            setSelectedCategory(null);
            setSelectedSymptom(null);
            setShowAddModal(true);
          }}
          style={{ marginRight: spacing.md }}
        >
          <Text style={[styles.headerButton, { color: colors.primary }]}>+ Add</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const handleAddSymptom = async () => {
    if (!symptomName.trim() || !selectedCategory) {
      showToast('error', 'Please fill in all fields');
      return;
    }

    if (!session?.user?.id) {
      showToast('error', 'No user session found');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_symptoms')
        .insert({
          user_id: session.user.id,
          symptom_name: symptomName.trim(),
          category: selectedCategory,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      addSymptom(data);
      setSymptomName('');
      setSelectedCategory(null);
      setShowAddModal(false);
      showToast('success', 'Symptom added');
    } catch (error) {
      console.error('Error adding symptom:', error);
      showToast('error', 'Failed to add symptom');
    }
  };

  const handleEditSymptom = async () => {
    if (!symptomName.trim() || !selectedCategory) {
      showToast('error', 'Please fill in all fields');
      return;
    }

    if (!selectedSymptom) return;

    setUpdating(true);
    try {
      const { data, error } = await supabase
        .from('user_symptoms')
        .update({
          symptom_name: symptomName.trim(),
          category: selectedCategory,
        })
        .eq('id', selectedSymptom.id)
        .select()
        .single();

      if (error) throw error;

      updateSymptom(selectedSymptom.id, data);
      setSymptomName('');
      setSelectedCategory(null);
      setSelectedSymptom(null);
      setShowEditModal(false);
      showToast('success', 'Symptom updated');
    } catch (error) {
      console.error('Error updating symptom:', error);
      showToast('error', 'Failed to update symptom');
    } finally {
      setUpdating(false);
    }
  };

  const handleToggleActive = async (symptom: UserSymptom) => {
    try {
      const { data, error } = await supabase
        .from('user_symptoms')
        .update({ is_active: !symptom.is_active })
        .eq('id', symptom.id)
        .select()
        .single();

      if (error) throw error;

      updateSymptom(symptom.id, data);
      showToast('success', `Symptom ${!symptom.is_active ? 'activated' : 'deactivated'}`);
    } catch (error) {
      console.error('Error toggling symptom:', error);
      showToast('error', 'Failed to update symptom');
    }
  };

  const handleDeleteSymptom = async () => {
    if (!selectedSymptom) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('user_symptoms')
        .delete()
        .eq('id', selectedSymptom.id);

      if (error) throw error;

      removeSymptom(selectedSymptom.id);
      setShowDeleteConfirm(false);
      setSelectedSymptom(null);
      showToast('success', 'Symptom deleted');
    } catch (error) {
      console.error('Error deleting symptom:', error);
      showToast('error', 'Failed to delete symptom');
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
        data={symptoms}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.symptomRow}
            onPress={() => {
              setSelectedSymptom(item);
              setSymptomName(item.symptom_name);
              setSelectedCategory(item.category);
              setShowEditModal(true);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.symptomInfo}>
              <Text style={styles.symptomName}>{item.symptom_name}</Text>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{item.category}</Text>
              </View>
            </View>
            <View style={styles.symptomActions}>
              <Switch
                value={item.is_active}
                onValueChange={() => handleToggleActive(item)}
              />
              <TouchableOpacity
                onPress={() => {
                  setSelectedSymptom(item);
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
            <Text style={styles.emptyText}>No symptoms added yet</Text>
            <Text style={styles.emptySubtext}>
              Add symptoms to track your condition
            </Text>
          </View>
        }
      />

      <BottomSheet
        visible={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setSymptomName('');
          setSelectedCategory(null);
        }}
      >
        <View style={styles.bottomSheetContent}>
          <Text style={styles.bottomSheetTitle}>Add Symptom</Text>

          <Text style={styles.fieldLabel}>Symptom name</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Enter symptom name"
            value={symptomName}
            onChangeText={setSymptomName}
            placeholderTextColor={colors.midGray}
          />

          <Text style={styles.fieldLabel}>Category</Text>
          <ScrollView style={styles.categoryGrid} showsVerticalScrollIndicator={false}>
            {SYMPTOM_CATEGORIES.map((category) => (
              <Pressable
                key={category}
                style={[
                  styles.categoryOption,
                  selectedCategory === category && styles.categoryOptionSelected,
                ]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text
                  style={[
                    styles.categoryOptionText,
                    selectedCategory === category && styles.categoryOptionTextSelected,
                  ]}
                >
                  {category}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Button
            title="Add Symptom"
            onPress={handleAddSymptom}
            style={styles.addButton}
          />
        </View>
      </BottomSheet>

      <BottomSheet
        visible={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSymptomName('');
          setSelectedCategory(null);
          setSelectedSymptom(null);
        }}
      >
        <View style={styles.bottomSheetContent}>
          <Text style={styles.bottomSheetTitle}>Edit Symptom</Text>

          <Text style={styles.fieldLabel}>Symptom name</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Enter symptom name"
            value={symptomName}
            onChangeText={setSymptomName}
            placeholderTextColor={colors.midGray}
          />

          <Text style={styles.fieldLabel}>Category</Text>
          <ScrollView style={styles.categoryGrid} showsVerticalScrollIndicator={false}>
            {SYMPTOM_CATEGORIES.map((category) => (
              <Pressable
                key={category}
                style={[
                  styles.categoryOption,
                  selectedCategory === category && styles.categoryOptionSelected,
                ]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text
                  style={[
                    styles.categoryOptionText,
                    selectedCategory === category && styles.categoryOptionTextSelected,
                  ]}
                >
                  {category}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Button
            title="Update Symptom"
            onPress={handleEditSymptom}
            loading={updating}
            style={styles.addButton}
          />
        </View>
      </BottomSheet>

      <ConfirmModal
        visible={showDeleteConfirm}
        title="Delete Symptom?"
        message={`Are you sure you want to delete "${selectedSymptom?.symptom_name}"?`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteSymptom}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setSelectedSymptom(null);
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
  symptomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.backgroundGray,
    borderRadius: borderRadius.md,
  },
  symptomInfo: {
    flex: 1,
  },
  symptomName: {
    ...typography.body,
    marginBottom: spacing.xs,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.sm,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  symptomActions: {
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
  categoryGrid: {
    maxHeight: 120,
    marginBottom: spacing.lg,
  },
  categoryOption: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.lightGray,
  },
  categoryOptionSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  categoryOptionText: {
    fontSize: 14,
    color: colors.darkGray,
  },
  categoryOptionTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  addButton: {
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

export default SymptomsManageScreen;
