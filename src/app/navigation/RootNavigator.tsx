import React, { useEffect } from 'react';
import {
  createNativeStackNavigator,
  NativeStackNavigationOptions,
} from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { useSessionStore } from '../../store/useSessionStore';
import { useProfileStore } from '../../store/useProfileStore';
import { supabase } from '../../lib/supabase';
import PublicStack from './PublicStack';
import OnboardingStack from './OnboardingStack';
import AppTabs from './AppTabs';

const Stack = createNativeStackNavigator();

const COLORS = {
  primary: '#C1121F',
  white: '#FFFFFF',
  darkGray: '#1C1C1C',
};

const screenOptions: NativeStackNavigationOptions = {
  headerShown: false,
};

export default function RootNavigator() {
  const { session, isLoading, setSession, setProfile: setSessionProfile, setLoading, isOnboardingComplete } =
    useSessionStore();
  const { setProfile: setProfileData } = useProfileStore();

  const updateProfile = (profile: any) => {
    setSessionProfile(profile);
    setProfileData(profile);
  };

  useEffect(() => {
    // Fetch initial session
    const fetchSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (data.session) {
          setSession(data.session);
          await fetchProfile(data.session.user.id);
        }
      } catch (error) {
        console.error('Error fetching session:', error);
      } finally {
        setLoading(false);
      }
    };

    // Subscribe to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        setSession(session);
        await fetchProfile(session.user.id);
      } else {
        setSession(null);
        updateProfile(null);
      }
      setLoading(false);
    });

    fetchSession();

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      if (data) {
        updateProfile(data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      {!session ? (
        <Stack.Screen
          name="PublicStack"
          component={PublicStack}
          options={{ animationEnabled: false }}
        />
      ) : !isOnboardingComplete() ? (
        <Stack.Screen
          name="OnboardingStack"
          component={OnboardingStack}
          options={{ animationEnabled: false }}
        />
      ) : (
        <Stack.Screen
          name="AppTabs"
          component={AppTabs}
          options={{ animationEnabled: false }}
        />
      )}
    </Stack.Navigator>
  );
}
