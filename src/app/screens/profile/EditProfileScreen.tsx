import React, { useState, useLayoutEffect, useEffect } from 'react';
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
import ConfirmModal from '../../../components/ConfirmModal';
import { showToast } from '../../../components/Toast';
import { supabase } from '../../../lib/supabase';
import { useSessionStore } from '../../../store/useSessionStore';
import { AGE_RANGES } from '../../../types/models';

type RootStackParamList = {
  EditProfile: undefined;
  ProfileScreen: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'EditProfile'>;

const EditProfileScreen: React.FC<Props> = ({ navigation }) => {
  const [name, setName] = useState('');
  const [selectedAgeRange, setSelectedAgeRange] = useState<string | null>(null);
  const [timezone, setTimezone] = useState('');
  const [showAgeModal, setShowAgeModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const session = useSessionStore((state) => state.session);
  const profile = useSessionStore((state) => state.profile);
  const setProfile = useSessionStore((state) => state.setProfile);

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setSelectedAgeRange(profile.age_range);
      setTimezone(profile.timezone);
    }
  }, [profile]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={handleSave}
          disabled={loading || !isDirty}
          style={{ opacity: loading || !isDirty ? 0.5 : 1 }}
        >
          <Text style={[styles.headerButton, { color: colors.primary }]}>
            {loading ? <ActivityIndicator size="small" color={colors.primary} /> : 'Save'}
          </Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, isDirty, loading]);

  useEffect(() => {
    if (profile) {
      const hasChanges =
        name !== profile.name ||
        selectedAgeRange !== profile.age_range ||
        timezone !== profile.timezone;
      setIsDirty(hasChanges);
    }
  }, [name, selectedAgeRange, timezone, profile]);

  const handleSave = async () => {
    if (!name.trim() || !selectedAgeRange || !timezone.trim()) {
      showToast('error', 'Please fill in all fields');
      return;
    }

    if (!session?.user?.id) {
      showToast('error', 'No user session found');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          name: name.trim(),
          age_range: selectedAgeRange,
          timezone: timezone.trim(),
        })
        .eq('id', session.user.id)
        .select()
        .single();

      if (error) throw error;

      setProfile(data);
      setIsDirty(false);
      showToast('success', 'Profile updated');
      navigation.goBack();
    } catch (error) {
      console.error('Error saving profile:', error);
      showToast('error', 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  const handleBackPress = () => {
    if (isDirty) {
      setShowDiscardModal(true);
    } else {
      navigation.goBack();
    }
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerBackVisible: true,
      headerLeft: () => (
        <TouchableOpacity onPress={handleBackPress} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.backButton}>‹</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, isDirty]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Input
          label="Name"
          value={name}
          onChangeText={setName}
          placeholder="Enter your name"
        />

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Age range</Text>
          <TouchableOpacity
            style={styles.picker}
            onPress={() => setShowAgeModal(true)}
          >
            <Text
              style={[
                styles.pickerText,
                !selectedAgeRange && styles.placeholderText,
              ]}
            >
              {selectedAgeRange || 'Select age range'}
            </Text>
          </TouchableOpacity>
        </View>

        <Input
          label="Timezone"
          value={timezone}
          onChangeText={setTimezone}
          placeholder="Enter timezone"
        />
      </ScrollView>

      <Modal visible={showAgeModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select age range</Text>
            <FlatList
              data={AGE_RANGES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.ageOption,
                    selectedAgeRange === item && styles.ageOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedAgeRange(item);
                    setShowAgeModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.ageOptionText,
                      selectedAgeRange === item &&
                        styles.ageOptionTextSelected,
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <Button
              title="Cancel"
              variant="secondary"
              onPress={() => setShowAgeModal(false)}
              style={styles.cancelButton}
            />
          </View>
        </View>
      </Modal>

      <ConfirmModal
        visible={showDiscardModal}
        title="Discard Changes?"
        message="Are you sure you want to discard your changes?"
        confirmText="Discard"
        cancelText="Keep Editing"
        onConfirm={() => {
          setShowDiscardModal(false);
          navigation.goBack();
        }}
        onCancel={() => setShowDiscardModal(false)}
        isDangerous
      />
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
  fieldContainer: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.darkGray,
    marginBottom: spacing.sm,
  },
  picker: {
    borderWidth: 1,
    borderColor: colors.lightGray,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    justifyContent: 'center',
  },
  pickerText: {
    fontSize: 16,
    color: colors.darkGray,
  },
  placeholderText: {
    color: colors.midGray,
  },
  headerButton: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: spacing.md,
  },
  backButton: {
    fontSize: 24,
    fontWeight: '400',
    marginLeft: spacing.md,
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    maxHeight: '80%',
  },
  modalTitle: {
    ...typography.screenTitle,
    fontSize: 18,
    marginBottom: spacing.lg,
  },
  ageOption: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.lightGray,
  },
  ageOptionSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  ageOptionText: {
    fontSize: 15,
    color: colors.darkGray,
  },
  ageOptionTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  cancelButton: {
    marginTop: spacing.lg,
  },
});

export default EditProfileScreen;
