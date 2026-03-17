import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, borderRadius, typography } from '../../../lib/theme';
import Button from '../../../components/Button';
import Card from '../../../components/Card';
import Chip from '../../../components/Chip';
import EmptyState from '../../../components/EmptyState';
import { supabase } from '../../../lib/supabase';
import { useSessionStore } from '../../../store/useSessionStore';
import { useProfileStore } from '../../../store/useProfileStore';
import { formatDate, getDateNDaysAgo, toISODateString } from '../../../lib/dates';
import { Entry, EntrySymptom } from '../../../types/db';

type RootStackParamList = {
  Timeline: undefined;
  EditEntry: { entryId: string };
};

type Props = NativeStackScreenProps<RootStackParamList, 'Timeline'>;

const TimelineScreen: React.FC<Props> = ({ navigation }) => {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [entrySymptoms, setEntrySymptoms] = useState<Map<string, EntrySymptom[]>>(
    new Map()
  );
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRange, setSelectedRange] = useState('7d');
  const [selectedSymptomFilter, setSelectedSymptomFilter] = useState<string | null>(
    null
  );
  const [showSymptomFilter, setShowSymptomFilter] = useState(false);

  const session = useSessionStore((state) => state.session);
  const symptoms = useProfileStore((state) => state.symptoms);

  const getRangeStart = useCallback((): string => {
    switch (selectedRange) {
      case '7d':
        return toISODateString(getDateNDaysAgo(7));
      case '30d':
        return toISODateString(getDateNDaysAgo(30));
      case '90d':
        return toISODateString(getDateNDaysAgo(90));
      default:
        return '1900-01-01';
    }
  }, [selectedRange]);

  const fetchEntries = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      setLoading(true);
      const rangeStart = getRangeStart();
      const today = toISODateString();

      let query = supabase
        .from('entries')
        .select('*')
        .eq('user_id', session.user.id)
        .gte('entry_date', rangeStart)
        .lte('entry_date', today)
        .order('entry_date', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching entries:', error);
        return;
      }

      let filtered = data || [];

      // Filter by symptom if selected
      if (selectedSymptomFilter && filtered.length > 0) {
        const entryIds = filtered.map((e) => e.id);
        const { data: symptomsData, error: symptomsError } = await supabase
          .from('entry_symptoms')
          .select('*')
          .in('entry_id', entryIds)
          .eq('symptom_id', selectedSymptomFilter)
          .eq('is_present', true);

        if (!symptomsError && symptomsData) {
          const matchingEntryIds = new Set(symptomsData.map((s) => s.entry_id));
          filtered = filtered.filter((e) => matchingEntryIds.has(e.id));
        }
      }

      setEntries(filtered);

      // Fetch symptoms for each entry
      if (filtered.length > 0) {
        const entryIds = filtered.map((e) => e.id);
        const { data: symptomsData, error: symptomsError } = await supabase
          .from('entry_symptoms')
          .select('*')
          .in('entry_id', entryIds)
          .eq('is_present', true);

        if (!symptomsError && symptomsData) {
          const symptomMap = new Map<string, EntrySymptom[]>();
          symptomsData.forEach((symptom: EntrySymptom) => {
            const existing = symptomMap.get(symptom.entry_id) || [];
            symptomMap.set(symptom.entry_id, [...existing, symptom]);
          });
          setEntrySymptoms(symptomMap);
        }
      } else {
        setEntrySymptoms(new Map());
      }
    } catch (error) {
      console.error('Error fetching entries:', error);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id, selectedRange, selectedSymptomFilter, getRangeStart]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchEntries();
    setRefreshing(false);
  }, [fetchEntries]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  useFocusEffect(
    useCallback(() => {
      fetchEntries();
    }, [fetchEntries])
  );

  const getTopSymptoms = (entryId: string): EntrySymptom[] => {
    return (entrySymptoms.get(entryId) || [])
      .sort((a, b) => (b.severity || 0) - (a.severity || 0))
      .slice(0, 3);
  };

  const handleClearFilter = useCallback(() => {
    setSelectedSymptomFilter(null);
    setShowSymptomFilter(false);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          <>
            {/* Date Range Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Time Range</Text>
              <View style={styles.chipRow}>
                {['7d', '30d', '90d', 'All'].map((range) => (
                  <Chip
                    key={range}
                    label={range === 'All' ? 'All time' : range}
                    selected={selectedRange === range}
                    onPress={() => setSelectedRange(range)}
                    style={styles.chip}
                  />
                ))}
              </View>
            </View>

            {/* Symptom Filter */}
            <View style={styles.filterSection}>
              <TouchableOpacity
                style={styles.symptomFilterButton}
                onPress={() => setShowSymptomFilter(!showSymptomFilter)}
              >
                <Text style={styles.filterLabel}>
                  Symptom Filter {selectedSymptomFilter && '✓'}
                </Text>
                <Text style={styles.filterChevron}>
                  {showSymptomFilter ? '▼' : '▶'}
                </Text>
              </TouchableOpacity>

              {showSymptomFilter && (
                <View style={styles.symptomFilterList}>
                  <TouchableOpacity
                    style={[
                      styles.symptomFilterOption,
                      !selectedSymptomFilter && styles.symptomFilterOptionSelected,
                    ]}
                    onPress={handleClearFilter}
                  >
                    <Text
                      style={[
                        styles.symptomFilterOptionText,
                        !selectedSymptomFilter &&
                          styles.symptomFilterOptionTextSelected,
                      ]}
                    >
                      All Symptoms
                    </Text>
                  </TouchableOpacity>
                  {symptoms.map((symptom) => (
                    <TouchableOpacity
                      key={symptom.id}
                      style={[
                        styles.symptomFilterOption,
                        selectedSymptomFilter === symptom.id &&
                          styles.symptomFilterOptionSelected,
                      ]}
                      onPress={() => {
                        setSelectedSymptomFilter(symptom.id);
                        setShowSymptomFilter(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.symptomFilterOptionText,
                          selectedSymptomFilter === symptom.id &&
                            styles.symptomFilterOptionTextSelected,
                        ]}
                      >
                        {symptom.symptom_name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </>
        }
        renderItem={({ item }) => {
          const topSymptoms = getTopSymptoms(item.id);
          return (
            <Card
              style={styles.entryCard}
              onPress={() => navigation.navigate('EditEntry', { entryId: item.id })}
            >
              <View style={styles.entryHeader}>
                <Text style={styles.entryDate}>{formatDate(item.entry_date)}</Text>
                <View
                  style={[
                    styles.flareRatingBadge,
                    {
                      backgroundColor:
                        item.flare_rating <= 3
                          ? colors.success
                          : item.flare_rating <= 6
                          ? colors.warning
                          : colors.error,
                    },
                  ]}
                >
                  <Text style={styles.flareRatingText}>{item.flare_rating}</Text>
                </View>
              </View>

              {topSymptoms.length > 0 && (
                <View style={styles.symptomsSection}>
                  <Text style={styles.symptomsLabel}>Top Symptoms</Text>
                  <View style={styles.symptomsList}>
                    {topSymptoms.map((symptom, idx) => (
                      <View key={idx} style={styles.symptomBadge}>
                        <Text style={styles.symptomBadgeText}>
                          Severity {symptom.severity}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              <View style={styles.entryFooter}>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Mood</Text>
                  <Text style={styles.metaValue}>{item.mood}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Sleep</Text>
                  <Text style={styles.metaValue}>{item.sleep_hours}h</Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Stress</Text>
                  <Text style={styles.metaValue}>{item.stress}/5</Text>
                </View>
              </View>

              {item.notes && (
                <View style={styles.notesSection}>
                  <Text style={styles.notesText} numberOfLines={2}>
                    {item.notes}
                  </Text>
                </View>
              )}
            </Card>
          );
        }}
        ListEmptyComponent={
          loading ? null : (
            <EmptyState
              title="No entries found"
              message={
                selectedSymptomFilter
                  ? 'No entries with this symptom in the selected period.'
                  : 'No entries in the selected time range.'
              }
            />
          )
        }
        contentContainerStyle={styles.listContent}
        scrollEnabled={true}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  filterSection: {
    marginBottom: spacing.lg,
  },
  filterLabel: {
    ...typography.sectionHeader,
    marginBottom: spacing.md,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  symptomFilterButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  filterChevron: {
    color: colors.primary,
    fontSize: 12,
  },
  symptomFilterList: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.lightGray,
    backgroundColor: colors.offWhite,
  },
  symptomFilterOption: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  symptomFilterOptionSelected: {
    backgroundColor: colors.primaryLight,
  },
  symptomFilterOptionText: {
    ...typography.body,
    color: colors.darkGray,
  },
  symptomFilterOptionTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  entryCard: {
    marginBottom: spacing.lg,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  entryDate: {
    ...typography.sectionHeader,
  },
  flareRatingBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    minWidth: 50,
    alignItems: 'center',
  },
  flareRatingText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 14,
  },
  symptomsSection: {
    marginBottom: spacing.md,
  },
  symptomsLabel: {
    ...typography.secondary,
    marginBottom: spacing.sm,
    fontWeight: '500',
  },
  symptomsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  symptomBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  symptomBadgeText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '500',
  },
  entryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: colors.lightGray,
    borderBottomColor: colors.lightGray,
    marginBottom: spacing.md,
  },
  metaItem: {
    alignItems: 'center',
  },
  metaLabel: {
    ...typography.secondary,
    fontSize: 12,
    marginBottom: spacing.xs,
  },
  metaValue: {
    ...typography.sectionHeader,
    fontSize: 14,
    color: colors.primary,
  },
  notesSection: {
    paddingTop: spacing.md,
  },
  notesText: {
    ...typography.secondary,
    color: colors.darkGray,
  },
});

export default TimelineScreen;
