import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DailyPointsProvider } from './src/context/DailyPointsContext';
import { AppNavigator } from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <DailyPointsProvider>
        <StatusBar style="light" />
        <AppNavigator />
      </DailyPointsProvider>
    </SafeAreaProvider>
  );
}
