import React from 'react';
import {
  createNativeStackNavigator,
  NativeStackNavigationOptions,
} from '@react-navigation/native-stack';
import HomeScreen from '../../screens/home/HomeScreen';

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

const modalScreenOptions: NativeStackNavigationOptions = {
  presentation: 'fullScreenModal',
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

export default function HomeStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="HomeScreen"
        component={HomeScreen}
        options={headerScreenOptions}
      />
    </Stack.Navigator>
  );
}
