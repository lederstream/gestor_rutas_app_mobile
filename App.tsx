/**
 * ============================================================================
 * ENTRY POINT: App.tsx
 * RutaPro Mobile / DistriExpress - Enterprise Logistics & Route Distribution
 * ============================================================================
 */

import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { OrderProvider } from './src/context/OrderContext';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <OrderProvider>
        <StatusBar style="auto" />
        <RootNavigator />
      </OrderProvider>
    </SafeAreaProvider>
  );
}
