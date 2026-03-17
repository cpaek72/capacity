import React from 'react';
import {
  createNativeStackNavigator,
  NativeStackNavigationOptions,
} from '@react-navigation/native-stack';
import WelcomeScreen from '../screens/onboarding/WelcomeScreen';
import ProfileScreen from '../screens/onboarding/ProfileScreen';
import ConditionsScreen from '../screens/onboarding/ConditionsScreen';
import SymptomsScreen from '../screens/onboarding/SymptomsScreen';
import MedsScreen from '../screens/onboarding/MedsScreen';
import PrivacyScreen from '../screens/onboarding/PrivacyScreen';
import FinishScreen from '../screens/onboarding/FinishScreen';

const Stack = createNativeStackNavigator();

const COLORS = {
  primary: '#C1121F',
  white: '#FFFFFF',
  darkGray: '#1C1C1C',
};

const headerScreenOptions: NativeStackNavigationOptions = {
  headerShown: true,
  headerBackTitleVisible: false,
  headerTintColor: COLORS.primary,
  headerStyle: {
    backgroundColor: COLORS.white,
  },
  headerTitleStyle: {
    color: COLORS.darkGray,
    fontWeight: '600',
  },
};

const welcomeScreenOptions: NativeStackNavigationOptions = {
  headerShown: false,
};

export default function OnboardingStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Welcome"
        component={WelcomeScreen}
        options={welcomeScreenOptions}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={headerScreenOptions}
      />
      <Stack.Screen
        name="Conditions"
        component={ConditionsScreen}
        options={headerScreenOptions}
      />
      <Stack.Screen
        name="Symptoms"
        component={SymptomsScreen}
        options={headerScreenOptions}
      />
      <Stack.Screen
        name="Meds"
        component={MedsScreen}
        options={headerScreenOptions}
      />
      <Stack.Screen
        name="Privacy"
        component={PrivacyScreen}
        options={headerScreenOptions}
      />
      <Stack.Screen
        name="Finish"
        component={FinishScreen}
        options={headerScreenOptions}
      />
    </Stack.Navigator>
  );
}
