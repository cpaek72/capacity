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
  Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, borderRadius, typography } from '../../../lib/theme';
import Button from '../../../components/Button';
import Card from '../../../components/Card';
import ConfirmModal from '../../../components/ConfirmModal';
import BottomSheet from '../../../components/BottomSheet';
import { showToast } from '../../../components/Toast';
import { supabase } from '../../../lib/supabase';
import { useSessionStore } from '../../../store/useSessionStore';
import { useProfileStore } from '../../../store/useProfileStore';
import { UserCondition } from '../../../types/db';

type RootStackParamList = {
  ConditionsManage: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'ConditionsManage'>;

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

const ConditionsManageScreen: React.FC<Props> = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedCondition, setSelectedCondition] = useState<UserCondition | null>(null);
  const [searchText, setSearchText] = useState('');
  const [customCondition, setCustomCondition] = useState('');

  const session = useSessionStore((state) => state.session);
  const conditions = useProfileStore((state) => state.conditions);
  const addCondition = useProfileStore((state) => state.addCondition);
  const removeCondition = useProfileStore((state) => state.removeCondition);
  const setConditions = useProfileStore((state) => state.setConditions);

  const loadConditions = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_conditions')
        .select('*')
        .eq('user_id', session.user.id);

      if (error) throw error;
      setConditions(data || []);
    } catch (error) {
      console.error('Error loading conditions:', error);
      showToast('error', 'Failed to load conditions');
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id, setConditions]);

  useEffect(() => {
    loadConditions();
  }, [loadConditions]);

  useFocusEffect(
    useCallback(() => {
      loadConditions();
    }, [loadConditions])
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => setShowAddModal(true)}
          style={{ marginRight: spacing.md }}
        >
          <Text style={[styles.headerButton, { color: colors.primary }]}>+ Add</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const handleAddCondition = async () => {
    const conditionName = customCondition.trim();

    if (!conditionName) {
      showToast('error', 'Please enter a condition name');
      return;
    }

    if (!session?.user?.id) {
      showToast('error', 'No user session found');
      return;
    }

    try {
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
      setCustomCondition('');
      setSearchText('');
      setShowAddModal(false);
      showToast('success', 'Condition added');
    } catch (error) {
      console.error('Error adding condition:', error);
      showToast('error', 'Failed to add condition');
    }
  };

  const handleDeleteCondition = async () => {
    if (!selectedCondition) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('user_conditions')
        .delete()
        .eq('id', selectedCondition.id);

      if (error) throw error;

      removeCondition(selectedCondition.id);
      setShowDeleteConfirm(false);
      setSelectedCondition(null);
      showToast('success', 'Condition deleted');
    } catch (error) {
      console.error('Error deleting condition:', error);
      showToast('error', 'Failed to delete condition');
    } finally {
      setDeleting(false);
    }
  };

  const filteredConditions = PREDEFINED_CONDITIONS.filter((c) =>
    c.toLowerCase().includes(searchText.toLowerCase())
  );

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
        data={conditions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.conditionRow}>
            <Text style={styles.conditionName}>{item.condition_name}</Text>
            <TouchableOpacity
              onPress={() => {
                setSelectedCondition(item);
                setShowDeleteConfirm(true);
              }}
              style={styles.deleteButton}
            >
              <Text style={styles.deleteButtonText}>×</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No conditions added yet</Text>
            <Text style={styles.emptySubtext}>
              Add your conditions to get personalized insights
            </Text>
          </View>
        }
      />

      <BottomSheet
        visible={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setSearchText('');
          setCustomCondition('');
        }}
      >
        <View style={styles.bottomSheetContent}>
          <Text style={styles.bottomSheetTitle}>Add Condition</Text>

          <TextInput
            style={styles.searchInput}
            placeholder="Search conditions..."
            value={searchText}
            onChangeText={setSearchText}
            placeholderTextColor={colors.midGray}
          />

          <Text style={styles.sectionTitle}>Suggested conditions</Text>
          <View style={styles.conditionsList}>
            {filteredConditions.map((condition) => (
              <TouchableOpacity
                key={condition}
                style={styles.predefinedConditionRow}
                onPress={() => {
                  setCustomCondition(condition);
                  setSearchText('');
                }}
              >
                <Text style={styles.predefinedConditionText}>{condition}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Or enter custom condition</Text>
          <TextInput
            style={styles.customInput}
            placeholder="Enter condition name"
            value={customCondition}
            onChangeText={setCustomCondition}
            placeholderTextColor={colors.midGray}
          />

          <Button
            title="Add Condition"
            onPress={handleAddCondition}
            style={styles.addButton}
          />
        </View>
      </BottomSheet>

      <ConfirmModal
        visible={showDeleteConfirm}
        title="Delete Condition?"
        message={`Are you sure you want to delete "${selectedCondition?.condition_name}"?`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteCondition}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setSelectedCondition(null);
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
  conditionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.backgroundGray,
    borderRadius: borderRadius.md,
  },
  conditionName: {
    ...typography.body,
    flex: 1,
  },
  deleteButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.md,
  },
  deleteButtonText: {
    fontSize: 24,
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
  searchInput: {
    borderWidth: 1,
    borderColor: colors.lightGray,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
    fontSize: 14,
    color: colors.darkGray,
  },
  sectionTitle: {
    ...typography.label,
    fontSize: 13,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    color: colors.midGray,
    textTransform: 'uppercase',
  },
  conditionsList: {
    marginBottom: spacing.lg,
  },
  predefinedConditionRow: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primaryLight,
  },
  predefinedConditionText: {
    ...typography.body,
    color: colors.primary,
  },
  customInput: {
    borderWidth: 1,
    borderColor: colors.lightGray,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
    fontSize: 14,
    color: colors.darkGray,
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

export default ConditionsManageScreen;
