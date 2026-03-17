import { Entry, EntrySymptom, EntryTrigger, EntryMed, UserSymptom } from '../types/db';
import { InsightOutput } from '../types/models';

export function generateWeeklyInsights(
  entries: Entry[],
  entrySymptoms: EntrySymptom[],
  entryTriggers: EntryTrigger[],
  entryMeds: EntryMed[],
  symptoms: UserSymptom[],
  priorWeekEntries?: Entry[],
  priorWeekSymptoms?: EntrySymptom[],
): InsightOutput {
  // Return early if insufficient data
  if (entries.length < 2) {
    return {
      summaryParagraph:
        'You need at least 2 entries this week to generate meaningful insights. Keep tracking your symptoms and we\'ll provide detailed insights soon!',
      whatChanged: [],
      possiblePatterns: [],
      tryNextWeek: [],
      doctorQuestions: [],
    };
  }

  // Calculate current week averages
  const currentWeekStats = calculateWeeklyStats(entries, entrySymptoms);

  // Calculate prior week averages if available
  let priorWeekStats = null;
  if (priorWeekEntries && priorWeekEntries.length > 0 && priorWeekSymptoms) {
    priorWeekStats = calculateWeeklyStats(priorWeekEntries, priorWeekSymptoms);
  }

  // Identify top 3 symptoms by average severity
  const topSymptoms = getTopSymptomsBySeverity(entrySymptoms, 3);

  // Identify top 2 symptoms with biggest severity increase
  const symptomChanges = priorWeekStats
    ? getSymptomChanges(entrySymptoms, priorWeekSymptoms, topSymptoms)
    : [];

  // Analyze triggers
  const triggerAnalysis = analyzeTriggers(entries, entryTriggers, entrySymptoms);

  // Generate sections
  const whatChanged = generateWhatChanged(currentWeekStats, priorWeekStats, entries);
  const possiblePatterns = generatePatterns(currentWeekStats, triggerAnalysis);
  const tryNextWeek = generateSuggestions();
  const doctorQuestions = generateDoctorQuestions(currentWeekStats, triggerAnalysis, topSymptoms);
  const summaryParagraph = generateSummary(
    currentWeekStats,
    topSymptoms,
    possiblePatterns,
    entries.length
  );

  return {
    summaryParagraph,
    whatChanged,
    possiblePatterns,
    tryNextWeek,
    doctorQuestions,
  };
}

interface WeeklyStats {
  avgFlareRating: number;
  avgSleepHours: number;
  avgSleepQuality: number;
  avgStress: number;
}

interface TriggerAnalysis {
  triggerName: string;
  daysWithTrigger: number;
  avgFlareWithTrigger: number;
  avgFlareWithoutTrigger: number;
  difference: number;
}

function calculateWeeklyStats(entries: Entry[], entrySymptoms: EntrySymptom[]): WeeklyStats {
  const avgFlareRating =
    entries.reduce((sum, e) => sum + e.flare_rating, 0) / entries.length;
  const avgSleepHours =
    entries.reduce((sum, e) => sum + e.sleep_hours, 0) / entries.length;
  const avgSleepQuality =
    entries.reduce((sum, e) => sum + e.sleep_quality, 0) / entries.length;
  const avgStress = entries.reduce((sum, e) => sum + e.stress, 0) / entries.length;

  return {
    avgFlareRating: Math.round(avgFlareRating * 10) / 10,
    avgSleepHours: Math.round(avgSleepHours * 10) / 10,
    avgSleepQuality: Math.round(avgSleepQuality * 10) / 10,
    avgStress: Math.round(avgStress * 10) / 10,
  };
}

interface SymptomData {
  symptomId: string;
  avgSeverity: number;
  name?: string;
}

function getTopSymptomsBySeverity(entrySymptoms: EntrySymptom[], count: number): SymptomData[] {
  const symptomMap = new Map<string, { severities: number[]; name?: string }>();

  entrySymptoms.forEach((es) => {
    if (es.is_present && es.severity !== null) {
      const existing = symptomMap.get(es.symptom_id) || { severities: [], name: undefined };
      existing.severities.push(es.severity);
      symptomMap.set(es.symptom_id, existing);
    }
  });

  const topSymptoms: SymptomData[] = [];
  symptomMap.forEach((data, symptomId) => {
    const avgSeverity = data.severities.reduce((a, b) => a + b, 0) / data.severities.length;
    topSymptoms.push({
      symptomId,
      avgSeverity: Math.round(avgSeverity * 10) / 10,
      name: data.name,
    });
  });

  return topSymptoms.sort((a, b) => b.avgSeverity - a.avgSeverity).slice(0, count);
}

function getSymptomChanges(
  current: EntrySymptom[],
  prior: EntrySymptom[],
  topSymptoms: SymptomData[]
): { symptomId: string; change: number }[] {
  const changes: { symptomId: string; change: number }[] = [];

  topSymptoms.forEach((symptom) => {
    const currentSeverities = current
      .filter((es) => es.symptom_id === symptom.symptomId && es.is_present && es.severity !== null)
      .map((es) => es.severity as number);

    const priorSeverities = prior
      .filter((es) => es.symptom_id === symptom.symptomId && es.is_present && es.severity !== null)
      .map((es) => es.severity as number);

    if (currentSeverities.length > 0 && priorSeverities.length > 0) {
      const currentAvg = currentSeverities.reduce((a, b) => a + b) / currentSeverities.length;
      const priorAvg = priorSeverities.reduce((a, b) => a + b) / priorSeverities.length;
      const change = currentAvg - priorAvg;

      changes.push({ symptomId: symptom.symptomId, change });
    }
  });

  return changes.sort((a, b) => b.change - a.change).slice(0, 2);
}

function analyzeTriggers(
  entries: Entry[],
  entryTriggers: EntryTrigger[],
  entrySymptoms: EntrySymptom[]
): TriggerAnalysis[] {
  const triggerMap = new Map<string, Entry[]>();

  // Group entries by trigger
  entryTriggers.forEach((et) => {
    const entry = entries.find((e) => e.id === et.entry_id);
    if (entry) {
      const existing = triggerMap.get(et.trigger_name) || [];
      existing.push(entry);
      triggerMap.set(et.trigger_name, existing);
    }
  });

  // Get all entry IDs that don't have triggers
  const triggeredEntryIds = new Set(entryTriggers.map((et) => et.entry_id));
  const noTriggerEntries = entries.filter((e) => !triggeredEntryIds.has(e.id));

  const analysis: TriggerAnalysis[] = [];

  triggerMap.forEach((triggerEntries, triggerName) => {
    const avgFlareWithTrigger =
      triggerEntries.reduce((sum, e) => sum + e.flare_rating, 0) / triggerEntries.length;
    const avgFlareWithoutTrigger =
      noTriggerEntries.length > 0
        ? noTriggerEntries.reduce((sum, e) => sum + e.flare_rating, 0) / noTriggerEntries.length
        : 0;

    analysis.push({
      triggerName,
      daysWithTrigger: triggerEntries.length,
      avgFlareWithTrigger: Math.round(avgFlareWithTrigger * 10) / 10,
      avgFlareWithoutTrigger: Math.round(avgFlareWithoutTrigger * 10) / 10,
      difference: Math.round((avgFlareWithTrigger - avgFlareWithoutTrigger) * 10) / 10,
    });
  });

  return analysis.sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference)).slice(0, 3);
}

function generateWhatChanged(
  current: WeeklyStats,
  prior: WeeklyStats | null,
  entries: Entry[]
): string[] {
  const observations: string[] = [];

  // Add observations about this week's metrics
  observations.push(`Your average flare rating this week was ${current.avgFlareRating}/10.`);
  observations.push(
    `On average, you slept ${current.avgSleepHours} hours per night and rated your sleep quality ${current.avgSleepQuality}/10.`
  );
  observations.push(
    `Your stress levels averaged ${current.avgStress}/10 this week, based on ${entries.length} check-ins.`
  );

  // Add comparison to prior week if available
  if (prior) {
    const flareChange = current.avgFlareRating - prior.avgFlareRating;
    const sleepChange = current.avgSleepHours - prior.avgSleepHours;

    const flareDirection = flareChange > 0 ? 'increased' : flareChange < 0 ? 'decreased' : 'stayed';
    const sleepDirection = sleepChange > 0 ? 'increased' : sleepChange < 0 ? 'decreased' : 'stayed';

    observations[0] = `Your average flare rating was ${current.avgFlareRating}/10 this week, ${flareDirection} from ${prior.avgFlareRating}/10 last week.`;
    observations[2] = `Your average sleep ${sleepDirection} from ${prior.avgSleepHours} hours per night last week to ${current.avgSleepHours} hours this week.`;
  }

  return observations.slice(0, 3);
}

function generatePatterns(current: WeeklyStats, triggerAnalysis: TriggerAnalysis[]): string[] {
  const patterns: string[] = [];

  // Sleep and flare pattern
  if (current.avgSleepHours < 7 && current.avgFlareRating > 5) {
    patterns.push(
      'Hypothesis: Your flare ratings tended to be higher on days when you slept less. Sleep quality might affect your symptoms.'
    );
  }

  // Stress and flare pattern
  if (current.avgStress > 6 && current.avgFlareRating > 5) {
    patterns.push(
      'Hypothesis: Higher stress levels coincided with higher flare ratings this week. Stress management might help reduce symptoms.'
    );
  }

  // Trigger patterns
  triggerAnalysis.forEach((trigger) => {
    if (trigger.difference > 1) {
      patterns.push(
        `Hypothesis: Days with "${trigger.triggerName}" coincided with average flare ratings of ${trigger.avgFlareWithTrigger}/10, compared to ${trigger.avgFlareWithoutTrigger}/10 without this trigger.`
      );
    }
  });

  return patterns.slice(0, 4);
}

function generateSuggestions(): string[] {
  return [
    'Consider establishing a consistent sleep schedule to support your overall health.',
    'Try staying hydrated throughout the day—adequate hydration may help with symptom management.',
    'Practice gentle pacing of activities to avoid overexertion on high-symptom days.',
    'Journal about how you feel each day to identify personal patterns over time.',
    'Explore stress-management techniques like breathing exercises or guided meditation.',
    'Discuss any significant symptom changes with your healthcare provider.',
  ];
}

function generateDoctorQuestions(
  current: WeeklyStats,
  triggerAnalysis: TriggerAnalysis[],
  topSymptoms: SymptomData[]
): string[] {
  const questions: string[] = [];

  questions.push(
    `My average flare rating has been ${current.avgFlareRating}/10 this week. Is this level concerning?`
  );
  questions.push(
    `I'm currently sleeping about ${current.avgSleepHours} hours per night. Is this enough for managing my condition?`
  );

  if (topSymptoms.length > 0) {
    questions.push(
      `My symptoms have been averaging about ${topSymptoms[0].avgSeverity}/10 in severity. What strategies might help reduce this?`
    );
  }

  if (triggerAnalysis.length > 0) {
    const trigger = triggerAnalysis[0];
    questions.push(
      `I notice my symptoms worsen after "${trigger.triggerName}." Could this be related to my condition?`
    );
  }

  questions.push('Are there any lifestyle changes that might help reduce my symptom severity?');
  questions.push('Should I track any additional factors that might affect my symptoms?');

  if (current.avgStress > 6) {
    questions.push(
      'I've been experiencing higher stress levels. Could stress management help my symptoms?'
    );
  }

  return questions.slice(0, 8);
}

function generateSummary(
  current: WeeklyStats,
  topSymptoms: SymptomData[],
  patterns: string[],
  entryCount: number
): string {
  let summary = `This week, you had ${entryCount} check-ins with an average flare rating of ${current.avgFlareRating}/10. `;
  summary += `Your sleep averaged ${current.avgSleepHours} hours per night with a quality rating of ${current.avgSleepQuality}/10, `;
  summary += `and you reported stress levels around ${current.avgStress}/10. `;

  if (topSymptoms.length > 0) {
    summary += `Your most prominent symptom had an average severity of ${topSymptoms[0].avgSeverity}/10. `;
  }

  if (patterns.length > 0) {
    summary += `We noticed some patterns this week: ${patterns[0].toLowerCase()} `;
  }

  summary +=
    'Remember, tracking your symptoms helps us identify what works best for you. Consider discussing these observations with your healthcare provider.';

  return summary;
}
