import React from 'react';
import {
  createNativeStackNavigator,
  NativeStackNavigationOptions,
} from '@react-navigation/native-stack';
import ProfileScreen from '../../screens/profile/ProfileScreen';
import EditProfileScreen from '../../screens/profile/EditProfileScreen';
import ConditionsManageScreen from '../../screens/profile/ConditionsManageScreen';
import SymptomsManageScreen from '../../screens/profile/SymptomsManageScreen';
import MedsManageScreen from '../../screens/profile/MedsManageScreen';
import NotificationsScreen from '../../screens/profile/NotificationsScreen';
import PrivacySettingsScreen from '../../screens/profile/PrivacySettingsScreen';
import DataAndAccountScreen from '../../screens/profile/DataAndAccountScreen';
import HelpScreen from '../../screens/profile/HelpScreen';
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

export default function ProfileStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ProfileScreen"
        component={ProfileScreen}
        options={headerScreenOptions}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={headerScreenOptions}
      />
      <Stack.Screen
        name="ConditionsManage"
        component={ConditionsManageScreen}
        options={headerScreenOptions}
      />
      <Stack.Screen
        name="SymptomsManage"
        component={SymptomsManageScreen}
        options={headerScreenOptions}
      />
      <Stack.Screen
        name="MedsManage"
        component={MedsManageScreen}
        options={headerScreenOptions}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={headerScreenOptions}
      />
      <Stack.Screen
        name="PrivacySettings"
        component={PrivacySettingsScreen}
        options={headerScreenOptions}
      />
      <Stack.Screen
        name="DataAndAccount"
        component={DataAndAccountScreen}
        options={headerScreenOptions}
      />
      <Stack.Screen
        name="Help"
        component={HelpScreen}
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
