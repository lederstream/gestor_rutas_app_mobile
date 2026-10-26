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

export type RootStackParamList = {
  WelcomeScreen: undefined;
  OrderListScreen: undefined;
  CreateOrderScreen: undefined;
  OrderDetailScreen: { orderId: string };
  RouteSummaryModalOrScreen: undefined;
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
      </Stack.Navigator>
    </NavigationContainer>
  );
};
