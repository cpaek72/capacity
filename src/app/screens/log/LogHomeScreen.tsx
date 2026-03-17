import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  FlatList,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, borderRadius, typography, shadows } from '../../../lib/theme';
import Button from '../../../components/Button';
import Card from '../../../components/Card';
import EmptyState from '../../../components/EmptyState';
import { supabase } from '../../../lib/supabase';
import { useSessionStore } from '../../../store/useSessionStore';
import { formatDate, toISODateString } from '../../../lib/dates';
import { Entry } from '../../../types/db';

type RootStackParamList = {
  LogHomeScreen: undefined;
  NewEntry: { date: string };
  Calendar: undefined;
  Timeline: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'LogHomeScreen'>;

const LogHomeScreen: React.FC<Props> = ({ navigation }) => {
  const [recentEntries, setRecentEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const session = useSessionStore((state) => state.session);

  const fetchRecentEntries = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      const { data, error } = await supabase
        .from('entries')
        .select('*')
        .eq('user_id', session.user.id)
        .order('entry_date', { ascending: false })
        .limit(3);

      if (error) {
        console.error('Error fetching recent entries:', error);
        return;
      }

      setRecentEntries(data || []);
    } catch (error) {
      console.error('Error fetching recent entries:', error);
    }
  }, [session?.user?.id]);

  const loadData = useCallback(async () => {
    setLoading(true);
    await fetchRecentEntries();
    setLoading(false);
  }, [fetchRecentEntries]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRecentEntries();
    setRefreshing(false);
  }, [fetchRecentEntries]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const today = toISODateString();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Logging</Text>

        <Card style={styles.actionCard} onPress={() => navigation.navigate('NewEntry', { date: today })}>
          <View style={styles.actionContent}>
            <Text style={styles.actionIcon}>📝</Text>
            <View style={styles.actionText}>
              <Text style={styles.actionTitle}>Log Today</Text>
              <Text style={styles.actionDescription}>Record today's symptoms and tracking</Text>
            </View>
          </View>
        </Card>

        <Card style={styles.actionCard} onPress={() => navigation.navigate('Calendar')}>
          <View style={styles.actionContent}>
            <Text style={styles.actionIcon}>📅</Text>
            <View style={styles.actionText}>
              <Text style={styles.actionTitle}>Calendar</Text>
              <Text style={styles.actionDescription}>View entries by date</Text>
            </View>
          </View>
        </Card>

        <Card style={styles.actionCard} onPress={() => navigation.navigate('Timeline')}>
          <View style={styles.actionContent}>
            <Text style={styles.actionIcon}>📊</Text>
            <View style={styles.actionText}>
              <Text style={styles.actionTitle}>Timeline</Text>
              <Text style={styles.actionDescription}>Browse all entries chronologically</Text>
            </View>
          </View>
        </Card>

        <Text style={styles.recentTitle}>Recent Entries</Text>

        {recentEntries.length === 0 ? (
          <EmptyState
            title="No entries yet"
            message="Start logging your health to see recent entries here."
          />
        ) : (
          <FlatList
            data={recentEntries}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <Card
                style={styles.entryCard}
                onPress={() => navigation.navigate('Calendar')}
              >
                <View style={styles.entryHeader}>
                  <Text style={styles.entryDate}>{formatDate(item.entry_date)}</Text>
                  <View style={[
                    styles.flareRatingBadge,
                    {
                      backgroundColor:
                        item.flare_rating <= 3
                          ? colors.success
                          : item.flare_rating <= 6
                          ? colors.warning
                          : colors.error,
                    },
                  ]}>
                    <Text style={styles.flareRatingText}>{item.flare_rating}</Text>
                  </View>
                </View>
                <Text style={styles.moodText}>Mood: {item.mood}</Text>
                {item.notes && (
                  <Text style={styles.notesText} numberOfLines={2}>
                    {item.notes}
                  </Text>
                )}
              </Card>
            )}
          />
        )}
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
  title: {
    ...typography.screenTitle,
    fontSize: 24,
    marginBottom: spacing.lg,
  },
  actionCard: {
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 32,
    marginRight: spacing.lg,
  },
  actionText: {
    flex: 1,
  },
  actionTitle: {
    ...typography.sectionHeader,
    marginBottom: spacing.xs,
  },
  actionDescription: {
    ...typography.secondary,
  },
  recentTitle: {
    ...typography.sectionHeader,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  entryCard: {
    marginBottom: spacing.md,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  entryDate: {
    ...typography.sectionHeader,
  },
  flareRatingBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flareRatingText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 14,
  },
  moodText: {
    ...typography.body,
    marginBottom: spacing.sm,
  },
  notesText: {
    ...typography.secondary,
    marginTop: spacing.sm,
  },
});

export default LogHomeScreen;
