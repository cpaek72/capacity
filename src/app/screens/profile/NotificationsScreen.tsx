import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Switch,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, borderRadius, typography } from '../../../lib/theme';
import Button from '../../../components/Button';
import ConfirmModal from '../../../components/ConfirmModal';
import { showToast } from '../../../components/Toast';
import { useProfileStore } from '../../../store/useProfileStore';

type RootStackParamList = {
  Notifications: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'Notifications'>;

interface NotificationPreferences {
  checkInReminder: boolean;
  checkInTime: string;
  medicationReminders: boolean;
}

const NotificationsScreen: React.FC<Props> = ({ navigation }) => {
  const [checkInReminder, setCheckInReminder] = useState(false);
  const [checkInTime, setCheckInTime] = useState('09:00');
  const [medicationReminders, setMedicationReminders] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialPrefs, setInitialPrefs] = useState<NotificationPreferences | null>(null);

  const meds = useProfileStore((state) => state.meds);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const saved = await AsyncStorage.getItem('notificationPrefs');
      if (saved) {
        const prefs = JSON.parse(saved);
        setCheckInReminder(prefs.checkInReminder || false);
        setCheckInTime(prefs.checkInTime || '09:00');
        setMedicationReminders(prefs.medicationReminders || false);
        setInitialPrefs(prefs);
      } else {
        const defaultPrefs = {
          checkInReminder: false,
          checkInTime: '09:00',
          medicationReminders: false,
        };
        setInitialPrefs(defaultPrefs);
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    }
  };

  useEffect(() => {
    if (initialPrefs) {
      const hasChanges =
        checkInReminder !== initialPrefs.checkInReminder ||
        checkInTime !== initialPrefs.checkInTime ||
        medicationReminders !== initialPrefs.medicationReminders;
      setIsDirty(hasChanges);
    }
  }, [checkInReminder, checkInTime, medicationReminders, initialPrefs]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const prefs: NotificationPreferences = {
        checkInReminder,
        checkInTime,
        medicationReminders,
      };
      await AsyncStorage.setItem('notificationPrefs', JSON.stringify(prefs));
      setInitialPrefs(prefs);
      setIsDirty(false);
      showToast('success', 'Notification preferences updated');
    } catch (error) {
      console.error('Error saving preferences:', error);
      showToast('error', 'Failed to save preferences');
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
      headerRight: () => (
        <TouchableOpacity
          onPress={handleSave}
          disabled={loading || !isDirty}
          style={{ opacity: loading || !isDirty ? 0.5 : 1, marginRight: spacing.md }}
        >
          <Text style={[styles.headerButton, { color: colors.primary }]}>Save</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, isDirty, loading]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.headerContent}>
              <Text style={styles.sectionTitle}>Daily Check-in Reminder</Text>
              <Text style={styles.sectionDescription}>
                Get a reminder to log your daily check-in
              </Text>
            </View>
            <Switch
              value={checkInReminder}
              onValueChange={setCheckInReminder}
              trackColor={{ false: colors.lightGray, true: colors.primaryLight }}
              thumbColor={checkInReminder ? colors.primary : colors.midGray}
            />
          </View>

          {checkInReminder && (
            <View style={styles.settingsPanel}>
              <Text style={styles.settingLabel}>Reminder time</Text>
              <View style={styles.timePickerContainer}>
                <TextInput
                  style={styles.timeInput}
                  value={checkInTime}
                  onChangeText={setCheckInTime}
                  placeholder="HH:MM"
                  placeholderTextColor={colors.midGray}
                />
                <Text style={styles.timeFormat}>24-hour format</Text>
              </View>
            </View>
          )}
        </View>

        {meds.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.headerContent}>
                <Text style={styles.sectionTitle}>Medication Reminders</Text>
                <Text style={styles.sectionDescription}>
                  Get reminders for your medications
                </Text>
              </View>
              <Switch
                value={medicationReminders}
                onValueChange={setMedicationReminders}
                trackColor={{ false: colors.lightGray, true: colors.primaryLight }}
                thumbColor={medicationReminders ? colors.primary : colors.midGray}
              />
            </View>

            {medicationReminders && (
              <View style={styles.settingsPanel}>
                <Text style={styles.infoText}>
                  You'll receive reminders at the scheduled times for each medication.
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Note</Text>
          <Text style={styles.infoText}>
            These notification settings are stored locally on your device. For push notifications across devices, ensure your app has notification permissions enabled in your phone settings.
          </Text>
        </View>
      </ScrollView>

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
  section: {
    marginBottom: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundGray,
    padding: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerContent: {
    flex: 1,
  },
  sectionTitle: {
    ...typography.sectionHeader,
    fontSize: 16,
    marginBottom: spacing.xs,
  },
  sectionDescription: {
    ...typography.secondary,
    fontSize: 13,
  },
  settingsPanel: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.lightGray,
  },
  settingLabel: {
    ...typography.label,
    fontSize: 12,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    color: colors.midGray,
  },
  timePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  timeInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.lightGray,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.darkGray,
    fontFamily: 'monospace',
  },
  timeFormat: {
    ...typography.secondary,
    fontSize: 11,
  },
  infoSection: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.md,
  },
  infoTitle: {
    ...typography.label,
    fontSize: 12,
    marginBottom: spacing.sm,
    color: colors.primary,
    textTransform: 'uppercase',
  },
  infoText: {
    ...typography.secondary,
    fontSize: 13,
    color: colors.darkGray,
    lineHeight: 18,
  },
  headerButton: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default NotificationsScreen;
