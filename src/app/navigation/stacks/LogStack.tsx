import React from 'react';
import {
  createNativeStackNavigator,
  NativeStackNavigationOptions,
} from '@react-navigation/native-stack';
import LogHomeScreen from '../../screens/log/LogHomeScreen';
import NewEntryScreen from '../../screens/log/NewEntryScreen';
import EditEntryScreen from '../../screens/log/EditEntryScreen';
import CalendarScreen from '../../screens/log/CalendarScreen';
import TimelineScreen from '../../screens/log/TimelineScreen';
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

export default function LogStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="LogHomeScreen"
        component={LogHomeScreen}
        options={headerScreenOptions}
      />
      <Stack.Screen
        name="NewEntry"
        component={NewEntryScreen}
        options={modalScreenOptions}
      />
      <Stack.Screen
        name="EditEntry"
        component={EditEntryScreen}
        options={modalScreenOptions}
      />
      <Stack.Screen
        name="Calendar"
        component={CalendarScreen}
        options={headerScreenOptions}
      />
      <Stack.Screen
        name="Timeline"
        component={TimelineScreen}
        options={headerScreenOptions}
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
