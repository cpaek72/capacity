import React from 'react';
import {
  createBottomTabNavigator,
  BottomTabNavigationOptions,
} from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HomeStack from './stacks/HomeStack';
import LogStack from './stacks/LogStack';
import TrendsStack from './stacks/TrendsStack';
import InsightsStack from './stacks/InsightsStack';
import ProfileStack from './stacks/ProfileStack';

const Tab = createBottomTabNavigator();

const COLORS = {
  primary: '#C1121F',
  white: '#FFFFFF',
  midGray: '#7A7A7A',
  lightGray: '#E5E5E5',
};

const TAB_CONFIG = [
  { name: 'HomeTab', component: HomeStack, label: 'Home', icon: '🏠' },
  { name: 'LogTab', component: LogStack, label: 'Log', icon: '📝' },
  { name: 'TrendsTab', component: TrendsStack, label: 'Trends', icon: '📊' },
  {
    name: 'InsightsTab',
    component: InsightsStack,
    label: 'Insights',
    icon: '💡',
  },
  { name: 'ProfileTab', component: ProfileStack, label: 'Profile', icon: '👤' },
];

const createTabOptions = (
  label: string,
  icon: string
): BottomTabNavigationOptions => ({
  headerShown: false,
  tabBarLabel: label,
  tabBarIcon: ({ focused }) => (
    <Text style={{ fontSize: 20 }}>{icon}</Text>
  ),
  tabBarActiveTintColor: COLORS.primary,
  tabBarInactiveTintColor: COLORS.midGray,
  tabBarLabelStyle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
});

export default function AppTabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopColor: COLORS.lightGray,
          borderTopWidth: 1,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.midGray,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginTop: 4,
        },
      }}
    >
      {TAB_CONFIG.map((tab) => (
        <Tab.Screen
          key={tab.name}
          name={tab.name}
          component={tab.component}
          options={createTabOptions(tab.label, tab.icon)}
        />
      ))}
    </Tab.Navigator>
  );
}
