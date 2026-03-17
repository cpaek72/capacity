import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, borderRadius, typography } from '../../../lib/theme';
import Button from '../../../components/Button';
import Card from '../../../components/Card';
import ConfirmModal from '../../../components/ConfirmModal';
import { showToast } from '../../../components/Toast';
import { supabase } from '../../../lib/supabase';
import { useSessionStore } from '../../../store/useSessionStore';

type RootStackParamList = {
  DataAndAccount: undefined;
  Landing: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'DataAndAccount'>;

const DataAndAccountScreen: React.FC<Props> = ({ navigation }) => {
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const session = useSessionStore((state) => state.session);
  const clearSession = useSessionStore((state) => state.clearSession);

  const handleDownloadData = async () => {
    if (!session?.user?.id) {
      showToast('error', 'No user session found');
      return;
    }

    setDownloading(true);
    try {
      // Fetch all user data
      const [profileRes, conditionsRes, symptomsRes, medsRes, entriesRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', session.user.id),
        supabase.from('user_conditions').select('*').eq('user_id', session.user.id),
        supabase.from('user_symptoms').select('*').eq('user_id', session.user.id),
        supabase.from('user_meds').select('*').eq('user_id', session.user.id),
        supabase.from('entries').select('*').eq('user_id', session.user.id),
      ]);

      const userData = {
        exportDate: new Date().toISOString(),
        profile: profileRes.data,
        conditions: conditionsRes.data,
        symptoms: symptomsRes.data,
        medications: medsRes.data,
        entries: entriesRes.data,
      };

      const jsonString = JSON.stringify(userData, null, 2);
      const fileName = `capacity_data_${new Date().toISOString().split('T')[0]}.json`;
      const filePath = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(filePath, jsonString);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath, {
          mimeType: 'application/json',
          dialogTitle: 'Export Health Data',
        });
      } else {
        showToast('success', 'Data exported to device');
      }
    } catch (error) {
      console.error('Error downloading data:', error);
      showToast('error', 'Failed to download data');
    } finally {
      setDownloading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!session?.user?.id) {
      showToast('error', 'No user session found');
      return;
    }

    setDeleting(true);
    try {
      // Delete all user data from database
      await Promise.all([
        supabase.from('user_conditions').delete().eq('user_id', session.user.id),
        supabase.from('user_symptoms').delete().eq('user_id', session.user.id),
        supabase.from('user_meds').delete().eq('user_id', session.user.id),
        supabase.from('entry_symptoms').delete().eq('entry_id', session.user.id),
        supabase.from('entry_triggers').delete().eq('entry_id', session.user.id),
        supabase.from('entry_meds').delete().eq('entry_id', session.user.id),
        supabase.from('entries').delete().eq('user_id', session.user.id),
        supabase.from('profiles').delete().eq('id', session.user.id),
      ]);

      // Sign out and clear session
      await supabase.auth.signOut();
      clearSession();

      showToast('success', 'Account deleted successfully');

      // Navigate to landing
      navigation.reset({
        index: 0,
        routes: [{ name: 'Landing' as never }],
      });
    } catch (error) {
      console.error('Error deleting account:', error);
      showToast('error', 'Failed to delete account');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
      setDeleteConfirmText('');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Download Your Data</Text>
        <Card style={styles.section}>
          <Text style={styles.cardTitle}>Export health data as JSON</Text>
          <Text style={styles.cardDescription}>
            Download all your health records, including profile, conditions, symptoms, medications, and entries. This data will be exported as a JSON file that you can keep, analyze, or import elsewhere.
          </Text>
          <Button
            title={downloading ? 'Exporting...' : 'Download My Data'}
            onPress={handleDownloadData}
            loading={downloading}
            disabled={downloading}
            style={styles.button}
          />
        </Card>

        <Text style={styles.sectionTitle}>Delete Account</Text>
        <Card style={[styles.section, styles.dangerSection]}>
          <View style={styles.warningIcon}>
            <Text style={styles.warningIconText}>⚠️</Text>
          </View>
          <Text style={styles.cardTitle}>Permanently delete your account</Text>
          <Text style={styles.cardDescription}>
            This action cannot be undone. All your data will be permanently deleted from Capacity servers.
          </Text>

          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              This will delete all your profile information, conditions, symptoms, medications, and health entries.
            </Text>
          </View>

          <Button
            title="Delete Account"
            variant="secondary"
            onPress={() => setShowDeleteConfirm(true)}
            disabled={deleting}
            style={styles.deleteButton}
          />
        </Card>
      </ScrollView>

      <ConfirmModal
        visible={showDeleteConfirm}
        title="Delete Account?"
        message="This action is permanent and cannot be undone. All your data will be lost."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteAccount}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setDeleteConfirmText('');
        }}
        isDangerous
        isLoading={deleting}
        customContent={
          <View style={styles.confirmContent}>
            <Text style={styles.confirmLabel}>
              Type "DELETE" to confirm:
            </Text>
            <TextInput
              style={styles.confirmInput}
              placeholder="Type DELETE here"
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              placeholderTextColor={colors.midGray}
            />
            {deleteConfirmText !== 'DELETE' && (
              <Text style={styles.confirmHint}>
                Type "DELETE" exactly to enable the delete button
              </Text>
            )}
          </View>
        }
        confirmDisabled={deleteConfirmText !== 'DELETE'}
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
  sectionTitle: {
    ...typography.sectionHeader,
    fontSize: 16,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  section: {
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  dangerSection: {
    borderWidth: 2,
    borderColor: colors.error,
    backgroundColor: '#fff5f5',
  },
  warningIcon: {
    marginBottom: spacing.md,
  },
  warningIconText: {
    fontSize: 28,
  },
  cardTitle: {
    ...typography.body,
    fontWeight: '700',
    fontSize: 16,
    marginBottom: spacing.sm,
  },
  cardDescription: {
    ...typography.secondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  button: {
    marginTop: spacing.md,
  },
  deleteButton: {
    marginTop: spacing.md,
    backgroundColor: colors.error,
  },
  warningBox: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.error + '15',
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
    marginBottom: spacing.lg,
  },
  warningText: {
    ...typography.secondary,
    fontSize: 13,
    color: colors.darkGray,
    lineHeight: 18,
  },
  confirmContent: {
    marginTop: spacing.lg,
  },
  confirmLabel: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.sm,
    color: colors.darkGray,
  },
  confirmInput: {
    borderWidth: 2,
    borderColor: colors.error,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.darkGray,
    marginBottom: spacing.sm,
  },
  confirmHint: {
    ...typography.secondary,
    fontSize: 12,
    color: colors.error,
  },
});

export default DataAndAccountScreen;
