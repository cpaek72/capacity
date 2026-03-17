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
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LineChart } from 'react-native-chart-kit';
import { colors, spacing, borderRadius, typography } from '../../../lib/theme';
import Button from '../../../components/Button';
import Card from '../../../components/Card';
import { supabase } from '../../../lib/supabase';
import { useSessionStore } from '../../../store/useSessionStore';
import { toISODateString, getDateNDaysAgo } from '../../../lib/dates';
import { Entry, UserSymptom } from '../../../types/db';

type RootStackParamList = {
  CorrelationExplorer: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'CorrelationExplorer'>;

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

type XVariable = 'sleep_hours' | 'sleep_quality' | 'stress' | 'mood' | 'trigger_presence' | 'med_adherence';
type YVariable = 'flare_rating' | string; // string for symptom IDs

interface CorrelationResult {
  xData: number[];
  yData: number[];
  correlation: number;
  explanation: string;
}

function pearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 2) return 0;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
  const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);
  const sumY2 = y.reduce((acc, yi) => acc + yi * yi, 0);
  const num = n * sumXY - sumX * sumY;
  const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  return den === 0 ? 0 : num / den;
}

function getExplanation(r: number): string {
  const absR = Math.abs(r);
  const direction = r > 0 ? 'positive' : 'negative';

  if (absR > 0.7) return `Strong ${direction} association (${r.toFixed(2)})`;
  if (absR > 0.5) return `Moderate ${direction} association (${r.toFixed(2)})`;
  if (absR > 0.3) return `Weak ${direction} association (${r.toFixed(2)})`;
  return `Very weak or no correlation (${r.toFixed(2)})`;
}

const CorrelationExplorerScreen: React.FC<Props> = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [generatingCorrelation, setGeneratingCorrelation] = useState(false);
  const [xVariable, setXVariable] = useState<XVariable>('sleep_hours');
  const [yVariable, setYVariable] = useState<YVariable>('flare_rating');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [userSymptoms, setUserSymptoms] = useState<UserSymptom[]>([]);
  const [correlationResult, setCorrelationResult] = useState<CorrelationResult | null>(null);
  const [showXModal, setShowXModal] = useState(false);
  const [showYModal, setShowYModal] = useState(false);
  const [savingInsight, setSavingInsight] = useState(false);
  const session = useSessionStore((state) => state.session);
  const userId = session?.user?.id;

  const xVariableLabels: Record<XVariable, string> = {
    sleep_hours: 'Sleep Hours',
    sleep_quality: 'Sleep Quality',
    stress: 'Stress Level',
    mood: 'Mood (0-4)',
    trigger_presence: 'Trigger Presence',
    med_adherence: 'Med Adherence %',
  };

  useEffect(() => {
    if (userId) {
      loadUserSymptoms();
    }
  }, [userId]);

  const loadUserSymptoms = async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('user_symptoms')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) throw error;
      setUserSymptoms(data || []);
    } catch (error) {
      console.error('Error loading user symptoms:', error);
    }
  };

  const generateCorrelation = async () => {
    if (!userId) return;

    setGeneratingCorrelation(true);
    try {
      // Calculate date range
      const daysAgo = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : dateRange === '90d' ? 90 : 999;
      const startDate = daysAgo === 999 ? '2000-01-01' : toISODateString(getDateNDaysAgo(daysAgo));
      const endDate = toISODateString(new Date());

      // Fetch entries
      const { data: entries, error: entriesError } = await supabase
        .from('entries')
        .select('*')
        .eq('user_id', userId)
        .gte('entry_date', startDate)
        .lte('entry_date', endDate)
        .order('entry_date', { ascending: true });

      if (entriesError) throw entriesError;
      if (!entries || entries.length < 2) {
        Alert.alert('Not enough data', 'Need at least 2 data points to calculate correlation');
        setGeneratingCorrelation(false);
        return;
      }

      // Extract X variable
      const xData: number[] = [];
      for (const entry of entries) {
        if (xVariable === 'sleep_hours') xData.push(entry.sleep_hours);
        else if (xVariable === 'sleep_quality') xData.push(entry.sleep_quality);
        else if (xVariable === 'stress') xData.push(entry.stress);
        else if (xVariable === 'mood') {
          const moodMap: Record<string, number> = { calm: 4, ok: 2, anxious: 1, sad: 0, irritable: 1 };
          xData.push(moodMap[entry.mood] || 2);
        } else if (xVariable === 'trigger_presence') {
          // Check if entry has any triggers
          const { data: triggerData } = await supabase
            .from('entry_triggers')
            .select('id')
            .eq('entry_id', entry.id)
            .limit(1);
          xData.push(triggerData && triggerData.length > 0 ? 1 : 0);
        } else if (xVariable === 'med_adherence') {
          // Count medication adherence percentage
          const { data: medData } = await supabase
            .from('entry_meds')
            .select('taken')
            .eq('entry_id', entry.id);
          if (medData && medData.length > 0) {
            const takenCount = medData.filter((m) => m.taken).length;
            xData.push((takenCount / medData.length) * 100);
          } else {
            xData.push(0);
          }
        }
      }

      // Extract Y variable
      let yData: number[] = [];
      let yVariableLabel = 'Flare Rating';

      if (yVariable === 'flare_rating') {
        yData = entries.map((e) => e.flare_rating);
      } else {
        // Symptom severity
        const { data: entrySymptoms, error: esError } = await supabase
          .from('entry_symptoms')
          .select('*')
          .eq('symptom_id', yVariable)
          .in(
            'entry_id',
            entries.map((e) => e.id)
          );

        if (esError) throw esError;

        const symptomMap = new Map(entrySymptoms?.map((es) => [es.entry_id, es.severity ?? 0]) || []);
        yData = entries.map((e) => symptomMap.get(e.id) ?? 0);

        const symptom = userSymptoms.find((s) => s.id === yVariable);
        yVariableLabel = symptom?.symptom_name || 'Symptom';
      }

      // Calculate correlation
      const correlation = pearsonCorrelation(xData, yData);
      const explanation = getExplanation(correlation);

      // Prepare chart data (limit to last 30 points for readability)
      const chartLimit = Math.min(30, entries.length);
      const chartXData = xData.slice(-chartLimit);
      const chartYData = yData.slice(-chartLimit);

      const chartData = {
        labels: entries.slice(-chartLimit).map((_, i) => `${i + 1}`),
        datasets: [
          {
            data: chartYData,
          },
        ],
      };

      setCorrelationResult({
        xData: chartXData,
        yData: chartYData,
        correlation,
        explanation,
      });
    } catch (error) {
      console.error('Error generating correlation:', error);
      Alert.alert('Error', 'Failed to generate correlation analysis');
    } finally {
      setGeneratingCorrelation(false);
    }
  };

  const handleSaveInsight = async () => {
    if (!userId || !correlationResult) return;

    setSavingInsight(true);
    try {
      const xLabel = xVariableLabels[xVariable as XVariable];
      const yLabel = yVariable === 'flare_rating' ? 'Flare Rating' : userSymptoms.find((s) => s.id === yVariable)?.symptom_name;

      const { error } = await supabase.from('saved_insights').insert([
        {
          user_id: userId,
          title: `${xLabel} vs ${yLabel}`,
          insight_type: 'correlation',
          payload_json: {
            xVariable,
            yVariable,
            correlation: correlationResult.correlation,
            explanation: correlationResult.explanation,
            xData: correlationResult.xData,
            yData: correlationResult.yData,
            dateRange,
          },
        },
      ]);

      if (error) throw error;

      Alert.alert('Success', 'Insight saved!');
    } catch (error) {
      console.error('Error saving insight:', error);
      Alert.alert('Error', 'Failed to save insight');
    } finally {
      setSavingInsight(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Correlation Explorer</Text>

        {/* Variable Controls */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Compare Variables</Text>

          {/* X Variable */}
          <View style={styles.controlSection}>
            <Text style={styles.label}>X Variable</Text>
            <TouchableOpacity
              style={styles.selector}
              onPress={() => setShowXModal(true)}
            >
              <Text style={styles.selectorText}>{xVariableLabels[xVariable]}</Text>
            </TouchableOpacity>
          </View>

          {/* Y Variable */}
          <View style={styles.controlSection}>
            <Text style={styles.label}>Y Variable</Text>
            <TouchableOpacity
              style={styles.selector}
              onPress={() => setShowYModal(true)}
            >
              <Text style={styles.selectorText}>
                {yVariable === 'flare_rating' ? 'Flare Rating' : userSymptoms.find((s) => s.id === yVariable)?.symptom_name || 'Select Symptom'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Date Range */}
          <View style={styles.controlSection}>
            <Text style={styles.label}>Date Range</Text>
            <View style={styles.dateRangeRow}>
              {(['7d', '30d', '90d', 'all'] as const).map((range) => (
                <TouchableOpacity
                  key={range}
                  style={[styles.dateRangeButton, dateRange === range && styles.dateRangeButtonActive]}
                  onPress={() => setDateRange(range)}
                >
                  <Text style={[styles.dateRangeText, dateRange === range && styles.dateRangeTextActive]}>
                    {range === 'all' ? 'All' : range}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Generate Button */}
          <Button
            title="Generate Analysis"
            onPress={generateCorrelation}
            loading={generatingCorrelation}
            disabled={generatingCorrelation}
            style={styles.generateButton}
          />
        </Card>

        {/* Results */}
        {correlationResult && (
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Results</Text>

            {/* Correlation Score */}
            <View style={styles.resultBox}>
              <Text style={styles.correlationLabel}>Correlation Coefficient</Text>
              <Text style={styles.correlationValue}>{correlationResult.correlation.toFixed(3)}</Text>
              <Text style={styles.explanationText}>{correlationResult.explanation}</Text>
            </View>

            {/* Chart would go here if we had the data prepared correctly
            <LineChart
              data={{
                labels: correlationResult.xData.map((_, i) => `${i}`),
                datasets: [{ data: correlationResult.yData }],
              }}
              width={screenWidth - spacing.xxl * 2 - spacing.lg * 2}
              height={250}
              chartConfig={chartConfig}
              style={styles.chart}
            />
            */}

            {/* Interpretation */}
            <View style={styles.interpretationBox}>
              <Text style={styles.interpretationTitle}>Interpretation</Text>
              <Text style={styles.interpretationText}>
                {correlationResult.correlation > 0.5
                  ? 'There is a strong positive relationship. When X increases, Y tends to increase.'
                  : correlationResult.correlation > 0.3
                  ? 'There is a moderate relationship between these variables.'
                  : correlationResult.correlation < -0.5
                  ? 'There is a strong negative relationship. When X increases, Y tends to decrease.'
                  : correlationResult.correlation < -0.3
                  ? 'There is a moderate negative relationship between these variables.'
                  : 'There is little to no correlation between these variables.'}
              </Text>
            </View>

            {/* Save Button */}
            <Button
              title="Save Insight"
              onPress={handleSaveInsight}
              loading={savingInsight}
              disabled={savingInsight}
              style={styles.saveButton}
            />
          </Card>
        )}
      </ScrollView>

      {/* X Variable Modal */}
      <Modal visible={showXModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select X Variable</Text>
            <FlatList
              data={Object.entries(xVariableLabels)}
              keyExtractor={([key]) => key}
              scrollEnabled={true}
              style={styles.modalList}
              renderItem={({ item: [key, label] }) => (
                <TouchableOpacity
                  style={[styles.modalOption, xVariable === key && styles.modalOptionSelected]}
                  onPress={() => {
                    setXVariable(key as XVariable);
                    setShowXModal(false);
                  }}
                >
                  <Text
                    style={[styles.modalOptionText, xVariable === key && styles.modalOptionTextSelected]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <Button
              title="Close"
              variant="secondary"
              onPress={() => setShowXModal(false)}
            />
          </View>
        </View>
      </Modal>

      {/* Y Variable Modal */}
      <Modal visible={showYModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Y Variable</Text>
            <FlatList
              data={[{ id: 'flare_rating', name: 'Flare Rating' }, ...userSymptoms.map((s) => ({ id: s.id, name: s.symptom_name }))]}
              keyExtractor={(item) => item.id}
              scrollEnabled={true}
              style={styles.modalList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalOption, yVariable === item.id && styles.modalOptionSelected]}
                  onPress={() => {
                    setYVariable(item.id);
                    setShowYModal(false);
                  }}
                >
                  <Text
                    style={[styles.modalOptionText, yVariable === item.id && styles.modalOptionTextSelected]}
                  >
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <Button
              title="Close"
              variant="secondary"
              onPress={() => setShowYModal(false)}
            />
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
  title: {
    ...typography.screenTitle,
    fontSize: 28,
    fontWeight: '700',
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
  controlSection: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.body,
    fontWeight: '500',
    marginBottom: spacing.sm,
  },
  selector: {
    borderWidth: 1,
    borderColor: colors.lightGray,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    justifyContent: 'center',
  },
  selectorText: {
    ...typography.body,
    color: colors.darkGray,
  },
  dateRangeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dateRangeButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.lightGray,
    alignItems: 'center',
  },
  dateRangeButtonActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  dateRangeText: {
    ...typography.secondary,
    color: colors.midGray,
  },
  dateRangeTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  generateButton: {
    marginTop: spacing.lg,
  },
  resultBox: {
    backgroundColor: colors.offWhite,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  correlationLabel: {
    ...typography.secondary,
    marginBottom: spacing.sm,
  },
  correlationValue: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.md,
  },
  explanationText: {
    ...typography.body,
    fontWeight: '500',
    color: colors.darkGray,
  },
  chart: {
    marginVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  interpretationBox: {
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  interpretationTitle: {
    ...typography.sectionHeader,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  interpretationText: {
    ...typography.body,
    color: colors.darkGray,
    lineHeight: 22,
  },
  saveButton: {
    marginBottom: spacing.lg,
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
    paddingVertical: spacing.lg,
    maxHeight: '80%',
  },
  modalTitle: {
    ...typography.sectionHeader,
    marginBottom: spacing.lg,
  },
  modalList: {
    maxHeight: 300,
    marginBottom: spacing.lg,
  },
  modalOption: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.lightGray,
  },
  modalOptionSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  modalOptionText: {
    ...typography.body,
    color: colors.darkGray,
  },
  modalOptionTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
});

export default CorrelationExplorerScreen;
