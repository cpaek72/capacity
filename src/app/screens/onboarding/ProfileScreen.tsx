import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Modal,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, borderRadius, typography } from '../../../lib/theme';
import Button from '../../../components/Button';
import Input from '../../../components/Input';
import { supabase } from '../../../lib/supabase';
import { useSessionStore } from '../../../store/useSessionStore';
import { AGE_RANGES } from '../../../types/models';

type RootStackParamList = {
  OnboardingProfile: undefined;
  OnboardingConditions: undefined;
  WelcomeScreen: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'OnboardingProfile'>;

const ProfileScreen: React.FC<Props> = ({ navigation }) => {
  const [name, setName] = useState('');
  const [selectedAgeRange, setSelectedAgeRange] = useState<string | null>(null);
  const [timezone, setTimezone] = useState('');
  const [showAgeModal, setShowAgeModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const session = useSessionStore((state) => state.session);
  const setProfile = useSessionStore((state) => state.setProfile);

  // Auto-detect timezone on mount
  useEffect(() => {
    try {
      const detectedTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setTimezone(detectedTz);
    } catch (error) {
      console.error('Failed to detect timezone:', error);
      setTimezone('UTC');
    }
  }, []);

  const handleNext = async () => {
    if (!name.trim() || !selectedAgeRange || !timezone.trim()) {
      alert('Please fill in all fields');
      return;
    }

    if (!session?.user?.id) {
      alert('No user session found');
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

      // Update store
      setProfile(data);

      navigation.navigate('OnboardingConditions');
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save profile. Please try again.');
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
        <Text style={styles.title}>Tell us about yourself</Text>

        <Input
          label="Preferred name"
          value={name}
          onChangeText={setName}
          placeholder="Enter your name"
        />

        <View style={styles.container}>
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
    marginBottom: spacing.xxl,
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
    marginBottom: spacing.lg,
    justifyContent: 'center',
  },
  pickerText: {
    fontSize: 16,
    color: colors.darkGray,
  },
  placeholderText: {
    color: colors.midGray,
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

export default ProfileScreen;
