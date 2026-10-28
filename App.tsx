/**
 * ============================================================================
 * ENTRY POINT: App.tsx
 * Gestor de Rutas Móvil - Sistema de Logística y Distribución Inmediata
 * ============================================================================
 */

import 'react-native-url-polyfill/auto';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { registerRootComponent } from 'expo';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/context/AuthContext';
import { OrderProvider } from './src/context/OrderContext';
import { CustomerProvider } from './src/context/CustomerContext';
import { ProductProvider } from './src/context/ProductContext';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <CustomerProvider>
          <ProductProvider>
            <OrderProvider>
              <StatusBar style="auto" />
              <RootNavigator />
            </OrderProvider>
          </ProductProvider>
        </CustomerProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

registerRootComponent(App);
