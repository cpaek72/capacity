import React from 'react';
import {
  createNativeStackNavigator,
  NativeStackNavigationOptions,
} from '@react-navigation/native-stack';
import TrendsScreen from '../../screens/trends/TrendsScreen';
import SymptomDetailScreen from '../../screens/trends/SymptomDetailScreen';
import CorrelationExplorerScreen from '../../screens/trends/CorrelationExplorerScreen';

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

export default function TrendsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="TrendsScreen"
        component={TrendsScreen}
        options={headerScreenOptions}
      />
      <Stack.Screen
        name="SymptomDetail"
        component={SymptomDetailScreen}
        options={headerScreenOptions}
      />
      <Stack.Screen
        name="CorrelationExplorer"
        component={CorrelationExplorerScreen}
        options={headerScreenOptions}
      />
    </Stack.Navigator>
  );
}
