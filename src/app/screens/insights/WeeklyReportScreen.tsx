import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { colors, spacing, borderRadius, typography } from '../../../lib/theme';
import Button from '../../../components/Button';
import Card from '../../../components/Card';
import { supabase } from '../../../lib/supabase';
import { useSessionStore } from '../../../store/useSessionStore';
import { formatDate, parseISO, toISODateString } from '../../../lib/dates';
import { Entry, EntrySymptom, EntryTrigger, EntryMed, UserSymptom } from '../../../types/db';
import { InsightOutput } from '../../../types/models';
import { generateWeeklyInsights } from '../../../lib/insightsEngine';

type RootStackParamList = {
  WeeklyReport: { weekStart: string };
  Export: { weekStart?: string };
};

type Props = NativeStackScreenProps<RootStackParamList, 'WeeklyReport'>;

const chartConfig = {
  backgroundGradientFrom: '#FFFFFF',
  backgroundGradientTo: '#FFFFFF',
  decimalPlaces: 1,
  color: (opacity = 1) => `rgba(193, 18, 31, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(28, 28, 28, ${opacity})`,
  propsForDots: { r: '4', strokeWidth: '2', stroke: '#C1121F' },
  propsForBackgroundLines: { stroke: '#E5E5E5' },
};

const WeeklyReportScreen: React.FC<Props> = ({ navigation, route }) => {
  const { weekStart } = route.params;
  const [entries, setEntries] = useState<Entry[]>([]);
  const [entrySymptoms, setEntrySymptoms] = useState<EntrySymptom[]>([]);
  const [entryTriggers, setEntryTriggers] = useState<EntryTrigger[]>([]);
  const [entryMeds, setEntryMeds] = useState<EntryMed[]>([]);
  const [symptoms, setSymptoms] = useState<UserSymptom[]>([]);
  const [insights, setInsights] = useState<InsightOutput | null>(null);
  const [loading, setLoading] = useState(true);

  const session = useSessionStore((state) => state.session);

  const weekStartDate = parseISO(weekStart);
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekEndDate.getDate() + 6);
  const weekEndStr = toISODateString(weekEndDate);

  const fetchWeeklyData = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      setLoading(true);

      // Fetch entries for the week
      const { data: entriesData, error: entriesError } = await supabase
        .from('entries')
        .select('*')
        .eq('user_id', session.user.id)
        .gte('entry_date', weekStart)
        .lte('entry_date', weekEndStr)
        .order('entry_date', { ascending: true });

      if (entriesError) throw entriesError;

      setEntries(entriesData || []);

      if (!entriesData || entriesData.length === 0) {
        setLoading(false);
        return;
      }

      // Fetch user symptoms
      const { data: symptomsData, error: symptomsError } = await supabase
        .from('user_symptoms')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('is_active', true);

      if (symptomsError) throw symptomsError;
      setSymptoms(symptomsData || []);

      // Fetch entry symptoms
      const entryIds = entriesData.map((e) => e.id);
      const { data: entrySymptomsData, error: entrySymptomsError } = await supabase
        .from('entry_symptoms')
        .select('*')
        .in('entry_id', entryIds);

      if (entrySymptomsError) throw entrySymptomsError;
      setEntrySymptoms(entrySymptomsData || []);

      // Fetch entry triggers
      const { data: entryTriggersData, error: entryTriggersError } = await supabase
        .from('entry_triggers')
        .select('*')
        .in('entry_id', entryIds);

      if (entryTriggersError) throw entryTriggersError;
      setEntryTriggers(entryTriggersData || []);

      // Fetch entry meds
      const { data: entryMedsData, error: entryMedsError } = await supabase
        .from('entry_meds')
        .select('*')
        .in('entry_id', entryIds);

      if (entryMedsError) throw entryMedsError;
      setEntryMeds(entryMedsData || []);

      // Generate insights
      const generatedInsights = generateWeeklyInsights(
        entriesData as Entry[],
        entrySymptomsData || [],
        entryTriggersData || [],
        entryMedsData || [],
        symptomsData || []
      );

      setInsights(generatedInsights);
    } catch (error) {
      console.error('Error fetching weekly data:', error);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id, weekStart, weekEndStr]);

  useEffect(() => {
    fetchWeeklyData();
  }, [fetchWeeklyData]);

  const getChartData = () => {
    if (entries.length === 0) {
      return { labels: [], datasets: [{ data: [] }] };
    }

    const labels = entries.map((e) => {
      const date = parseISO(e.entry_date);
      return (date.getMonth() + 1) + '/' + date.getDate();
    });

    const flareData = entries.map((e) => e.flare_rating);

    return {
      labels,
      datasets: [
        {
          data: flareData,
          strokeWidth: 2,
        },
      ],
    };
  };

  const getSymptomChartData = () => {
    if (entrySymptoms.length === 0 || symptoms.length === 0) {
      return { labels: [], datasets: [{ data: [] }] };
    }

    // Get top 5 symptoms by frequency
    const symptomMap = new Map<string, { name: string; severities: number[] }>();

    entrySymptoms.forEach((es) => {
      if (es.is_present && es.severity !== null) {
        const symptom = symptoms.find((s) => s.id === es.symptom_id);
        if (symptom) {
          const existing = symptomMap.get(es.symptom_id) || {
            name: symptom.symptom_name,
            severities: [],
          };
          existing.severities.push(es.severity);
          symptomMap.set(es.symptom_id, existing);
        }
      }
    });

    const topSymptoms = Array.from(symptomMap.values())
      .map((s) => ({
        name: s.name,
        avgSeverity: Math.round((s.severities.reduce((a, b) => a + b, 0) / s.severities.length) * 10) / 10,
      }))
      .sort((a, b) => b.avgSeverity - a.avgSeverity)
      .slice(0, 5);

    const labels = topSymptoms.map((s) => s.name.substring(0, 12));
    const data = topSymptoms.map((s) => s.avgSeverity);

    return {
      labels,
      datasets: [
        {
          data: data.length > 0 ? data : [0],
        },
      ],
    };
  };

  const screenWidth = Dimensions.get('window').width - spacing.lg * 2;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (entries.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Card>
            <Text style={styles.sectionTitle}>No Data</Text>
            <Text style={styles.emptyText}>No entries found for this week.</Text>
          </Card>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const flareChartData = getChartData();
  const symptomChartData = getSymptomChartData();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Summary Section */}
        {insights && (
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Weekly Summary</Text>
            <Text style={styles.summaryText}>{insights.summaryParagraph}</Text>
          </Card>
        )}

        {/* Flare Rating Chart */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Flare Ratings This Week</Text>
          {flareChartData.datasets[0].data.length > 0 ? (
            <LineChart
              data={flareChartData}
              width={screenWidth}
              height={220}
              chartConfig={chartConfig}
              bezier
              fromZero
            />
          ) : (
            <Text style={styles.emptyText}>No flare data available</Text>
          )}
        </Card>

        {/* Symptom Severity Chart */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Top Symptoms by Severity</Text>
          {symptomChartData.datasets[0].data.length > 0 ? (
            <BarChart
              data={symptomChartData}
              width={screenWidth}
              height={220}
              chartConfig={chartConfig}
              fromZero
            />
          ) : (
            <Text style={styles.emptyText}>No symptom data available</Text>
          )}
        </Card>

        {/* Patterns Detected */}
        {insights && insights.possiblePatterns.length > 0 && (
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Patterns Detected</Text>
            {insights.possiblePatterns.map((pattern, idx) => (
              <View key={idx} style={styles.patternItem}>
                <Text style={styles.bulletPoint}>• {pattern}</Text>
              </View>
            ))}
          </Card>
        )}

        {/* Hypotheses */}
        {insights && insights.possiblePatterns.length > 0 && (
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Hypotheses</Text>
            <Text style={styles.hypothesisNote}>
              These are observations from your data, not medical conclusions. Discuss them with your
              healthcare provider.
            </Text>
            {insights.possiblePatterns.map((pattern, idx) => (
              <Text key={idx} style={styles.hypothesisItem}>
                {idx + 1}. {pattern}
              </Text>
            ))}
          </Card>
        )}

        {/* Suggested Experiments */}
        {insights && insights.tryNextWeek.length > 0 && (
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Suggested Experiments</Text>
            <Text style={styles.suggestionNote}>
              These are safe, general suggestions. Always consult your doctor before making health
              changes.
            </Text>
            {insights.tryNextWeek.slice(0, 5).map((suggestion, idx) => (
              <View key={idx} style={styles.suggestionItem}>
                <Text style={styles.bulletPoint}>• {suggestion}</Text>
              </View>
            ))}
          </Card>
        )}

        {/* Questions for Doctor */}
        {insights && insights.doctorQuestions.length > 0 && (
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Questions for Your Doctor</Text>
            {insights.doctorQuestions.map((question, idx) => (
              <Text key={idx} style={styles.questionItem}>
                {idx + 1}. {question}
              </Text>
            ))}
          </Card>
        )}

        {/* Export Button */}
        <Card style={styles.card}>
          <Button
            title="Export weekly report"
            onPress={() => navigation.navigate('Export', { weekStart })}
            style={styles.button}
          />
        </Card>

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            This app provides informational insights and is not medical advice. Always consult a
            qualified clinician.
          </Text>
        </View>
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
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.sectionHeader,
    marginBottom: spacing.md,
  },
  summaryText: {
    ...typography.body,
    lineHeight: 22,
  },
  emptyText: {
    ...typography.secondary,
    marginVertical: spacing.md,
  },
  patternItem: {
    marginBottom: spacing.md,
  },
  bulletPoint: {
    ...typography.body,
    lineHeight: 20,
  },
  hypothesisNote: {
    ...typography.secondary,
    marginBottom: spacing.md,
    fontStyle: 'italic',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.sm,
  },
  hypothesisItem: {
    ...typography.body,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  suggestionNote: {
    ...typography.secondary,
    marginBottom: spacing.md,
    fontStyle: 'italic',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.sm,
  },
  suggestionItem: {
    marginBottom: spacing.md,
  },
  questionItem: {
    ...typography.body,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  disclaimer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    marginBottom: spacing.lg,
  },
  disclaimerText: {
    ...typography.secondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  button: {
    marginTop: spacing.md,
  },
});

export default WeeklyReportScreen;
