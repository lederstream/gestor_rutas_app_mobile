/**
 * ============================================================================
 * COMPONENT: FloatingBottomDock.tsx
 * Footer en Burbujas Flotantes (Floating Dock) con Principios de Neuromarketing
 * Ergonomía Thumb-Zone (3 burbujas para Chofer, 4 burbujas para Administrador)
 * ============================================================================
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useOrders } from '../../context/OrderContext';
import { COLORS, RADIUS, SPACING } from '../../utils/constants';
import { hapticSelection } from '../../utils/haptics';

export type DockTab = 'HOME' | 'MAP' | 'ORDERS' | 'CUSTOMERS' | 'PRODUCTS' | 'MANIFEST';

interface FloatingBottomDockProps {
  activeTab: DockTab;
  navigation: any;
}

export const FloatingBottomDock: React.FC<FloatingBottomDockProps> = ({
  activeTab,
  navigation,
}) => {
  const { user } = useAuth();
  const { statistics } = useOrders();

  const isAdmin = user?.role === 'ADMIN';

  // Badges dinámicos para neuromarketing de urgencia
  const pendingDeliveries = statistics.pendingOrders + statistics.inTransitOrders;

  // 1. TABS PARA EL DISTRIBUIDOR (3 BURBUJAS CLAVE: INICIO, RUTA GPS, MIS PARADAS)
  const distributorTabs = [
    {
      id: 'HOME' as DockTab,
      label: 'Inicio',
      iconActive: 'home',
      iconInactive: 'home-outline',
      targetScreen: 'WelcomeScreen',
      badge: 0,
    },
    {
      id: 'MAP' as DockTab,
      label: 'Ruta GPS',
      iconActive: 'navigate',
      iconInactive: 'navigate-outline',
      targetScreen: 'MapRouteScreen',
      badge: 0,
    },
    {
      id: 'ORDERS' as DockTab,
      label: 'Mis Paradas',
      iconActive: 'list',
      iconInactive: 'list-outline',
      targetScreen: 'OrderListScreen',
      badge: pendingDeliveries,
    },
  ];

  // 2. TABS PARA EL ADMINISTRADOR (4 BURBUJAS CLAVE: INICIO, PEDIDOS, CLIENTES, CATÁLOGO)
  const adminTabs = [
    {
      id: 'HOME' as DockTab,
      label: 'Tablero',
      iconActive: 'grid',
      iconInactive: 'grid-outline',
      targetScreen: 'WelcomeScreen',
      badge: 0,
    },
    {
      id: 'ORDERS' as DockTab,
      label: 'Pedidos',
      iconActive: 'receipt',
      iconInactive: 'receipt-outline',
      targetScreen: 'OrderListScreen',
      badge: statistics.pendingOrders,
    },
    {
      id: 'CUSTOMERS' as DockTab,
      label: 'Clientes',
      iconActive: 'people',
      iconInactive: 'people-outline',
      targetScreen: 'CustomerListScreen',
      badge: 0,
    },
    {
      id: 'PRODUCTS' as DockTab,
      label: 'Catálogo',
      iconActive: 'pricetags',
      iconInactive: 'pricetags-outline',
      targetScreen: 'ProductListScreen',
      badge: 0,
    },
  ];

  const currentTabs = isAdmin ? adminTabs : distributorTabs;

  const handlePressTab = (tab: (typeof currentTabs)[0]) => {
    if (tab.id === activeTab) return;
    hapticSelection();
    navigation.navigate(tab.targetScreen);
  };

  return (
    <View style={styles.dockOuterContainer} pointerEvents="box-none">
      <View style={styles.dockCapsule}>
        {currentTabs.map((tab) => {
          const isActive = tab.id === activeTab;

          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.dockItem, isActive && styles.dockItemActive]}
              onPress={() => handlePressTab(tab)}
              activeOpacity={0.78}
            >
              <View style={styles.iconWrapper}>
                <Ionicons
                  name={(isActive ? tab.iconActive : tab.iconInactive) as any}
                  size={20}
                  color={isActive ? COLORS.primary : '#64748B'}
                />

                {/* Neuromarketing: Micro-badge de alerta o conteo */}
                {tab.badge > 0 && (
                  <View style={styles.badgePill}>
                    <Text style={styles.badgeText}>{tab.badge > 99 ? '99+' : tab.badge}</Text>
                  </View>
                )}
              </View>

              <Text
                style={[
                  styles.tabLabel,
                  isActive ? styles.tabLabelActive : styles.tabLabelInactive,
                ]}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  dockOuterContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: Platform.OS === 'ios' ? 24 : 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
    zIndex: 9999,
  },
  dockCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    maxWidth: 390,
    height: 62,
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    // Luxury Soft Blur Shadow (Neuromarketing de calidad percibida)
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  dockItem: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    paddingHorizontal: 4,
  },
  dockItemActive: {
    backgroundColor: '#EFF6FF',
  },
  iconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 26,
    height: 24,
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 2,
    letterSpacing: -0.1,
  },
  tabLabelActive: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  tabLabelInactive: {
    color: '#64748B',
    fontWeight: '600',
  },
  badgePill: {
    position: 'absolute',
    top: -5,
    right: -8,
    backgroundColor: COLORS.danger,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
});
