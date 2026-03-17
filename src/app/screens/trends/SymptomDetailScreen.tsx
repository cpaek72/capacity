import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Modal,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LineChart } from 'react-native-chart-kit';
import { colors, spacing, borderRadius, typography, shadows } from '../../../lib/theme';
import Button from '../../../components/Button';
import Card from '../../../components/Card';
import SliderRow from '../../../components/SliderRow';
import { supabase } from '../../../lib/supabase';
import { useSessionStore } from '../../../store/useSessionStore';
import { formatDate, toISODateString, getDateNDaysAgo } from '../../../lib/dates';
import { Entry, UserSymptom, EntrySymptom } from '../../../types/db';

type RootStackParamList = {
  SymptomDetail: { symptomId: string };
  Timeline: { filteredEntryIds?: string[] };
};

type Props = NativeStackScreenProps<RootStackParamList, 'SymptomDetail'>;

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

interface CoOccurrenceSymptom {
  symptomId: string;
  symptomName: string;
  occurrenceRate: number;
}

interface TriggerStat {
  name: string;
  avgFlareWhenPresent: number;
}

const SymptomDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { symptomId } = route.params;
  const [loading, setLoading] = useState(true);
  const [symptom, setSymptom] = useState<UserSymptom | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [entrySymptoms, setEntrySymptoms] = useState<EntrySymptom[]>([]);
  const [allUserSymptoms, setAllUserSymptoms] = useState<UserSymptom[]>([]);
  const [coOccurrenceSymptoms, setCoOccurrenceSymptoms] = useState<CoOccurrenceSymptom[]>([]);
  const [commonTriggers, setCommonTriggers] = useState<TriggerStat[]>([]);
  const [showThresholdModal, setShowThresholdModal] = useState(false);
  const [thresholdValue, setThresholdValue] = useState(5);
  const session = useSessionStore((state) => state.session);
  const userId = session?.user?.id;

  useEffect(() => {
    if (userId) {
      loadData();
    }
  }, [userId, symptomId]);

  const loadData = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      // Fetch the symptom
      const { data: symptomData, error: symptomError } = await supabase
        .from('user_symptoms')
        .select('*')
        .eq('id', symptomId)
        .single();

      if (symptomError) throw symptomError;
      setSymptom(symptomData);

      // Fetch all entries
      const { data: entriesData, error: entriesError } = await supabase
        .from('entries')
        .select('*')
        .eq('user_id', userId)
        .order('entry_date', { ascending: true });

      if (entriesError) throw entriesError;
      setEntries(entriesData || []);

      // Fetch entry symptoms for this symptom
      if (entriesData && entriesData.length > 0) {
        const entryIds = entriesData.map((e) => e.id);
        const { data: entrySymsData, error: entrySymsError } = await supabase
          .from('entry_symptoms')
          .select('*')
          .eq('symptom_id', symptomId)
          .in('entry_id', entryIds);

        if (entrySymsError) throw entrySymsError;
        setEntrySymptoms(entrySymsData || []);
      }

      // Fetch all user symptoms
      const { data: allSymsData, error: allSymsError } = await supabase
        .from('user_symptoms')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (allSymsError) throw allSymsError;
      setAllUserSymptoms(allSymsData || []);

      // Calculate co-occurrences
      calculateCoOccurrences(entriesData || [], entrySymsData || [], allSymsData || []);

      // Calculate common triggers
      calculateCommonTriggers(entriesData || [], entrySymsData || []);
    } catch (error) {
      console.error('Error loading symptom detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateCoOccurrences = (
    allEntries: Entry[],
    symptomData: EntrySymptom[],
    otherSymptoms: UserSymptom[]
  ) => {
    const entriesWithThisSymptom = new Set(symptomData.map((es) => es.entry_id));
    const coOccurrences: Map<string, number> = new Map();

    otherSymptoms.forEach((otherSymptom) => {
      if (otherSymptom.id === symptomId) return;

      let coOccurrenceCount = 0;
      otherSymptoms.forEach((s) => {
        if (s.id === otherSymptom.id) {
          // This logic would need the actual entry_symptoms data for all symptoms
          // For now, we'll leave this as a placeholder
        }
      });

      coOccurrences.set(otherSymptom.symptom_name, coOccurrenceCount);
    });

    const coOccurrenceArray: CoOccurrenceSymptom[] = [];
    coOccurrences.forEach((count, symptomName) => {
      const sym = otherSymptoms.find((s) => s.symptom_name === symptomName);
      if (sym && entriesWithThisSymptom.size > 0) {
        coOccurrenceArray.push({
          symptomId: sym.id,
          symptomName,
          occurrenceRate: (count / entriesWithThisSymptom.size) * 100,
        });
      }
    });

    setCoOccurrenceSymptoms(coOccurrenceArray.sort((a, b) => b.occurrenceRate - a.occurrenceRate).slice(0, 5));
  };

  const calculateCommonTriggers = async (allEntries: Entry[], symptomData: EntrySymptom[]) => {
    const entriesWithSevereSymptom = symptomData.filter((es) => es.severity !== null && es.severity >= 5);
    const entryIds = entriesWithSevereSymptom.map((es) => es.entry_id);

    if (entryIds.length === 0) {
      setCommonTriggers([]);
      return;
    }

    const triggerStats: Map<string, number[]> = new Map();

    for (const entryId of entryIds) {
      const { data: triggersData, error } = await supabase
        .from('entry_triggers')
        .select('trigger_name')
        .eq('entry_id', entryId);

      if (!error && triggersData) {
        for (const trigger of triggersData) {
          const entry = allEntries.find((e) => e.id === entryId);
          if (entry) {
            if (!triggerStats.has(trigger.trigger_name)) {
              triggerStats.set(trigger.trigger_name, []);
            }
            triggerStats.get(trigger.trigger_name)!.push(entry.flare_rating);
          }
        }
      }
    }

    const triggerArray: TriggerStat[] = [];
    triggerStats.forEach((flareRatings, triggerName) => {
      const avgFlare = flareRatings.reduce((a, b) => a + b, 0) / flareRatings.length;
      triggerArray.push({
        name: triggerName,
        avgFlareWhenPresent: avgFlare,
      });
    });

    setCommonTriggers(triggerArray.sort((a, b) => b.avgFlareWhenPresent - a.avgFlareWhenPresent).slice(0, 5));
  };

  const handleViewHighSeverityDays = () => {
    const highSeverityEntryIds = entrySymptoms
      .filter((es) => es.severity !== null && es.severity >= thresholdValue)
      .map((es) => es.entry_id);

    navigation.navigate('Timeline', { filteredEntryIds: highSeverityEntryIds });
    setShowThresholdModal(false);
  };

  // Calculate averages for different time periods
  const calculate7DayAverage = () => {
    const sevenDaysAgo = toISODateString(getDateNDaysAgo(7));
    const last7DaysSymptoms = entrySymptoms.filter((es) => {
      const entry = entries.find((e) => e.id === es.entry_id);
      return entry && entry.entry_date >= sevenDaysAgo;
    });

    if (last7DaysSymptoms.length === 0) return 0;
    const severities = last7DaysSymptoms.filter((es) => es.severity !== null).map((es) => es.severity as number);
    return severities.length > 0 ? severities.reduce((a, b) => a + b, 0) / severities.length : 0;
  };

  const calculate30DayAverage = () => {
    const thirtyDaysAgo = toISODateString(getDateNDaysAgo(30));
    const last30DaysSymptoms = entrySymptoms.filter((es) => {
      const entry = entries.find((e) => e.id === es.entry_id);
      return entry && entry.entry_date >= thirtyDaysAgo;
    });

    if (last30DaysSymptoms.length === 0) return 0;
    const severities = last30DaysSymptoms.filter((es) => es.severity !== null).map((es) => es.severity as number);
    return severities.length > 0 ? severities.reduce((a, b) => a + b, 0) / severities.length : 0;
  };

  const calculate90DayAverage = () => {
    const ninetyDaysAgo = toISODateString(getDateNDaysAgo(90));
    const last90DaysSymptoms = entrySymptoms.filter((es) => {
      const entry = entries.find((e) => e.id === es.entry_id);
      return entry && entry.entry_date >= ninetyDaysAgo;
    });

    if (last90DaysSymptoms.length === 0) return 0;
    const severities = last90DaysSymptoms.filter((es) => es.severity !== null).map((es) => es.severity as number);
    return severities.length > 0 ? severities.reduce((a, b) => a + b, 0) / severities.length : 0;
  };

  // Severity over time chart
  const severityChartData = {
    labels: entries
      .filter((e) => entrySymptoms.some((es) => es.entry_id === e.id))
      .slice(Math.max(0, entries.length - 20))
      .map((e) => formatDate(e.entry_date, 'MMM d')),
    datasets: [
      {
        data: entries
          .filter((e) => entrySymptoms.some((es) => es.entry_id === e.id))
          .slice(Math.max(0, entries.length - 20))
          .map((e) => {
            const es = entrySymptoms.find((es) => es.entry_id === e.id);
            return es?.severity ?? 0;
          }),
      },
    ],
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!symptom) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Symptom not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{symptom.symptom_name}</Text>
        <Text style={styles.subtitle}>{symptom.category}</Text>

        {/* Severity Over Time Chart */}
        {severityChartData.datasets[0].data.length > 0 && (
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Severity Over Time</Text>
            <LineChart
              data={severityChartData}
              width={screenWidth - spacing.xxl * 2 - spacing.lg * 2}
              height={250}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
            />
          </Card>
        )}

        {/* Averages Card */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Averages</Text>
          <View style={styles.averageRow}>
            <View style={styles.averageColumn}>
              <Text style={styles.averageLabel}>7 days</Text>
              <Text style={styles.averageValue}>{calculate7DayAverage().toFixed(1)}</Text>
            </View>
            <View style={styles.averageDivider} />
            <View style={styles.averageColumn}>
              <Text style={styles.averageLabel}>30 days</Text>
              <Text style={styles.averageValue}>{calculate30DayAverage().toFixed(1)}</Text>
            </View>
            <View style={styles.averageDivider} />
            <View style={styles.averageColumn}>
              <Text style={styles.averageLabel}>90 days</Text>
              <Text style={styles.averageValue}>{calculate90DayAverage().toFixed(1)}</Text>
            </View>
          </View>
        </Card>

        {/* Co-Occurring Symptoms */}
        {coOccurrenceSymptoms.length > 0 && (
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Co-Occurring Symptoms</Text>
            <FlatList
              data={coOccurrenceSymptoms}
              scrollEnabled={false}
              keyExtractor={(item) => item.symptomId}
              renderItem={({ item }) => (
                <View style={styles.coOccurrenceRow}>
                  <Text style={styles.coOccurrenceName}>{item.symptomName}</Text>
                  <Text style={styles.coOccurrenceRate}>{item.occurrenceRate.toFixed(0)}%</Text>
                </View>
              )}
            />
          </Card>
        )}

        {/* Common Triggers */}
        {commonTriggers.length > 0 && (
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Common Triggers</Text>
            <FlatList
              data={commonTriggers}
              scrollEnabled={false}
              keyExtractor={(item) => item.name}
              renderItem={({ item }) => (
                <View style={styles.triggerRow}>
                  <Text style={styles.triggerName}>{item.name}</Text>
                  <Text style={styles.triggerFlare}>{item.avgFlareWhenPresent.toFixed(1)} avg flare</Text>
                </View>
              )}
            />
          </Card>
        )}

        {/* Action Button */}
        <Button
          title="View Days with High Severity"
          onPress={() => setShowThresholdModal(true)}
          style={styles.actionButton}
        />
      </ScrollView>

      {/* Threshold Modal */}
      <Modal visible={showThresholdModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Severity Threshold</Text>
            <Text style={styles.modalSubtext}>
              Show days where {symptom.symptom_name} severity is at least:
            </Text>

            <SliderRow
              label="Threshold"
              value={thresholdValue}
              onValueChange={setThresholdValue}
              min={1}
              max={10}
              step={1}
              showValue={true}
            />

            <View style={styles.modalButtons}>
              <Button
                title="View Days"
                onPress={handleViewHighSeverityDays}
              />
              <Button
                title="Cancel"
                variant="secondary"
                onPress={() => setShowThresholdModal(false)}
                style={styles.cancelButton}
              />
            </View>
          </View>
        </View>
      </Modal>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    ...typography.body,
    color: colors.error,
  },
  title: {
    ...typography.screenTitle,
    fontSize: 28,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.secondary,
    fontSize: 14,
    marginBottom: spacing.xl,
  },
  card: {
    marginBottom: spacing.lg,
  },
  cardTitle: {
    ...typography.sectionHeader,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  chart: {
    marginVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  averageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  averageColumn: {
    flex: 1,
    alignItems: 'center',
  },
  averageDivider: {
    width: 1,
    height: 50,
    backgroundColor: colors.lightGray,
    marginHorizontal: spacing.sm,
  },
  averageLabel: {
    ...typography.secondary,
    fontSize: 12,
  },
  averageValue: {
    ...typography.sectionHeader,
    fontSize: 20,
    color: colors.primary,
    marginVertical: spacing.xs,
  },
  coOccurrenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.lightGray,
  },
  coOccurrenceName: {
    ...typography.body,
  },
  coOccurrenceRate: {
    ...typography.sectionHeader,
    color: colors.primary,
  },
  triggerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.lightGray,
  },
  triggerName: {
    ...typography.body,
  },
  triggerFlare: {
    ...typography.secondary,
  },
  actionButton: {
    marginBottom: spacing.xl,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    ...typography.sectionHeader,
    fontSize: 18,
    marginBottom: spacing.md,
  },
  modalSubtext: {
    ...typography.body,
    marginBottom: spacing.lg,
  },
  modalButtons: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  cancelButton: {
    marginTop: spacing.md,
  },
});

export default SymptomDetailScreen;
