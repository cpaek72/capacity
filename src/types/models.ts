import { MoodType, ScheduleType } from './db';

export interface EntryFormData {
  entry_date: string;
  flare_rating: number;
  symptoms: {
    symptom_id: string;
    symptom_name: string;
    severity: number;
    is_present: boolean;
  }[];
  triggers: string[];
  meds: {
    med_id: string;
    med_name: string;
    taken: boolean;
    reason_not_taken: string | null;
  }[];
  sleep_hours: number;
  sleep_quality: number;
  stress: number;
  mood: MoodType;
  notes: string;
}

export interface InsightOutput {
  summaryParagraph: string;
  whatChanged: string[];
  possiblePatterns: string[];
  tryNextWeek: string[];
  doctorQuestions: string[];
}

export interface ExportOptions {
  entryId?: string;
  weekStart?: string;
  dateRange?: { start: string; end: string };
  includeNotes: boolean;
  includeMeds: boolean;
  includeTriggers: boolean;
  anonymize: boolean;
}

export interface MedFormData {
  med_name: string;
  dose: string;
  schedule_type: ScheduleType;
  times: string[];
  notes: string;
}

export interface SymptomFormData {
  symptom_name: string;
  category: string;
}

export interface ConditionFormData {
  condition_name: string;
}

export interface CorrelationResult {
  xLabel: string;
  yLabel: string;
  correlationScore: number;
  explanation: string;
  dataPoints: { x: number; y: number }[];
}

export const DEFAULT_TRIGGERS = [
  'stress', 'poor sleep', 'gluten', 'dairy', 'heat', 'cold',
  'exercise', 'infection', 'hormones', 'travel',
  'social overwhelm', 'medication change', 'unknown',
] as const;

export const MOOD_OPTIONS: { label: string; value: MoodType }[] = [
  { label: 'Calm', value: 'calm' },
  { label: 'OK', value: 'ok' },
  { label: 'Anxious', value: 'anxious' },
  { label: 'Sad', value: 'sad' },
  { label: 'Irritable', value: 'irritable' },
];

export const AGE_RANGES = [
  'Under 18', '18-24', '25-34', '35-44', '45-54', '55-64', '65+',
];

export const SYMPTOM_CATEGORIES = [
  'Pain', 'Fatigue', 'Digestive', 'Neurological', 'Skin',
  'Respiratory', 'Cardiovascular', 'Mental Health', 'Other',
];
