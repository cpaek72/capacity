export interface Profile {
  id: string;
  name: string;
  age_range: string;
  timezone: string;
  onboarding_complete: boolean;
  created_at: string;
}

export interface UserCondition {
  id: string;
  user_id: string;
  condition_name: string;
  created_at: string;
}

export interface UserSymptom {
  id: string;
  user_id: string;
  symptom_name: string;
  category: string;
  is_active: boolean;
  created_at: string;
}

export interface UserMed {
  id: string;
  user_id: string;
  med_name: string;
  dose: string;
  schedule_type: 'daily' | 'as_needed' | 'weekly' | 'other';
  times: string[];
  notes: string;
  is_active: boolean;
  created_at: string;
}

export interface Entry {
  id: string;
  user_id: string;
  entry_date: string;
  flare_rating: number;
  sleep_hours: number;
  sleep_quality: number;
  stress: number;
  mood: MoodType;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface EntrySymptom {
  id: string;
  entry_id: string;
  symptom_id: string;
  severity: number | null;
  is_present: boolean;
}

export interface EntryTrigger {
  id: string;
  entry_id: string;
  trigger_name: string;
}

export interface EntryMed {
  id: string;
  entry_id: string;
  med_id: string;
  taken: boolean;
  reason_not_taken: string | null;
}

export interface SavedInsight {
  id: string;
  user_id: string;
  title: string;
  insight_type: 'correlation' | 'pattern';
  payload_json: any;
  created_at: string;
}

export type MoodType = 'calm' | 'ok' | 'anxious' | 'sad' | 'irritable';
export type ScheduleType = 'daily' | 'as_needed' | 'weekly' | 'other';
