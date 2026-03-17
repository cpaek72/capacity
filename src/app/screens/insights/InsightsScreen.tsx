import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, borderRadius, typography } from '../../../lib/theme';
import Button from '../../../components/Button';
import Card from '../../../components/Card';
import BottomSheet from '../../../components/BottomSheet';
import EmptyState from '../../../components/EmptyState';
import { supabase } from '../../../lib/supabase';
import { useSessionStore } from '../../../store/useSessionStore';
import { formatDate, toISODateString, getWeekRange } from '../../../lib/dates';
import { Entry, EntrySymptom, EntryTrigger, EntryMed, UserSymptom, SavedInsight } from '../../../types/db';
import { InsightOutput } from '../../../types/models';
import { generateWeeklyInsights } from '../../../lib/insightsEngine';

type RootStackParamList = {
  InsightsScreen: undefined;
  WeeklyReport: { weekStart: string };
  Export: { weekStart?: string };
};

type Props = NativeStackScreenProps<RootStackParamList, 'InsightsScreen'>;

const InsightsScreen: React.FC<Props> = ({ navigation }) => {
  const [insights, setInsights] = useState<InsightOutput | null>(null);
  const [savedInsights, setSavedInsights] = useState<SavedInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<number | null>(null);
  const [selectedInsight, setSelectedInsight] = useState<SavedInsight | null>(null);
  const [showInsightDetail, setShowInsightDetail] = useState(false);
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [appointmentDate, setAppointmentDate] = useState('');
  const [focusSymptom, setFocusSymptom] = useState('');
  const [symptoms, setSymptoms] = useState<UserSymptom[]>([]);

  const session = useSessionStore((state) => state.session);

  const today = toISODateString();
  const weekRange = getWeekRange();
  const weekStart = formatDate(weekRange.start, 'yyyy-MM-dd');

  const canRefreshInsights = useCallback((): boolean => {
    if (!lastRefreshed) return true;
    const hoursSinceRefresh = (Date.now() - lastRefreshed) / (1000 * 60 * 60);
    return hoursSinceRefresh >= 24;
  }, [lastRefreshed]);

  const getHoursUntilRefresh = useCallback((): number => {
    if (!lastRefreshed) return 0;
    const hoursSinceRefresh = (Date.now() - lastRefreshed) / (1000 * 60 * 60);
    return Math.max(0, Math.ceil(24 - hoursSinceRefresh));
  }, [lastRefreshed]);

  const fetchUserSymptoms = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      const { data, error } = await supabase
        .from('user_symptoms')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('is_active', true);

      if (error) throw error;
      setSymptoms(data || []);
    } catch (error) {
      console.error('Error fetching user symptoms:', error);
    }
  }, [session?.user?.id]);

  const fetchWeeklyData = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      // Fetch current week entries and related data
      const { data: entries, error: entriesError } = await supabase
        .from('entries')
        .select('*')
        .eq('user_id', session.user.id)
        .gte('entry_date', weekStart)
        .lte('entry_date', today);

      if (entriesError) throw entriesError;

      if (!entries || entries.length === 0) {
        setInsights(null);
        return;
      }

      // Fetch entry symptoms
      const entryIds = entries.map((e) => e.id);
      const { data: entrySymptoms, error: symptomsError } = await supabase
        .from('entry_symptoms')
        .select('*')
        .in('entry_id', entryIds);

      if (symptomsError) throw symptomsError;

      // Fetch entry triggers
      const { data: entryTriggers, error: triggersError } = await supabase
        .from('entry_triggers')
        .select('*')
        .in('entry_id', entryIds);

      if (triggersError) throw triggersError;

      // Fetch entry meds
      const { data: entryMeds, error: medsError } = await supabase
        .from('entry_meds')
        .select('*')
        .in('entry_id', entryIds);

      if (medsError) throw medsError;

      // Fetch prior week data for comparison
      const priorWeekStart = new Date(weekRange.start);
      priorWeekStart.setDate(priorWeekStart.getDate() - 7);
      const priorWeekStartStr = priorWeekStart.toISOString().split('T')[0];

      const priorWeekEnd = new Date(priorWeekStart);
      priorWeekEnd.setDate(priorWeekEnd.getDate() + 6);
      const priorWeekEndStr = priorWeekEnd.toISOString().split('T')[0];

      const { data: priorEntries } = await supabase
        .from('entries')
        .select('*')
        .eq('user_id', session.user.id)
        .gte('entry_date', priorWeekStartStr)
        .lte('entry_date', priorWeekEndStr);

      let priorSymptoms = null;
      if (priorEntries && priorEntries.length > 0) {
        const priorEntryIds = priorEntries.map((e) => e.id);
        const { data: symptoms } = await supabase
          .from('entry_symptoms')
          .select('*')
          .in('entry_id', priorEntryIds);
        priorSymptoms = symptoms;
      }

      // Generate insights
      const generatedInsights = generateWeeklyInsights(
        entries as Entry[],
        entrySymptoms || [],
        entryTriggers || [],
        entryMeds || [],
        symptoms,
        priorEntries as Entry[] | undefined,
        priorSymptoms || undefined
      );

      setInsights(generatedInsights);
    } catch (error) {
      console.error('Error fetching weekly data:', error);
    }
  }, [session?.user?.id, weekStart, today]);

  const fetchSavedInsights = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      const { data, error } = await supabase
        .from('saved_insights')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavedInsights(data || []);
    } catch (error) {
      console.error('Error fetching saved insights:', error);
    }
  }, [session?.user?.id]);

  const loadLastRefreshTime = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('insights_last_refreshed');
      if (stored) {
        setLastRefreshed(parseInt(stored, 10));
      }
    } catch (error) {
      console.error('Error loading refresh time:', error);
    }
  }, []);

  const handleRefreshInsights = useCallback(async () => {
    if (!canRefreshInsights()) {
      return;
    }

    setRefreshing(true);
    try {
      await Promise.all([fetchWeeklyData(), fetchSavedInsights()]);
      const now = Date.now();
      setLastRefreshed(now);
      await AsyncStorage.setItem('insights_last_refreshed', now.toString());
    } catch (error) {
      console.error('Error refreshing insights:', error);
    } finally {
      setRefreshing(false);
    }
  }, [fetchWeeklyData, fetchSavedInsights, canRefreshInsights]);

  const handleDeleteInsight = useCallback(
    async (insightId: string) => {
      if (!session?.user?.id) return;

      try {
        const { error } = await supabase
          .from('saved_insights')
          .delete()
          .eq('id', insightId)
          .eq('user_id', session.user.id);

        if (error) throw error;
        await fetchSavedInsights();
        setShowInsightDetail(false);
      } catch (error) {
        console.error('Error deleting insight:', error);
      }
    },
    [session?.user?.id, fetchSavedInsights]
  );

  const handleGenerateDoctorQuestions = useCallback(() => {
    setShowDoctorModal(true);
  }, []);

  const handleExportQuestions = useCallback(() => {
    navigation.navigate('Export', { weekStart });
    setShowDoctorModal(false);
  }, [navigation, weekStart]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchWeeklyData(),
        fetchSavedInsights(),
        fetchUserSymptoms(),
        loadLastRefreshTime(),
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchWeeklyData, fetchSavedInsights, fetchUserSymptoms, loadLastRefreshTime]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const hoursUntil = getHoursUntilRefresh();
  const canRefresh = canRefreshInsights();

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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefreshInsights} />}
        showsVerticalScrollIndicator={false}
      >
        {/* This Week's Summary Section */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>This Week's Summary</Text>
          {insights ? (
            <>
              <Text style={styles.summaryText}>{insights.summaryParagraph}</Text>

              {insights.whatChanged.length > 0 && (
                <View style={styles.subsection}>
                  <Text style={styles.subsectionTitle}>What Changed</Text>
                  {insights.whatChanged.map((item, idx) => (
                    <Text key={idx} style={styles.bulletPoint}>
                      • {item}
                    </Text>
                  ))}
                </View>
              )}

              {insights.possiblePatterns.length > 0 && (
                <View style={styles.subsection}>
                  <Text style={styles.subsectionTitle}>Possible Patterns</Text>
                  {insights.possiblePatterns.map((item, idx) => (
                    <Text key={idx} style={styles.bulletPoint}>
                      • {item}
                    </Text>
                  ))}
                </View>
              )}

              {insights.tryNextWeek.length > 0 && (
                <View style={styles.subsection}>
                  <Text style={styles.subsectionTitle}>Try Next Week</Text>
                  {insights.tryNextWeek.slice(0, 3).map((item, idx) => (
                    <Text key={idx} style={styles.bulletPoint}>
                      • {item}
                    </Text>
                  ))}
                </View>
              )}

              <View style={styles.buttonGroup}>
                <Button
                  title={
                    canRefresh
                      ? 'Refresh insights'
                      : `Refresh in ${hoursUntil}h`
                  }
                  onPress={handleRefreshInsights}
                  disabled={!canRefresh}
                  variant={canRefresh ? 'primary' : 'secondary'}
                  style={styles.button}
                />
                <Button
                  title="View full weekly report"
                  onPress={() => navigation.navigate('WeeklyReport', { weekStart })}
                  variant="secondary"
                  style={styles.button}
                />
              </View>
            </>
          ) : (
            <Text style={styles.emptyText}>
              You need at least 2 entries this week to generate insights. Keep tracking!
            </Text>
          )}
        </Card>

        {/* Saved Insights Section */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Saved Insights</Text>
          {savedInsights.length > 0 ? (
            <FlatList
              data={savedInsights}
              scrollEnabled={false}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.insightItem}
                  onPress={() => {
                    setSelectedInsight(item);
                    setShowInsightDetail(true);
                  }}
                >
                  <View style={styles.insightItemContent}>
                    <Text style={styles.insightTitle}>{item.title}</Text>
                    <Text style={styles.insightDate}>{formatDate(item.created_at)}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          ) : (
            <Text style={styles.emptyText}>No saved insights yet. Generate insights to save them.</Text>
          )}
        </Card>

        {/* Doctor Prep Section */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Doctor Prep</Text>
          <Text style={styles.descriptionText}>
            Generate questions based on your symptom tracking to discuss with your healthcare provider.
          </Text>
          <Button
            title="Generate doctor questions"
            onPress={handleGenerateDoctorQuestions}
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

      {/* Insight Detail Modal */}
      <BottomSheet
        visible={showInsightDetail}
        onClose={() => setShowInsightDetail(false)}
        title={selectedInsight?.title}
      >
        {selectedInsight && (
          <View>
            <Text style={styles.modalText}>{JSON.stringify(selectedInsight.payload_json, null, 2)}</Text>
            <Button
              title="Delete insight"
              onPress={() => handleDeleteInsight(selectedInsight.id)}
              variant="secondary"
              style={[styles.button, { marginTop: spacing.lg }]}
            />
          </View>
        )}
      </BottomSheet>

      {/* Doctor Questions Modal */}
      <BottomSheet
        visible={showDoctorModal}
        onClose={() => setShowDoctorModal(false)}
        title="Generate Doctor Questions"
      >
        <View>
          <Text style={styles.modalLabel}>Appointment Date</Text>
          <View style={styles.input}>
            <Text style={styles.inputText}>{appointmentDate || 'Enter date (YYYY-MM-DD)'}</Text>
          </View>

          <Text style={[styles.modalLabel, { marginTop: spacing.md }]}>Focus Symptom (optional)</Text>
          <ScrollView style={styles.symptomList}>
            {symptoms.map((symptom) => (
              <TouchableOpacity
                key={symptom.id}
                style={[
                  styles.symptomOption,
                  focusSymptom === symptom.id && styles.symptomOptionSelected,
                ]}
                onPress={() => setFocusSymptom(focusSymptom === symptom.id ? '' : symptom.id)}
              >
                <Text
                  style={[
                    styles.symptomOptionText,
                    focusSymptom === symptom.id && styles.symptomOptionTextSelected,
                  ]}
                >
                  {symptom.symptom_name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {insights && (
            <View style={{ marginTop: spacing.md }}>
              <Text style={styles.questionsTitle}>Your Questions:</Text>
              {insights.doctorQuestions.map((q, idx) => (
                <Text key={idx} style={styles.questionItem}>
                  {idx + 1}. {q}
                </Text>
              ))}
            </View>
          )}

          <Button
            title="Export questions"
            onPress={handleExportQuestions}
            style={{ marginTop: spacing.lg }}
          />
        </View>
      </BottomSheet>
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
    marginBottom: spacing.md,
  },
  subsection: {
    marginBottom: spacing.md,
  },
  subsectionTitle: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.sm,
    color: colors.primary,
  },
  bulletPoint: {
    ...typography.body,
    marginBottom: spacing.sm,
    marginLeft: spacing.md,
    lineHeight: 20,
  },
  buttonGroup: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  button: {
    marginTop: spacing.md,
  },
  emptyText: {
    ...typography.secondary,
    marginVertical: spacing.md,
  },
  insightItem: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  insightItemContent: {
    flex: 1,
  },
  insightTitle: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  insightDate: {
    ...typography.secondary,
  },
  descriptionText: {
    ...typography.body,
    marginBottom: spacing.md,
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
  modalLabel: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.lightGray,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  inputText: {
    ...typography.body,
    color: colors.midGray,
  },
  symptomList: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: colors.lightGray,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },
  symptomOption: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.offWhite,
  },
  symptomOptionSelected: {
    backgroundColor: colors.primaryLight,
  },
  symptomOptionText: {
    ...typography.body,
  },
  symptomOptionTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  questionsTitle: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  questionItem: {
    ...typography.body,
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
  modalText: {
    ...typography.secondary,
    marginBottom: spacing.md,
  },
});

export default InsightsScreen;
