import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, borderRadius, typography } from '../../../lib/theme';
import Button from '../../../components/Button';
import Card from '../../../components/Card';
import { supabase } from '../../../lib/supabase';
import { useSessionStore } from '../../../store/useSessionStore';
import { useProfileStore } from '../../../store/useProfileStore';

type RootStackParamList = {
  ProfileScreen: undefined;
  EditProfile: undefined;
  ConditionsManage: undefined;
  SymptomsManage: undefined;
  MedsManage: undefined;
  Notifications: undefined;
  PrivacySettings: undefined;
  DataAndAccount: undefined;
  Help: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'ProfileScreen'>;

const ProfileScreen: React.FC<Props> = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const session = useSessionStore((state) => state.session);
  const profile = useSessionStore((state) => state.profile);
  const clearSession = useSessionStore((state) => state.clearSession);
  const conditions = useProfileStore((state) => state.conditions);

  const loadProfileData = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      setLoading(true);
      const { data: conditionsData } = await supabase
        .from('user_conditions')
        .select('*')
        .eq('user_id', session.user.id);

      if (conditionsData) {
        useProfileStore.setState({ conditions: conditionsData });
      }
    } catch (error) {
      console.error('Error loading profile data:', error);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

  useFocusEffect(
    useCallback(() => {
      loadProfileData();
    }, [loadProfileData])
  );

  const handleLogOut = async () => {
    try {
      await supabase.auth.signOut();
      clearSession();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getInitials = () => {
    if (!profile?.name) return 'U';
    return profile.name
      .split(' ')
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  };

  const getAvatarColor = () => {
    const colors_array = [colors.primary, '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A'];
    if (!profile?.name) return colors_array[0];
    const code = profile.name.charCodeAt(0) % colors_array.length;
    return colors_array[code];
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
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileHeader}>
          <View style={[styles.avatar, { backgroundColor: getAvatarColor() }]}>
            <Text style={styles.avatarText}>{getInitials()}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profile?.name || 'User'}</Text>
            <Text style={styles.profileDetail}>{profile?.age_range}</Text>
            <Text style={styles.profileDetail}>{profile?.timezone}</Text>
          </View>
        </View>

        {conditions.length > 0 && (
          <Card style={styles.conditionsPreview}>
            <Text style={styles.previewTitle}>Conditions</Text>
            <Text style={styles.previewText}>
              {conditions.slice(0, 3).map((c) => c.condition_name).join(', ')}
              {conditions.length > 3 ? '...' : ''}
            </Text>
          </Card>
        )}

        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Text style={styles.statLabel}>Streak</Text>
            <Text style={styles.statValue}>0</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statLabel}>Entries</Text>
            <Text style={styles.statValue}>0</Text>
          </Card>
        </View>

        <Text style={styles.sectionTitle}>Settings</Text>

        <NavigationRow
          icon="✏️"
          label="Edit Profile"
          onPress={() => navigation.navigate('EditProfile')}
        />
        <NavigationRow
          icon="🏥"
          label="Conditions"
          onPress={() => navigation.navigate('ConditionsManage')}
        />
        <NavigationRow
          icon="🔬"
          label="Symptoms"
          onPress={() => navigation.navigate('SymptomsManage')}
        />
        <NavigationRow
          icon="💊"
          label="Medications"
          onPress={() => navigation.navigate('MedsManage')}
        />
        <NavigationRow
          icon="🔔"
          label="Notifications"
          onPress={() => navigation.navigate('Notifications')}
        />
        <NavigationRow
          icon="🔒"
          label="Privacy Settings"
          onPress={() => navigation.navigate('PrivacySettings')}
        />
        <NavigationRow
          icon="📊"
          label="Data & Account"
          onPress={() => navigation.navigate('DataAndAccount')}
        />
        <NavigationRow
          icon="❓"
          label="Help & Support"
          onPress={() => navigation.navigate('Help')}
        />

        <View style={styles.logoutButtonContainer}>
          <Button
            title="Log Out"
            variant="text"
            onPress={handleLogOut}
            style={styles.logoutButton}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const NavigationRow: React.FC<{
  icon: string;
  label: string;
  onPress: () => void;
}> = ({ icon, label, onPress }) => {
  return (
    <TouchableOpacity
      style={styles.navRow}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.navContent}>
        <Text style={styles.navIcon}>{icon}</Text>
        <Text style={styles.navLabel}>{label}</Text>
      </View>
      <Text style={styles.navChevron}>›</Text>
    </TouchableOpacity>
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
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  avatarText: {
    color: colors.white,
    fontSize: 28,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    ...typography.sectionHeader,
    fontSize: 18,
    marginBottom: spacing.xs,
  },
  profileDetail: {
    ...typography.secondary,
    marginBottom: spacing.xs,
  },
  conditionsPreview: {
    marginBottom: spacing.lg,
    backgroundColor: colors.primaryLight,
  },
  previewTitle: {
    ...typography.label,
    marginBottom: spacing.xs,
    color: colors.primary,
  },
  previewText: {
    ...typography.body,
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  statLabel: {
    ...typography.secondary,
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
  },
  sectionTitle: {
    ...typography.sectionHeader,
    fontSize: 16,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundGray,
  },
  navContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  navIcon: {
    fontSize: 20,
    marginRight: spacing.md,
  },
  navLabel: {
    ...typography.body,
  },
  navChevron: {
    fontSize: 20,
    color: colors.midGray,
  },
  logoutButtonContainer: {
    marginTop: spacing.xxl,
    marginBottom: spacing.lg,
  },
  logoutButton: {
    color: colors.error,
  },
});

export default ProfileScreen;
