import { Entry, EntrySymptom, EntryTrigger, EntryMed, UserSymptom, UserMed, Profile } from '../types/db';
import type { ExportOptions, InsightOutput } from '../types/models';
import { formatDate } from './dates';

export interface ExportData {
  profile: Profile;
  entries: Entry[];
  entrySymptoms: EntrySymptom[];
  entryTriggers: EntryTrigger[];
  entryMeds: EntryMed[];
  symptoms: UserSymptom[];
  meds: UserMed[];
}

export function buildExportReport(data: ExportData, options: ExportOptions): string {
  const lines: string[] = [];
  const nameDisplay = options.anonymize ? 'Patient' : data.profile.name;

  // Title and header
  lines.push('═════════════════════════════════════════════════════════════');
  lines.push('                  CAPACITY HEALTH REPORT');
  lines.push('═════════════════════════════════════════════════════════════');
  lines.push('');

  // Date range header
  if (options.dateRange) {
    lines.push(`Report Period: ${formatDate(options.dateRange.start, 'MMM d, yyyy')} - ${formatDate(options.dateRange.end, 'MMM d, yyyy')}`);
  } else if (options.weekStart) {
    lines.push(`Week of: ${formatDate(options.weekStart, 'MMM d, yyyy')}`);
  } else if (options.entryId) {
    const entry = data.entries[0];
    if (entry) {
      lines.push(`Entry Date: ${formatDate(entry.entry_date, 'MMM d, yyyy')}`);
    }
  }

  if (!options.anonymize) {
    lines.push(`Patient: ${nameDisplay}`);
  }
  lines.push(`Generated: ${formatDate(new Date(), 'MMM d, yyyy h:mm a')}`);
  lines.push('');
  lines.push('─────────────────────────────────────────────────────────────');
  lines.push('');

  // Sort entries by date
  const sortedEntries = [...data.entries].sort(
    (a, b) => new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime()
  );

  // Process each entry
  for (const entry of sortedEntries) {
    lines.push(`📅 ${formatDate(entry.entry_date, 'EEEE, MMM d, yyyy')}`);
    lines.push(`   Flare Rating: ${entry.flare_rating}/10`);
    lines.push('');

    // Medications if requested
    if (options.includeMeds) {
      const entryMeds = data.entryMeds.filter((em) => em.entry_id === entry.id);
      if (entryMeds.length > 0) {
        lines.push('   💊 Medications:');
        for (const entryMed of entryMeds) {
          const med = data.meds.find((m) => m.id === entryMed.med_id);
          if (med) {
            const status = entryMed.taken ? 'Taken' : 'Not taken';
            lines.push(`      • ${med.med_name} (${med.dose}) - ${status}`);
            if (!entryMed.taken && entryMed.reason_not_taken) {
              lines.push(`        Reason: ${entryMed.reason_not_taken}`);
            }
          }
        }
        lines.push('');
      }
    }

    // Triggers if requested
    if (options.includeTriggers) {
      const entryTriggers = data.entryTriggers.filter((et) => et.entry_id === entry.id);
      if (entryTriggers.length > 0) {
        lines.push('   ⚡ Potential Triggers:');
        for (const trigger of entryTriggers) {
          lines.push(`      • ${trigger.trigger_name}`);
        }
        lines.push('');
      }
    }

    // Symptoms
    const entrySymptoms = data.entrySymptoms.filter((es) => es.entry_id === entry.id && es.is_present);
    if (entrySymptoms.length > 0) {
      lines.push('   🔴 Symptoms:');
      for (const entrySymptom of entrySymptoms) {
        const symptom = data.symptoms.find((s) => s.id === entrySymptom.symptom_id);
        if (symptom) {
          const severityStr = entrySymptom.severity ? ` (Severity: ${entrySymptom.severity}/10)` : '';
          lines.push(`      • ${symptom.symptom_name}${severityStr}`);
        }
      }
      lines.push('');
    }

    // Sleep
    if (entry.sleep_hours > 0) {
      const qualityLabels: { [key: number]: string } = {
        1: 'Poor',
        2: 'Fair',
        3: 'Good',
        4: 'Excellent',
      };
      lines.push(`   😴 Sleep: ${entry.sleep_hours} hours (Quality: ${qualityLabels[entry.sleep_quality] || 'Not rated'})`);
    }

    // Stress and Mood
    const stressLabels: { [key: number]: string } = {
      1: 'Very Low',
      2: 'Low',
      3: 'Moderate',
      4: 'High',
      5: 'Very High',
    };
    const moodLabels: { [key: string]: string } = {
      calm: '😌 Calm',
      ok: '🙂 OK',
      anxious: '😰 Anxious',
      sad: '😢 Sad',
      irritable: '😠 Irritable',
    };

    lines.push(`   😓 Stress Level: ${stressLabels[entry.stress] || 'Not rated'}`);
    lines.push(`   😊 Mood: ${moodLabels[entry.mood] || 'Not rated'}`);
    lines.push('');

    // Notes if requested
    if (options.includeNotes && entry.notes) {
      lines.push('   📝 Notes:');
      const noteLines = entry.notes.split('\n');
      for (const noteLine of noteLines) {
        lines.push(`      ${noteLine}`);
      }
      lines.push('');
    }

    lines.push('─────────────────────────────────────────────────────────────');
    lines.push('');
  }

  // Summary section
  if (sortedEntries.length > 0) {
    lines.push('SUMMARY STATISTICS');
    lines.push('═════════════════════════════════════════════════════════════');
    lines.push('');

    const flareRatings = sortedEntries.map((e) => e.flare_rating);
    const avgFlare = Math.round((flareRatings.reduce((a, b) => a + b, 0) / flareRatings.length) * 10) / 10;
    const minFlare = Math.min(...flareRatings);
    const maxFlare = Math.max(...flareRatings);

    lines.push(`Average Flare Rating: ${avgFlare}/10`);
    lines.push(`Range: ${minFlare} - ${maxFlare}`);
    lines.push('');

    // Most common triggers
    if (options.includeTriggers) {
      const triggerCounts: { [key: string]: number } = {};
      for (const trigger of data.entryTriggers) {
        triggerCounts[trigger.trigger_name] = (triggerCounts[trigger.trigger_name] || 0) + 1;
      }

      if (Object.keys(triggerCounts).length > 0) {
        const topTriggers = Object.entries(triggerCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5);

        lines.push('Most Common Triggers:');
        for (const [trigger, count] of topTriggers) {
          lines.push(`  • ${trigger} (${count} occurrences)`);
        }
        lines.push('');
      }
    }

    // Most severe symptoms
    const severities: { [key: string]: number[] } = {};
    for (const entrySymptom of data.entrySymptoms) {
      const symptom = data.symptoms.find((s) => s.id === entrySymptom.symptom_id);
      if (symptom && entrySymptom.is_present && entrySymptom.severity) {
        if (!severities[symptom.symptom_name]) {
          severities[symptom.symptom_name] = [];
        }
        severities[symptom.symptom_name].push(entrySymptom.severity);
      }
    }

    if (Object.keys(severities).length > 0) {
      const avgSeverities = Object.entries(severities)
        .map(([name, values]) => ({
          name,
          avg: Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10,
        }))
        .sort((a, b) => b.avg - a.avg)
        .slice(0, 5);

      lines.push('Most Severe Symptoms:');
      for (const { name, avg } of avgSeverities) {
        lines.push(`  • ${name} (Avg severity: ${avg}/10)`);
      }
      lines.push('');
    }

    // Sleep and stress averages
    const sleepHours = sortedEntries.filter((e) => e.sleep_hours > 0).map((e) => e.sleep_hours);
    if (sleepHours.length > 0) {
      const avgSleep = Math.round((sleepHours.reduce((a, b) => a + b, 0) / sleepHours.length) * 10) / 10;
      lines.push(`Average Sleep: ${avgSleep} hours per night`);
    }

    const stressLevels = sortedEntries.map((e) => e.stress);
    const avgStress = Math.round((stressLevels.reduce((a, b) => a + b, 0) / stressLevels.length) * 10) / 10;
    lines.push(`Average Stress Level: ${avgStress}/5`);

    lines.push('');
  }

  lines.push('═════════════════════════════════════════════════════════════');
  lines.push("Report generated by Capacity Health Tracker");

  return lines.join('\n');
}

export function buildWeeklyExport(
  data: ExportData,
  options: ExportOptions,
  insights?: InsightOutput
): string {
  const baseReport = buildExportReport(data, options);
  const lines = baseReport.split('\n');

  if (!insights) {
    return baseReport;
  }

  // Insert insights section before the summary
  const insertIndex = lines.findIndex((line) => line.includes('SUMMARY STATISTICS'));

  if (insertIndex > -1) {
    const insightLines: string[] = [];
    insightLines.push('WEEKLY INSIGHTS');
    insightLines.push('═════════════════════════════════════════════════════════════');
    insightLines.push('');

    insightLines.push('📊 Summary:');
    const summaryLines = insights.summaryParagraph.split('\n');
    for (const line of summaryLines) {
      insightLines.push(`   ${line}`);
    }
    insightLines.push('');

    if (insights.whatChanged && insights.whatChanged.length > 0) {
      insightLines.push('📈 What Changed:');
      for (const item of insights.whatChanged) {
        insightLines.push(`   • ${item}`);
      }
      insightLines.push('');
    }

    if (insights.possiblePatterns && insights.possiblePatterns.length > 0) {
      insightLines.push('🔗 Possible Patterns:');
      for (const item of insights.possiblePatterns) {
        insightLines.push(`   • ${item}`);
      }
      insightLines.push('');
    }

    if (insights.tryNextWeek && insights.tryNextWeek.length > 0) {
      insightLines.push('💡 Try Next Week:');
      for (const item of insights.tryNextWeek) {
        insightLines.push(`   • ${item}`);
      }
      insightLines.push('');
    }

    if (insights.doctorQuestions && insights.doctorQuestions.length > 0) {
      insightLines.push('🏥 Questions for Your Doctor:');
      for (const item of insights.doctorQuestions) {
        insightLines.push(`   • ${item}`);
      }
      insightLines.push('');
    }

    insightLines.push('─────────────────────────────────────────────────────────────');
    insightLines.push('');

    lines.splice(insertIndex, 0, ...insightLines);
  }

  return lines.join('\n');
}
