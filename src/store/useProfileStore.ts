import { create } from 'zustand';
import { UserCondition, UserSymptom, UserMed, Profile } from '../types/db';

interface ProfileDataState {
  profile: Profile | null;
  conditions: UserCondition[];
  symptoms: UserSymptom[];
  meds: UserMed[];
  setProfile: (profile: Profile | null) => void;
  setConditions: (conditions: UserCondition[]) => void;
  addCondition: (condition: UserCondition) => void;
  removeCondition: (id: string) => void;
  setSymptoms: (symptoms: UserSymptom[]) => void;
  addSymptom: (symptom: UserSymptom) => void;
  updateSymptom: (id: string, updates: Partial<UserSymptom>) => void;
  removeSymptom: (id: string) => void;
  setMeds: (meds: UserMed[]) => void;
  addMed: (med: UserMed) => void;
  updateMed: (id: string, updates: Partial<UserMed>) => void;
  removeMed: (id: string) => void;
}

export const useProfileStore = create<ProfileDataState>((set) => ({
  profile: null,
  conditions: [],
  symptoms: [],
  meds: [],
  setProfile: (profile) => set({ profile }),
  setConditions: (conditions) => set({ conditions }),
  addCondition: (condition) =>
    set((s) => ({ conditions: [...s.conditions, condition] })),
  removeCondition: (id) =>
    set((s) => ({ conditions: s.conditions.filter((c) => c.id !== id) })),
  setSymptoms: (symptoms) => set({ symptoms }),
  addSymptom: (symptom) =>
    set((s) => ({ symptoms: [...s.symptoms, symptom] })),
  updateSymptom: (id, updates) =>
    set((s) => ({
      symptoms: s.symptoms.map((sym) =>
        sym.id === id ? { ...sym, ...updates } : sym
      ),
    })),
  removeSymptom: (id) =>
    set((s) => ({ symptoms: s.symptoms.filter((sym) => sym.id !== id) })),
  setMeds: (meds) => set({ meds }),
  addMed: (med) => set((s) => ({ meds: [...s.meds, med] })),
  updateMed: (id, updates) =>
    set((s) => ({
      meds: s.meds.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    })),
  removeMed: (id) =>
    set((s) => ({ meds: s.meds.filter((m) => m.id !== id) })),
}));
