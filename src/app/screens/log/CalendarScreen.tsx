import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  format,
  getDaysInMonth,
  startOfMonth,
  addMonths,
  subMonths,
  isSameDay,
  parseISO,
} from 'date-fns';
import { colors, spacing, borderRadius, typography } from '../../../lib/theme';
import Button from '../../../components/Button';
import Card from '../../../components/Card';
import BottomSheet from '../../../components/BottomSheet';
import { supabase } from '../../../lib/supabase';
import { useSessionStore } from '../../../store/useSessionStore';
import { formatDate } from '../../../lib/dates';
import { Entry, EntrySymptom } from '../../../types/db';

type RootStackParamList = {
  Calendar: undefined;
  EditEntry: { entryId: string };
  Timeline: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'Calendar'>;

interface DayEntry {
  date: Date;
  entry?: Entry;
  flareRating?: number;
}

const CalendarScreen: React.FC<Props> = ({ navigation }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [entries, setEntries] = useState<Map<string, Entry>>(new Map());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [loading, setLoading] = useState(false);

  const session = useSessionStore((state) => state.session);

  const fetchMonthEntries = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      setLoading(true);
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

      const startStr = format(monthStart, 'yyyy-MM-dd');
      const endStr = format(monthEnd, 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('entries')
        .select('*')
        .eq('user_id', session.user.id)
        .gte('entry_date', startStr)
        .lte('entry_date', endStr)
        .order('entry_date', { ascending: false });

      if (error) {
        console.error('Error fetching entries:', error);
        return;
      }

      const entriesMap = new Map<string, Entry>();
      (data || []).forEach((entry: Entry) => {
        entriesMap.set(entry.entry_date, entry);
      });

      setEntries(entriesMap);
    } catch (error) {
      console.error('Error fetching month entries:', error);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id, currentMonth]);

  useEffect(() => {
    fetchMonthEntries();
  }, [fetchMonthEntries]);

  useFocusEffect(
    useCallback(() => {
      fetchMonthEntries();
    }, [fetchMonthEntries])
  );

  const getDaysInCalendar = (): DayEntry[] => {
    const monthStart = startOfMonth(currentMonth);
    const daysInMonth = getDaysInMonth(monthStart);
    const firstDayOfWeek = monthStart.getDay();

    const days: DayEntry[] = [];

    // Add empty days from previous month
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push({
        date: new Date(),
      });
    }

    // Add days of current month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(monthStart.getFullYear(), monthStart.getMonth(), day);
      const dateStr = format(date, 'yyyy-MM-dd');
      const entry = entries.get(dateStr);

      days.push({
        date,
        entry,
        flareRating: entry?.flare_rating,
      });
    }

    return days;
  );

  const handleDayPress = useCallback(
    (dayEntry: DayEntry) => {
      if (dayEntry.entry) {
        setSelectedEntry(dayEntry.entry);
      } else {
        setSelectedEntry(null);
      }
      setSelectedDate(dayEntry.date);
      setShowBottomSheet(true);
    },
    []
  );

  const days = getDaysInCalendar();
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Month Navigation */}
        <View style={styles.monthHeader}>
          <TouchableOpacity onPress={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <Text style={styles.arrowButton}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.monthTitle}>
            {format(currentMonth, 'MMMM yyyy')}
          </Text>
          <TouchableOpacity onPress={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <Text style={styles.arrowButton}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Day Headers */}
        <View style={styles.dayHeadersContainer}>
          {weekDays.map((day) => (
            <View key={day} style={styles.dayHeaderCell}>
              <Text style={styles.dayHeaderText}>{day}</Text>
            </View>
          ))}
        </View>

        {/* Calendar Grid */}
        <View style={styles.calendarGrid}>
          {days.map((dayEntry, idx) => {
            const isCurrentMonth =
              dayEntry.date.getMonth() === currentMonth.getMonth();
            const hasEntry = !!dayEntry.entry;
            const day = dayEntry.date.getDate();

            return (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.dayCell,
                  isCurrentMonth ? styles.dayCellActive : styles.dayCellInactive,
                ]}
                onPress={() => handleDayPress(dayEntry)}
                disabled={!isCurrentMonth}
              >
                {isCurrentMonth && (
                  <>
                    <Text
                      style={[
                        styles.dayNumber,
                        hasEntry && styles.dayNumberWithEntry,
                      ]}
                    >
                      {day}
                    </Text>
                    {hasEntry && (
                      <>
                        <View
                          style={[
                            styles.entryDot,
                            {
                              backgroundColor:
                                dayEntry.flareRating! <= 3
                                  ? colors.success
                                  : dayEntry.flareRating! <= 6
                                  ? colors.warning
                                  : colors.error,
                            },
                          ]}
                        />
                        <Text style={styles.flareText}>{dayEntry.flareRating}</Text>
                      </>
                    )}
                  </>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Bottom Sheet */}
      <BottomSheet
        visible={showBottomSheet}
        onClose={() => {
          setShowBottomSheet(false);
          setSelectedEntry(null);
          setSelectedDate(null);
        }}
        title={selectedDate ? formatDate(selectedDate) : 'Select Date'}
      >
        {selectedEntry ? (
          <>
            <Card style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Flare Rating</Text>
                <View style={styles.flareRatingBadge}>
                  <Text style={styles.flareRatingText}>{selectedEntry.flare_rating}/10</Text>
                </View>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Mood</Text>
                <Text style={styles.summaryValue}>{selectedEntry.mood}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Sleep</Text>
                <Text style={styles.summaryValue}>{selectedEntry.sleep_hours}h</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Stress</Text>
                <Text style={styles.summaryValue}>{selectedEntry.stress}/5</Text>
              </View>
            </Card>

            {selectedEntry.notes && (
              <Card style={styles.notesCard}>
                <Text style={styles.notesTitle}>Notes</Text>
                <Text style={styles.notesText}>{selectedEntry.notes}</Text>
              </Card>
            )}

            <View style={styles.buttonRow}>
              <Button
                title="Edit"
                onPress={() => {
                  setShowBottomSheet(false);
                  navigation.navigate('EditEntry', { entryId: selectedEntry.id });
                }}
                style={styles.halfButton}
              />
              <Button
                title="Timeline"
                variant="secondary"
                onPress={() => {
                  setShowBottomSheet(false);
                  navigation.navigate('Timeline');
                }}
                style={styles.halfButton}
              />
            </View>
          </>
        ) : (
          <>
            <Text style={styles.noEntryText}>No entry for this date</Text>
            <Button
              title="Log this day"
              onPress={() => {
                setShowBottomSheet(false);
                if (selectedDate) {
                  const dateStr = format(selectedDate, 'yyyy-MM-dd');
                  navigation.navigate('EditEntry' as any, { date: dateStr });
                }
              }}
            />
          </>
        )}
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
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  arrowButton: {
    fontSize: 28,
    color: colors.primary,
    fontWeight: '500',
    paddingHorizontal: spacing.lg,
  },
  monthTitle: {
    ...typography.sectionHeader,
    fontSize: 18,
  },
  dayHeadersContainer: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  dayHeaderCell: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  dayHeaderText: {
    ...typography.secondary,
    fontWeight: '600',
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.lightGray,
    padding: spacing.xs,
  },
  dayCellActive: {
    backgroundColor: colors.offWhite,
  },
  dayCellInactive: {
    backgroundColor: colors.white,
    opacity: 0.3,
  },
  dayNumber: {
    ...typography.body,
    fontWeight: '500',
    textAlign: 'center',
  },
  dayNumberWithEntry: {
    color: colors.primary,
    fontWeight: '600',
  },
  entryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: spacing.xs,
  },
  flareText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.darkGray,
    marginTop: spacing.xs,
  },
  summaryCard: {
    marginBottom: spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  summaryLabel: {
    ...typography.body,
    fontWeight: '500',
  },
  flareRatingBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  flareRatingText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  summaryValue: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  notesCard: {
    marginBottom: spacing.lg,
  },
  notesTitle: {
    ...typography.sectionHeader,
    marginBottom: spacing.md,
  },
  notesText: {
    ...typography.body,
    color: colors.darkGray,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfButton: {
    flex: 1,
  },
  noEntryText: {
    ...typography.secondary,
    textAlign: 'center',
    marginVertical: spacing.lg,
    marginHorizontal: spacing.lg,
  },
});

export default CalendarScreen;
