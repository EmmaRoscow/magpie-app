import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { DailyPointsProvider } from './src/context/DailyPointsContext';
import { AppNavigator } from './src/navigation/AppNavigator';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <DailyPointsProvider>
          <StatusBar style="light" />
          <AppNavigator />
        </DailyPointsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
