-- ============================================================
-- Capacity App — Full Database Migration
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  age_range TEXT,
  timezone TEXT,
  onboarding_complete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can delete own profile"
  ON profiles FOR DELETE
  USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 2. USER_CONDITIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS user_conditions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  condition_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_conditions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conditions"
  ON user_conditions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conditions"
  ON user_conditions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conditions"
  ON user_conditions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conditions"
  ON user_conditions FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- 3. USER_SYMPTOMS
-- ============================================================
CREATE TABLE IF NOT EXISTS user_symptoms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  symptom_name TEXT NOT NULL,
  category TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_symptoms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own symptoms"
  ON user_symptoms FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own symptoms"
  ON user_symptoms FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own symptoms"
  ON user_symptoms FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own symptoms"
  ON user_symptoms FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- 4. USER_MEDS
-- ============================================================
CREATE TABLE IF NOT EXISTS user_meds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  med_name TEXT NOT NULL,
  dose TEXT,
  schedule_type TEXT DEFAULT 'daily',
  times JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_meds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own meds"
  ON user_meds FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own meds"
  ON user_meds FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own meds"
  ON user_meds FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own meds"
  ON user_meds FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- 5. ENTRIES
-- ============================================================
CREATE TABLE IF NOT EXISTS entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  flare_rating INTEGER,
  sleep_hours NUMERIC,
  sleep_quality INTEGER,
  stress INTEGER,
  mood TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, entry_date)
);

ALTER TABLE entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own entries"
  ON entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own entries"
  ON entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own entries"
  ON entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own entries"
  ON entries FOR DELETE
  USING (auth.uid() = user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_entries_updated_at ON entries;
CREATE TRIGGER set_entries_updated_at
  BEFORE UPDATE ON entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 6. ENTRY_SYMPTOMS
-- ============================================================
CREATE TABLE IF NOT EXISTS entry_symptoms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_id UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  symptom_id UUID NOT NULL REFERENCES user_symptoms(id),
  severity INTEGER,
  is_present BOOLEAN DEFAULT TRUE
);

ALTER TABLE entry_symptoms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own entry symptoms"
  ON entry_symptoms FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM entries
      WHERE entries.id = entry_symptoms.entry_id
      AND entries.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own entry symptoms"
  ON entry_symptoms FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM entries
      WHERE entries.id = entry_symptoms.entry_id
      AND entries.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own entry symptoms"
  ON entry_symptoms FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM entries
      WHERE entries.id = entry_symptoms.entry_id
      AND entries.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own entry symptoms"
  ON entry_symptoms FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM entries
      WHERE entries.id = entry_symptoms.entry_id
      AND entries.user_id = auth.uid()
    )
  );

-- ============================================================
-- 7. ENTRY_TRIGGERS
-- ============================================================
CREATE TABLE IF NOT EXISTS entry_triggers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_id UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  trigger_name TEXT NOT NULL
);

ALTER TABLE entry_triggers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own entry triggers"
  ON entry_triggers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM entries
      WHERE entries.id = entry_triggers.entry_id
      AND entries.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own entry triggers"
  ON entry_triggers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM entries
      WHERE entries.id = entry_triggers.entry_id
      AND entries.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own entry triggers"
  ON entry_triggers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM entries
      WHERE entries.id = entry_triggers.entry_id
      AND entries.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own entry triggers"
  ON entry_triggers FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM entries
      WHERE entries.id = entry_triggers.entry_id
      AND entries.user_id = auth.uid()
    )
  );

-- ============================================================
-- 8. ENTRY_MEDS
-- ============================================================
CREATE TABLE IF NOT EXISTS entry_meds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_id UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  med_id UUID NOT NULL REFERENCES user_meds(id),
  taken BOOLEAN DEFAULT FALSE,
  reason_not_taken TEXT
);

ALTER TABLE entry_meds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own entry meds"
  ON entry_meds FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM entries
      WHERE entries.id = entry_meds.entry_id
      AND entries.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own entry meds"
  ON entry_meds FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM entries
      WHERE entries.id = entry_meds.entry_id
      AND entries.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own entry meds"
  ON entry_meds FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM entries
      WHERE entries.id = entry_meds.entry_id
      AND entries.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own entry meds"
  ON entry_meds FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM entries
      WHERE entries.id = entry_meds.entry_id
      AND entries.user_id = auth.uid()
    )
  );

-- ============================================================
-- 9. SAVED_INSIGHTS
-- ============================================================
CREATE TABLE IF NOT EXISTS saved_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  insight_type TEXT DEFAULT 'pattern',
  payload_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE saved_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved insights"
  ON saved_insights FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved insights"
  ON saved_insights FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved insights"
  ON saved_insights FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved insights"
  ON saved_insights FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_entries_user_date ON entries(user_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_entry_symptoms_entry ON entry_symptoms(entry_id);
CREATE INDEX IF NOT EXISTS idx_entry_triggers_entry ON entry_triggers(entry_id);
CREATE INDEX IF NOT EXISTS idx_entry_meds_entry ON entry_meds(entry_id);
CREATE INDEX IF NOT EXISTS idx_user_conditions_user ON user_conditions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_symptoms_user ON user_symptoms(user_id);
CREATE INDEX IF NOT EXISTS idx_user_meds_user ON user_meds(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_insights_user ON saved_insights(user_id);
