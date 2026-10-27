/**
 * ============================================================================
 * NAVIGATION: RootNavigator.tsx
 * Type-safe React Navigation Stack with custom screen transitions
 * ============================================================================
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  NativeStackNavigationProp,
} from '@react-navigation/native-stack';

import { WelcomeScreen } from '../screens/WelcomeScreen';
import { OrderListScreen } from '../screens/OrderListScreen';
import { CreateOrderScreen } from '../screens/CreateOrderScreen';
import { OrderDetailScreen } from '../screens/OrderDetailScreen';
import { RouteSummaryModalOrScreen } from '../screens/RouteSummaryModalOrScreen';
import { MapRouteScreen } from '../screens/MapRouteScreen';
import { CustomerListScreen } from '../screens/CustomerListScreen';
import { CustomerFormScreen } from '../screens/CustomerFormScreen';
import { ProductListScreen } from '../screens/ProductListScreen';
import { ProductFormScreen } from '../screens/ProductFormScreen';

export type RootStackParamList = {
  WelcomeScreen: undefined;
  OrderListScreen: undefined;
  CreateOrderScreen:
    | {
        initialCustomerId?: string;
        initialLatitude?: number;
        initialLongitude?: number;
      }
    | undefined;
  OrderDetailScreen: { orderId: string };
  RouteSummaryModalOrScreen: undefined;
  MapRouteScreen:
    | { highlightOrderId?: string; placePinForOrderId?: string }
    | undefined;
  CustomerListScreen: undefined;
  CustomerFormScreen: { customerId?: string } | undefined;
  ProductListScreen: undefined;
  ProductFormScreen: { productId?: string } | undefined;
};

export type RootNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="WelcomeScreen"
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen
          name="WelcomeScreen"
          component={WelcomeScreen}
          options={{
            animation: 'fade',
          }}
        />
        <Stack.Screen
          name="CustomerListScreen"
          component={CustomerListScreen}
        />
        <Stack.Screen
          name="CustomerFormScreen"
          component={CustomerFormScreen}
        />
        <Stack.Screen
          name="ProductListScreen"
          component={ProductListScreen}
        />
        <Stack.Screen
          name="ProductFormScreen"
          component={ProductFormScreen}
        />
        <Stack.Screen
          name="OrderListScreen"
          component={OrderListScreen}
        />
        <Stack.Screen
          name="CreateOrderScreen"
          component={CreateOrderScreen}
          options={{
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="OrderDetailScreen"
          component={OrderDetailScreen}
        />
        <Stack.Screen
          name="RouteSummaryModalOrScreen"
          component={RouteSummaryModalOrScreen}
          options={{
            animation: 'slide_from_bottom',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="MapRouteScreen"
          component={MapRouteScreen}
          options={{
            animation: 'slide_from_right',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
