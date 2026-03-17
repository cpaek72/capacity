import React from 'react';
import {
  createNativeStackNavigator,
  NativeStackNavigationOptions,
} from '@react-navigation/native-stack';
import LandingScreen from '../screens/public/LandingScreen';
import LoginScreen from '../screens/public/LoginScreen';
import SignupScreen from '../screens/public/SignupScreen';
import ForgotPasswordScreen from '../screens/public/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/public/ResetPasswordScreen';
import PrivacyScreen from '../screens/public/PrivacyScreen';
import TermsScreen from '../screens/public/TermsScreen';
import AboutScreen from '../screens/public/AboutScreen';

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

const landingScreenOptions: NativeStackNavigationOptions = {
  headerShown: false,
};

export default function PublicStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Landing"
        component={LandingScreen}
        options={landingScreenOptions}
      />
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={headerScreenOptions}
      />
      <Stack.Screen
        name="Signup"
        component={SignupScreen}
        options={headerScreenOptions}
      />
      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={headerScreenOptions}
      />
      <Stack.Screen
        name="ResetPassword"
        component={ResetPasswordScreen}
        options={headerScreenOptions}
      />
      <Stack.Screen
        name="Privacy"
        component={PrivacyScreen}
        options={headerScreenOptions}
      />
      <Stack.Screen
        name="Terms"
        component={TermsScreen}
        options={headerScreenOptions}
      />
      <Stack.Screen
        name="About"
        component={AboutScreen}
        options={headerScreenOptions}
      />
    </Stack.Navigator>
  );
}
