import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, borderRadius, typography } from '../../../lib/theme';
import Button from '../../../components/Button';
import Card from '../../../components/Card';
import Chip from '../../../components/Chip';
import Input from '../../../components/Input';
import { supabase } from '../../../lib/supabase';
import { useSessionStore } from '../../../store/useSessionStore';
import { formatDate, toISODateString, getDateNDaysAgo } from '../../../lib/dates';
import { Entry, EntrySymptom, EntryTrigger, EntryMed, UserSymptom, UserMed } from '../../../types/db';
import type { ExportOptions } from '../../../types/models';
import { buildExportReport, ExportData } from '../../../lib/exportBuilder';

type RootStackParamList = {
  ExportScreen: {
    entryId?: string;
    weekStart?: string;
    dateRangeStart?: string;
    dateRangeEnd?: string;
  };
  ExportPreview: { reportText: string };
};

type Props = NativeStackScreenProps<RootStackParamList, 'ExportScreen'>;

type ExportType = 'today' | 'thirty' | 'weekly' | 'custom';

const ExportScreen: React.FC<Props> = ({ navigation, route }) => {
  const [exportType, setExportType] = useState<ExportType>('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [includeNotes, setIncludeNotes] = useState(true);
  const [includeMeds, setIncludeMeds] = useState(true);
  const [includeTriggers, setIncludeTriggers] = useState(true);
  const [anonymize, setAnonymize] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const session = useSessionStore((state) => state.session);
  const profile = useSessionStore((state) => state.profile);

  const fetchExportData = useCallback(async (options: ExportOptions) => {
    if (!session?.user?.id || !profile) {
      setError('Not authenticated');
      return null;
    }

    try {
      // Determine date range for query
      let startDate: string;
      let endDate: string;

      if (options.dateRange) {
        startDate = options.dateRange.start;
        endDate = options.dateRange.end;
      } else if (options.weekStart) {
        const start = new Date(options.weekStart);
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        startDate = options.weekStart;
        endDate = toISODateString(end);
      } else {
        // Single entry
        const entry = (await supabase
          .from('entries')
          .select('*')
          .eq('id', options.entryId)
          .single()) as any;
        startDate = entry.data?.entry_date || toISODateString();
        endDate = startDate;
      }

      // Fetch all relevant data
      const [entriesRes, symptomsRes, triggersRes, medsRes, userSymptomsRes, userMedsRes] = await Promise.all([
        supabase
          .from('entries')
          .select('*')
          .eq('user_id', session.user.id)
          .gte('entry_date', startDate)
          .lte('entry_date', endDate),
        supabase.from('entry_symptoms').select('*').eq('user_id', session.user.id),
        supabase.from('entry_triggers').select('*'),
        supabase.from('entry_meds').select('*'),
        supabase.from('user_symptoms').select('*').eq('user_id', session.user.id),
        supabase.from('user_meds').select('*').eq('user_id', session.user.id),
      ]);

      if (entriesRes.error) {
        console.error('Error fetching entries:', entriesRes.error);
        setError('Failed to fetch entries');
        return null;
      }

      // Filter symptoms, triggers, and meds for selected entries
      const entryIds = new Set((entriesRes.data || []).map((e) => e.id));
      const filteredSymptoms = (symptomsRes.data || []).filter((s) => entryIds.has(s.entry_id));
      const filteredTriggers = (triggersRes.data || []).filter((t) => entryIds.has(t.entry_id));
      const filteredMeds = (medsRes.data || []).filter((m) => entryIds.has(m.entry_id));

      const data: ExportData = {
        profile,
        entries: entriesRes.data || [],
        entrySymptoms: filteredSymptoms,
        entryTriggers: filteredTriggers,
        entryMeds: filteredMeds,
        symptoms: (userSymptomsRes.data || []) as UserSymptom[],
        meds: (userMedsRes.data || []) as UserMed[],
      };

      return data;
    } catch (err) {
      console.error('Error fetching export data:', err);
      setError('Failed to load data');
      return null;
    }
  }, [session?.user?.id, profile]);

  const handleGenerateReport = useCallback(async () => {
    setError('');
    setLoading(true);

    try {
      const now = new Date();
      let options: ExportOptions;

      switch (exportType) {
        case 'today': {
          const today = toISODateString();
          options = {
            dateRange: { start: today, end: today },
            includeNotes,
            includeMeds,
            includeTriggers,
            anonymize,
          };
          break;
        }

        case 'thirty': {
          const thirtyDaysAgo = getDateNDaysAgo(30);
          const thirtyDaysAgoStr = toISODateString(thirtyDaysAgo);
          const today = toISODateString();
          options = {
            dateRange: { start: thirtyDaysAgoStr, end: today },
            includeNotes,
            includeMeds,
            includeTriggers,
            anonymize,
          };
          break;
        }

        case 'weekly': {
          const today = new Date();
          const dayOfWeek = today.getDay();
          const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
          const lastMonday = new Date(today);
          lastMonday.setDate(lastMonday.getDate() - daysToMonday);
          const weekStart = toISODateString(lastMonday);
          options = {
            weekStart,
            includeNotes,
            includeMeds,
            includeTriggers,
            anonymize,
          };
          break;
        }

        case 'custom': {
          if (!customStartDate || !customEndDate) {
            setError('Please enter both start and end dates');
            setLoading(false);
            return;
          }

          const start = new Date(customStartDate);
          const end = new Date(customEndDate);

          if (start > end) {
            setError('Start date must be before end date');
            setLoading(false);
            return;
          }

          options = {
            dateRange: { start: customStartDate, end: customEndDate },
            includeNotes,
            includeMeds,
            includeTriggers,
            anonymize,
          };
          break;
        }
      }

      const data = await fetchExportData(options);
      if (!data) {
        return;
      }

      const reportText = buildExportReport(data, options);
      navigation.navigate('ExportPreview', { reportText });
    } catch (err) {
      console.error('Error generating report:', err);
      setError('Failed to generate report');
    } finally {
      setLoading(false);
    }
  }, [exportType, customStartDate, customEndDate, includeNotes, includeMeds, includeTriggers, anonymize, fetchExportData, navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Export Type Selection */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Export Type</Text>
          <Text style={styles.label}>Select what you want to export:</Text>
          <View style={styles.chipContainer}>
            <Chip
              label="Today's entry"
              selected={exportType === 'today'}
              onPress={() => setExportType('today')}
            />
            <Chip
              label="Last 30 days"
              selected={exportType === 'thirty'}
              onPress={() => setExportType('thirty')}
            />
            <Chip
              label="Weekly report"
              selected={exportType === 'weekly'}
              onPress={() => setExportType('weekly')}
            />
            <Chip
              label="Custom range"
              selected={exportType === 'custom'}
              onPress={() => setExportType('custom')}
            />
          </View>
        </Card>

        {/* Custom Date Range Inputs */}
        {exportType === 'custom' && (
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Select Date Range</Text>
            <Input
              label="Start date (YYYY-MM-DD)"
              value={customStartDate}
              onChangeText={setCustomStartDate}
              placeholder="2024-01-01"
            />
            <Input
              label="End date (YYYY-MM-DD)"
              value={customEndDate}
              onChangeText={setCustomEndDate}
              placeholder="2024-01-31"
            />
          </Card>
        )}

        {/* Options */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Report Options</Text>
          <View style={styles.optionRow}>
            <Text style={styles.optionLabel}>Include notes</Text>
            <Switch value={includeNotes} onValueChange={setIncludeNotes} />
          </View>
          <View style={styles.optionRow}>
            <Text style={styles.optionLabel}>Include medications</Text>
            <Switch value={includeMeds} onValueChange={setIncludeMeds} />
          </View>
          <View style={styles.optionRow}>
            <Text style={styles.optionLabel}>Include triggers</Text>
            <Switch value={includeTriggers} onValueChange={setIncludeTriggers} />
          </View>
          <View style={styles.optionRow}>
            <Text style={styles.optionLabel}>Anonymize personal info</Text>
            <Switch value={anonymize} onValueChange={setAnonymize} />
          </View>
        </Card>

        {/* Error message */}
        {error && (
          <Card style={[styles.card, styles.errorCard]}>
            <Text style={styles.errorText}>{error}</Text>
          </Card>
        )}

        {/* Generate Button */}
        <Button
          title={loading ? 'Generating report...' : 'Generate Report'}
          onPress={handleGenerateReport}
          disabled={loading}
          style={styles.generateButton}
        />
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
  card: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.sectionHeader,
    marginBottom: spacing.md,
  },
  label: {
    ...typography.body,
    color: colors.midGray,
    marginBottom: spacing.md,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  optionLabel: {
    ...typography.body,
    flex: 1,
  },
  errorCard: {
    backgroundColor: '#FDEAEA',
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
  },
  generateButton: {
    marginBottom: spacing.xl,
  },
});

export default ExportScreen;
