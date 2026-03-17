import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import { Profile } from '../types/db';

interface SessionState {
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  clearSession: () => void;
  isOnboardingComplete: () => boolean;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  session: null,
  profile: null,
  isLoading: true,
  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setLoading: (isLoading) => set({ isLoading }),
  clearSession: () => set({ session: null, profile: null }),
  isOnboardingComplete: () => get().profile?.onboarding_complete ?? false,
}));
