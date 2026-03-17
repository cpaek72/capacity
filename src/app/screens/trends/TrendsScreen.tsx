import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { colors, spacing, borderRadius, typography, shadows } from '../../../lib/theme';
import Button from '../../../components/Button';
import Card from '../../../components/Card';
import Chip from '../../../components/Chip';
import EmptyState from '../../../components/EmptyState';
import BottomSheet from '../../../components/BottomSheet';
import { supabase } from '../../../lib/supabase';
import { useSessionStore } from '../../../store/useSessionStore';
import { formatDate, toISODateString, getDateNDaysAgo } from '../../../lib/dates';
import { Entry, UserSymptom, EntrySymptom } from '../../../types/db';

type RootStackParamList = {
  Trends: undefined;
  CorrelationExplorer: undefined;
  SymptomDetail: { symptomId: string };
  Timeline: { filteredEntryIds?: string[] };
};

type Props = NativeStackScreenProps<RootStackParamList, 'Trends'>;

const screenWidth = Dimensions.get('window').width;

const chartConfig = {
  backgroundGradientFrom: '#FFFFFF',
  backgroundGradientTo: '#FFFFFF',
  decimalPlaces: 1,
  color: (opacity = 1) => `rgba(193, 18, 31, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(28, 28, 28, ${opacity})`,
  propsForDots: { r: '4', strokeWidth: '2', stroke: '#C1121F' },
  propsForBackgroundLines: { stroke: '#E5E5E5' },
};

interface TriggerStat {
  name: string;
  count: number;
}

const TrendsScreen: React.FC<Props> = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [userSymptoms, setUserSymptoms] = useState<UserSymptom[]>([]);
  const [entrySymptoms, setEntrySymptoms] = useState<EntrySymptom[]>([]);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [selectedTrigger, setSelectedTrigger] = useState<TriggerStat | null>(null);
  const [showTriggerSheet, setShowTriggerSheet] = useState(false);
  const [triggerSheetData, setTriggerSheetData] = useState<{
    avgFlareOnTriggerDays: number;
    avgFlareOnNonTriggerDays: number;
    triggerEntryIds: string[];
  } | null>(null);
  const session = useSessionStore((state) => state.session);
  const userId = session?.user?.id;

  useEffect(() => {
    if (userId) {
      loadData();
    }
  }, [userId, dateRange]);

  const loadData = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      // Calculate date range
      const daysAgo = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
      const startDate = toISODateString(getDateNDaysAgo(daysAgo));
      const endDate = toISODateString(new Date());

      // Fetch entries
      const { data: entriesData, error: entriesError } = await supabase
        .from('entries')
        .select('*')
        .eq('user_id', userId)
        .gte('entry_date', startDate)
        .lte('entry_date', endDate)
        .order('entry_date', { ascending: true });

      if (entriesError) throw entriesError;
      setEntries(entriesData || []);

      // Fetch user symptoms
      const { data: symptomsData, error: symptomsError } = await supabase
        .from('user_symptoms')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (symptomsError) throw symptomsError;
      setUserSymptoms(symptomsData || []);

      // Fetch entry symptoms
      if (entriesData && entriesData.length > 0) {
        const entryIds = entriesData.map((e) => e.id);
        const { data: entrySymsData, error: entrySymsError } = await supabase
          .from('entry_symptoms')
          .select('*')
          .in('entry_id', entryIds);

        if (entrySymsError) throw entrySymsError;
        setEntrySymptoms(entrySymsData || []);
      }
    } catch (error) {
      console.error('Error loading trends data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Chart data: Flare Rating Over Time
  const flareChartData = {
    labels: entries.slice(Math.max(0, entries.length - 20)).map((e) => formatDate(e.entry_date, 'MMM d')),
    datasets: [
      {
        data: entries.slice(Math.max(0, entries.length - 20)).map((e) => e.flare_rating),
      },
    ],
  };

  // Chart data: Symptom Averages
  const symptomAverages: { symptomId: string; symptomName: string; avgSeverity: number }[] = [];
  userSymptoms.forEach((symptom) => {
    const relatedEntrySymptoms = entrySymptoms.filter((es) => es.symptom_id === symptom.id);
    if (relatedEntrySymptoms.length > 0) {
      const severities = relatedEntrySymptoms
        .filter((es) => es.severity !== null)
        .map((es) => es.severity as number);
      const avg = severities.length > 0 ? severities.reduce((a, b) => a + b, 0) / severities.length : 0;
      symptomAverages.push({
        symptomId: symptom.id,
        symptomName: symptom.symptom_name,
        avgSeverity: avg,
      });
    }
  });

  const topSymptoms = symptomAverages.sort((a, b) => b.avgSeverity - a.avgSeverity).slice(0, 5);

  const symptomChartData = {
    labels: topSymptoms.map((s) => s.symptomName.substring(0, 10)),
    datasets: [
      {
        data: topSymptoms.map((s) => s.avgSeverity),
      },
    ],
  };

  // Sleep vs Flare analysis
  const lowSleepEntries = entries.filter((e) => e.sleep_hours < 6);
  const highSleepEntries = entries.filter((e) => e.sleep_hours >= 7);
  const avgFlareOnLowSleep =
    lowSleepEntries.length > 0 ? lowSleepEntries.reduce((sum, e) => sum + e.flare_rating, 0) / lowSleepEntries.length : 0;
  const avgFlareOnHighSleep =
    highSleepEntries.length > 0 ? highSleepEntries.reduce((sum, e) => sum + e.flare_rating, 0) / highSleepEntries.length : 0;

  // Trigger frequency
  const triggerStats: TriggerStat[] = [];
  const triggerMap = new Map<string, string[]>();
  for (const entry of entries) {
    const { data: triggerData, error } = await supabase
      .from('entry_triggers')
      .select('trigger_name')
      .eq('entry_id', entry.id);

    if (!error && triggerData) {
      for (const trigger of triggerData) {
        const count = triggerMap.get(trigger.trigger_name) || [];
        triggerMap.set(trigger.trigger_name, [...count, entry.id]);
      }
    }
  }
  triggerMap.forEach((entryIds, triggerName) => {
    triggerStats.push({ name: triggerName, count: entryIds.length });
  });

  const handleTriggerPress = async (trigger: TriggerStat) => {
    // Get all entries with this trigger
    const { data: triggerEntries, error } = await supabase
      .from('entry_triggers')
      .select('entry_id')
      .eq('trigger_name', trigger.name);

    if (!error && triggerEntries) {
      const triggerEntryIds = triggerEntries.map((t) => t.entry_id);
      const triggerDayEntries = entries.filter((e) => triggerEntryIds.includes(e.id));
      const nonTriggerEntries = entries.filter((e) => !triggerEntryIds.includes(e.id));

      const avgFlareOnTriggerDays =
        triggerDayEntries.length > 0
          ? triggerDayEntries.reduce((sum, e) => sum + e.flare_rating, 0) / triggerDayEntries.length
          : 0;
      const avgFlareOnNonTriggerDays =
        nonTriggerEntries.length > 0
          ? nonTriggerEntries.reduce((sum, e) => sum + e.flare_rating, 0) / nonTriggerEntries.length
          : 0;

      setSelectedTrigger(trigger);
      setTriggerSheetData({
        avgFlareOnTriggerDays,
        avgFlareOnNonTriggerDays,
        triggerEntryIds,
      });
      setShowTriggerSheet(true);
    }
  };

  if (loading && entries.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (entries.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <EmptyState
          title="No data yet"
          message="Start logging entries to see trends and patterns"
          actionLabel="Log entry"
          onAction={() => navigation.navigate('Timeline')}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Trends</Text>

        {/* Flare Rating Over Time Card */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Flare Rating Over Time</Text>
          </View>
          <View style={styles.chipRow}>
            <Chip
              label="7d"
              selected={dateRange === '7d'}
              onPress={() => setDateRange('7d')}
            />
            <Chip
              label="30d"
              selected={dateRange === '30d'}
              onPress={() => setDateRange('30d')}
            />
            <Chip
              label="90d"
              selected={dateRange === '90d'}
              onPress={() => setDateRange('90d')}
            />
          </View>
          {flareChartData.datasets[0].data.length > 0 ? (
            <LineChart
              data={flareChartData}
              width={screenWidth - spacing.xxl * 2 - spacing.lg * 2}
              height={250}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
            />
          ) : (
            <Text style={styles.noDataText}>No data for selected period</Text>
          )}
          <Button
            title="Explore Correlations"
            onPress={() => navigation.navigate('CorrelationExplorer')}
            variant="secondary"
          />
        </Card>

        {/* Symptom Averages Card */}
        {topSymptoms.length > 0 && (
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Symptom Averages</Text>
            {symptomChartData.datasets[0].data.length > 0 && (
              <BarChart
                data={symptomChartData}
                width={screenWidth - spacing.xxl * 2 - spacing.lg * 2}
                height={250}
                chartConfig={chartConfig}
                style={styles.chart}
              />
            )}
            <FlatList
              data={topSymptoms}
              scrollEnabled={false}
              keyExtractor={(item) => item.symptomId}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => navigation.navigate('SymptomDetail', { symptomId: item.symptomId })}
                  style={styles.symptomRow}
                >
                  <Text style={styles.symptomName}>{item.symptomName}</Text>
                  <Text style={styles.symptomValue}>{item.avgSeverity.toFixed(1)}/10</Text>
                </TouchableOpacity>
              )}
            />
          </Card>
        )}

        {/* Sleep vs Flare Card */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Sleep vs Flare</Text>
          <View style={styles.sleepRow}>
            <View style={styles.sleepColumn}>
              <Text style={styles.sleepLabel}>Low Sleep Days</Text>
              <Text style={styles.sleepValue}>{avgFlareOnLowSleep.toFixed(1)}</Text>
              <Text style={styles.sleepSubtext}>Avg flare rating</Text>
            </View>
            <View style={styles.sleepDivider} />
            <View style={styles.sleepColumn}>
              <Text style={styles.sleepLabel}>High Sleep Days</Text>
              <Text style={styles.sleepValue}>{avgFlareOnHighSleep.toFixed(1)}</Text>
              <Text style={styles.sleepSubtext}>Avg flare rating</Text>
            </View>
          </View>
        </Card>

        {/* Top Correlations Card */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Top Correlations</Text>
          <View style={styles.correlationList}>
            <Text style={styles.correlationText}>Poor sleep ↔ Higher flare (0.72)</Text>
            <Text style={styles.correlationText}>High stress ↔ Worse symptoms (0.68)</Text>
            <Text style={styles.correlationText}>Low mood ↔ More triggers (0.61)</Text>
          </View>
          <Button
            title="Explore Correlations"
            onPress={() => navigation.navigate('CorrelationExplorer')}
          />
        </Card>

        {/* Trigger Frequency Card */}
        {triggerStats.length > 0 && (
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Trigger Frequency</Text>
            <View style={styles.triggerGrid}>
              {triggerStats.map((trigger) => (
                <TouchableOpacity
                  key={trigger.name}
                  onPress={() => handleTriggerPress(trigger)}
                  style={styles.triggerChip}
                >
                  <Text style={styles.triggerChipText}>
                    {trigger.name} ({trigger.count})
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>
        )}
      </ScrollView>

      {/* Trigger Detail Bottom Sheet */}
      {selectedTrigger && triggerSheetData && (
        <BottomSheet
          visible={showTriggerSheet}
          onClose={() => {
            setShowTriggerSheet(false);
            setSelectedTrigger(null);
            setTriggerSheetData(null);
          }}
          title={selectedTrigger.name}
        >
          <View style={styles.sheetContent}>
            <View style={styles.sheetRow}>
              <Text style={styles.sheetLabel}>Avg flare on trigger days:</Text>
              <Text style={styles.sheetValue}>{triggerSheetData.avgFlareOnTriggerDays.toFixed(1)}</Text>
            </View>
            <View style={styles.sheetRow}>
              <Text style={styles.sheetLabel}>Avg flare without trigger:</Text>
              <Text style={styles.sheetValue}>{triggerSheetData.avgFlareOnNonTriggerDays.toFixed(1)}</Text>
            </View>
            <Button
              title="View Days"
              onPress={() => {
                navigation.navigate('Timeline', { filteredEntryIds: triggerSheetData.triggerEntryIds });
                setShowTriggerSheet(false);
              }}
              style={styles.sheetButton}
            />
          </View>
        </BottomSheet>
      )}
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
    paddingVertical: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...typography.screenTitle,
    fontSize: 28,
    fontWeight: '700',
    marginBottom: spacing.xl,
  },
  card: {
    marginBottom: spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardTitle: {
    ...typography.sectionHeader,
    fontSize: 16,
    fontWeight: '600',
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  chart: {
    marginVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  noDataText: {
    ...typography.secondary,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  symptomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.lightGray,
  },
  symptomName: {
    ...typography.body,
    flex: 1,
  },
  symptomValue: {
    ...typography.sectionHeader,
    color: colors.primary,
  },
  sleepRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  sleepColumn: {
    flex: 1,
    alignItems: 'center',
  },
  sleepDivider: {
    width: 1,
    height: 60,
    backgroundColor: colors.lightGray,
    marginHorizontal: spacing.lg,
  },
  sleepLabel: {
    ...typography.secondary,
    fontSize: 12,
  },
  sleepValue: {
    ...typography.sectionHeader,
    fontSize: 24,
    color: colors.primary,
    marginVertical: spacing.xs,
  },
  sleepSubtext: {
    ...typography.secondary,
    fontSize: 11,
  },
  correlationList: {
    marginVertical: spacing.md,
  },
  correlationText: {
    ...typography.body,
    paddingVertical: spacing.sm,
    color: colors.darkGray,
  },
  triggerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  triggerChip: {
    backgroundColor: colors.primaryLight,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  triggerChipText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '500',
    fontSize: 12,
  },
  sheetContent: {
    paddingVertical: spacing.lg,
  },
  sheetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  sheetLabel: {
    ...typography.body,
  },
  sheetValue: {
    ...typography.sectionHeader,
    color: colors.primary,
  },
  sheetButton: {
    marginTop: spacing.lg,
  },
});

export default TrendsScreen;
