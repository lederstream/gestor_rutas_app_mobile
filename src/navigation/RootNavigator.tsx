import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  NativeStackNavigationProp,
} from '@react-navigation/native-stack';

import { useAuth } from '../context/AuthContext';
import { LoginScreen } from '../screens/LoginScreen';
import { ClientHomeScreen } from '../screens/ClientHomeScreen';
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
import { DriverListScreen } from '../screens/DriverListScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { COLORS } from '../utils/constants';

export type RootStackParamList = {
  LoginScreen: undefined;
  ClientHomeScreen: undefined;
  WelcomeScreen: undefined;
  ProfileScreen: undefined;
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
  DriverListScreen: undefined;
};

export type RootNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();

  // 1. PANTALLA DE CARGA DE SESIÓN
  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: COLORS.background,
        }}
      >
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // 2. FLUJO NO AUTENTICADO (GUEST / LOGIN)
  // Al no estar autenticado, el único screen que existe en el árbol de React es LoginScreen.
  // 
  if (!isAuthenticated || !user) {
    return (
      <NavigationContainer key="guest-navigation-container">
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            animation: 'fade',
          }}
        >
          <Stack.Screen name="LoginScreen" component={LoginScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  // 3. FLUJO CLIENTE FINAL (PORTAL EXCLUSIVO CLIENTE)
  if (user.role === 'CLIENT') {
    return (
      <NavigationContainer key={`client-navigation-container-${user.id}`}>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="ClientHomeScreen" component={ClientHomeScreen} />
          <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  // 4. FLUJO DISTRIBUIDOR Y ADMINISTRADOR (PANEL OPERATIVO Y RUTAS)
  // Flujo inicial:
  // El Distribuidor aterriza DIRECTAMENTE en el Mapa GPS (MapRouteScreen) para iniciar su ruta sin fricciones.
  // El Administrador aterriza en el Tablero General (WelcomeScreen) para supervisar métricas.
  return (
    <NavigationContainer key={`operator-navigation-container-${user.id}-${user.role}`}>
      <Stack.Navigator
        initialRouteName="MapRouteScreen"
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="WelcomeScreen" component={WelcomeScreen} />
        <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
        <Stack.Screen name="CustomerListScreen" component={CustomerListScreen} />
        <Stack.Screen name="CustomerFormScreen" component={CustomerFormScreen} />
        <Stack.Screen name="ProductListScreen" component={ProductListScreen} />
        <Stack.Screen name="ProductFormScreen" component={ProductFormScreen} />
        <Stack.Screen name="DriverListScreen" component={DriverListScreen} />
        <Stack.Screen name="OrderListScreen" component={OrderListScreen} />
        <Stack.Screen
          name="CreateOrderScreen"
          component={CreateOrderScreen}
          options={{
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen name="OrderDetailScreen" component={OrderDetailScreen} />
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
