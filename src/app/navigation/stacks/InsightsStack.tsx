import React from 'react';
import {
  createNativeStackNavigator,
  NativeStackNavigationOptions,
} from '@react-navigation/native-stack';
import InsightsScreen from '../../screens/insights/InsightsScreen';
import WeeklyReportScreen from '../../screens/insights/WeeklyReportScreen';
import ExportScreen from '../../screens/export/ExportScreen';
import ExportPreviewScreen from '../../screens/export/ExportPreviewScreen';

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

export default function InsightsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="InsightsScreen"
        component={InsightsScreen}
        options={{
          ...headerScreenOptions,
          title: 'Insights',
        }}
      />
      <Stack.Screen
        name="WeeklyReport"
        component={WeeklyReportScreen}
        options={{
          ...headerScreenOptions,
          title: 'Weekly Report',
        }}
      />
      <Stack.Screen
        name="Export"
        component={ExportScreen}
        options={headerScreenOptions}
      />
      <Stack.Screen
        name="ExportPreview"
        component={ExportPreviewScreen}
        options={headerScreenOptions}
      />
    </Stack.Navigator>
  );
}
