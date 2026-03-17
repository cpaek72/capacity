import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, borderRadius, typography } from '../../../lib/theme';
import Button from '../../../components/Button';
import Card from '../../../components/Card';
import { supabase } from '../../../lib/supabase';
import { useSessionStore } from '../../../store/useSessionStore';
import { formatDate, formatTime, toISODateString, isToday } from '../../../lib/dates';
import { Entry, EntrySymptom } from '../../../types/db';

type RootStackParamList = {
  HomeScreen: undefined;
  NewEntry: { date: string };
  EditEntry: { entryId: string };
  Trends: undefined;
  Insights: undefined;
  Profile: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'HomeScreen'>;

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const [todayEntry, setTodayEntry] = useState<Entry | null>(null);
  const [todaySymptoms, setTodaySymptoms] = useState<EntrySymptom[]>([]);
  const [weekStats, setWeekStats] = useState({ entries: 0, avgFlare: 0 });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const session = useSessionStore((state) => state.session);
  const profile = useSessionStore((state) => state.profile);

  const today = toISODateString();

  const fetchTodayEntry = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      const { data: entryData, error: entryError } = await supabase
        .from('entries')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('entry_date', today)
        .single();

      if (entryError && entryError.code !== 'PGRST116') {
        console.error('Error fetching entry:', entryError);
        return;
      }

      setTodayEntry(entryData || null);

      if (entryData) {
        const { data: symptomsData, error: symptomsError } = await supabase
          .from('entry_symptoms')
          .select('*')
          .eq('entry_id', entryData.id);

        if (symptomsError) {
          console.error('Error fetching symptoms:', symptomsError);
        } else {
          setTodaySymptoms(symptomsData || []);
        }
      }
    } catch (error) {
      console.error('Error fetching today entry:', error);
    }
  }, [session?.user?.id, today]);

  const fetchWeekStats = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoStr = weekAgo.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('entries')
        .select('flare_rating')
        .eq('user_id', session.user.id)
        .gte('entry_date', weekAgoStr)
        .lte('entry_date', today);

      if (error) {
        console.error('Error fetching week stats:', error);
        return;
      }

      const entries = data || [];
      const avgFlare =
        entries.length > 0
          ? Math.round(
              entries.reduce((sum, e) => sum + e.flare_rating, 0) / entries.length
            )
          : 0;

      setWeekStats({ entries: entries.length, avgFlare });
    } catch (error) {
      console.error('Error calculating week stats:', error);
    }
  }, [session?.user?.id, today]);

  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchTodayEntry(), fetchWeekStats()]);
    setLoading(false);
  }, [fetchTodayEntry, fetchWeekStats]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const topSymptoms = todaySymptoms
    .filter((s) => s.is_present)
    .sort((a, b) => (b.severity || 0) - (a.severity || 0))
    .slice(0, 2);

  const onboardingIncomplete = !profile?.onboarding_complete;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {onboardingIncomplete && (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>Finish setup to personalize your tracking.</Text>
            <Button
              title="Finish setup"
              onPress={() => navigation.navigate('Profile')}
              variant="secondary"
              style={styles.bannerButton}
            />
          </View>
        )}

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Today's Check-in</Text>
          {!todayEntry ? (
            <>
              <Text style={styles.emptyText}>You haven't checked in yet.</Text>
              <Button
                title="Check in now"
                onPress={() => navigation.navigate('NewEntry', { date: today })}
                style={styles.button}
              />
            </>
          ) : (
            <>
              <Text style={styles.checkedInText}>
                Checked in at {formatTime(todayEntry.created_at)}
              </Text>
              <View style={styles.summaryContainer}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Flare Rating</Text>
                  <Text style={styles.summaryValue}>{todayEntry.flare_rating}/10</Text>
                </View>
                {topSymptoms.length > 0 && (
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Top Symptoms</Text>
                    {topSymptoms.map((symptom, idx) => (
                      <Text key={idx} style={styles.symptomText}>
                        • Severity {symptom.severity}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
              <Button
                title="Edit today"
                onPress={() => navigation.navigate('EditEntry', { entryId: todayEntry.id })}
                style={styles.button}
              />
            </>
          )}
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>This Week Snapshot</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Entries</Text>
              <Text style={styles.statValue}>{weekStats.entries}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Avg Flare</Text>
              <Text style={styles.statValue}>{weekStats.avgFlare}/10</Text>
            </View>
          </View>
          <View style={styles.buttonRow}>
            <Button
              title="View Trends"
              onPress={() => navigation.navigate('Trends')}
              variant="secondary"
              style={styles.halfButton}
            />
            <Button
              title="View Insights"
              onPress={() => navigation.navigate('Insights')}
              variant="secondary"
              style={styles.halfButton}
            />
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Upcoming Reminders</Text>
          <Text style={styles.placeholderText}>Set up reminders in your profile</Text>
          <Button
            title="Manage reminders"
            onPress={() => navigation.navigate('Profile')}
            style={styles.button}
          />
        </Card>
      </ScrollView>
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
  banner: {
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  bannerText: {
    ...typography.body,
    color: colors.darkGray,
    marginBottom: spacing.md,
    fontWeight: '500',
  },
  bannerButton: {
    marginTop: spacing.sm,
  },
  card: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.sectionHeader,
    marginBottom: spacing.md,
  },
  emptyText: {
    ...typography.body,
    color: colors.midGray,
    marginBottom: spacing.md,
  },
  checkedInText: {
    ...typography.secondary,
    marginBottom: spacing.md,
    color: colors.success,
    fontWeight: '500',
  },
  summaryContainer: {
    marginVertical: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.offWhite,
    borderRadius: borderRadius.md,
  },
  summaryItem: {
    marginBottom: spacing.md,
  },
  summaryLabel: {
    ...typography.secondary,
    marginBottom: spacing.xs,
  },
  summaryValue: {
    ...typography.sectionHeader,
    color: colors.primary,
  },
  symptomText: {
    ...typography.body,
    marginTop: spacing.xs,
  },
  button: {
    marginTop: spacing.md,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: spacing.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.offWhite,
    borderRadius: borderRadius.md,
  },
  statBox: {
    alignItems: 'center',
  },
  statLabel: {
    ...typography.secondary,
    marginBottom: spacing.xs,
  },
  statValue: {
    ...typography.sectionHeader,
    fontSize: 20,
    color: colors.primary,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  halfButton: {
    flex: 1,
  },
  placeholderText: {
    ...typography.secondary,
    marginBottom: spacing.md,
    fontStyle: 'italic',
  },
});

export default HomeScreen;
