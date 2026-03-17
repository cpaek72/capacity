import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';
import RootNavigator from './src/app/navigation/RootNavigator';

const toastConfig = {
  success: (props: any) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: '#2E7D32', backgroundColor: '#FFFFFF' }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{ fontSize: 15, fontWeight: '500', color: '#1C1C1C' }}
      text2Style={{ fontSize: 13, color: '#7A7A7A' }}
    />
  ),
  error: (props: any) => (
    <ErrorToast
      {...props}
      style={{ borderLeftColor: '#B00020', backgroundColor: '#FFFFFF' }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{ fontSize: 15, fontWeight: '500', color: '#1C1C1C' }}
      text2Style={{ fontSize: 13, color: '#7A7A7A' }}
    />
  ),
  info: (props: any) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: '#C1121F', backgroundColor: '#FFFFFF' }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{ fontSize: 15, fontWeight: '500', color: '#1C1C1C' }}
      text2Style={{ fontSize: 13, color: '#7A7A7A' }}
    />
  ),
};

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <RootNavigator />
        <StatusBar style="dark" />
      </NavigationContainer>
      <Toast config={toastConfig} />
    </SafeAreaProvider>
  );
}
