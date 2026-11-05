import React, { useMemo } from 'react';
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

export type DockTab = 'HOME' | 'MAP' | 'ORDERS' | 'CUSTOMERS' | 'PRODUCTS' | 'MANIFEST' | 'PROFILE';

interface FloatingBottomDockProps {
  activeTab: DockTab;
  navigation: any;
}

export const FloatingBottomDock: React.FC<FloatingBottomDockProps> = ({
  activeTab,
  navigation,
}) => {
  const { user } = useAuth();
  const { orders, statistics } = useOrders();

  const isAdmin = user?.role === 'ADMIN';
  const isDistributor = user?.role === 'DISTRIBUTOR';
  const isClient = user?.role === 'CLIENT';

  // Badges dinámicos según rol y rubro especializado del distribuidor
  const pendingDeliveries = useMemo(() => {
    if (isDistributor) {
      const specialty = user?.specialtyCategory || 'WATER';
      return orders.filter(
        (o) =>
          o.category === specialty &&
          (o.status === 'PENDING' || o.status === 'IN_TRANSIT')
      ).length;
    }
    return statistics.pendingOrders + statistics.inTransitOrders;
  }, [isDistributor, user, orders, statistics]);

  // Cantidad de pedidos activos concurrentes para el cliente
  const clientActiveOrdersCount = useMemo(() => {
    if (!isClient || !user) return 0;
    return orders.filter(
      (o) =>
        (o.customerId === user.customerId ||
          o.customerName.toLowerCase() === user.name.toLowerCase()) &&
        (o.status === 'PENDING' || o.status === 'IN_TRANSIT')
    ).length;
  }, [isClient, user, orders]);

  // 1. TABS PARA EL DISTRIBUIDOR (4 HERRAMIENTAS REALES DE OPERACIÓN EN RUTA)
  const distributorTabs = [
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
    {
      id: 'MANIFEST' as DockTab,
      label: 'Mi Carga',
      iconActive: 'cube',
      iconInactive: 'cube-outline',
      targetScreen: 'RouteSummaryModalOrScreen',
      badge: 0,
    },
    {
      id: 'PROFILE' as DockTab,
      label: 'Mi Perfil',
      iconActive: 'person',
      iconInactive: 'person-outline',
      targetScreen: 'ProfileScreen',
      badge: 0,
    },
  ];

  // 2. TABS PARA EL ADMINISTRADOR (5 BURBUJAS CLAVE: RUTA GPS, PEDIDOS, CLIENTES, CATÁLOGO, MI PERFIL)
  const adminTabs = [
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
    {
      id: 'PROFILE' as DockTab,
      label: 'Mi Perfil',
      iconActive: 'person',
      iconInactive: 'person-outline',
      targetScreen: 'ProfileScreen',
      badge: 0,
    },
  ];

  // 3. TABS PARA EL CLIENTE FINAL (4 BURBUJAS: CATÁLOGO, MI PEDIDO, HISTORIAL, MI PERFIL)
  const clientTabs = [
    {
      id: 'PRODUCTS' as DockTab,
      label: 'Catálogo',
      iconActive: 'cube',
      iconInactive: 'cube-outline',
      targetScreen: 'ClientHomeScreen',
      params: { tab: 'CATALOG' },
      badge: 0,
    },
    {
      id: 'ORDERS' as DockTab,
      label: 'Mi Pedido',
      iconActive: 'bicycle',
      iconInactive: 'bicycle-outline',
      targetScreen: 'ClientHomeScreen',
      params: { tab: 'ORDER' },
      badge: clientActiveOrdersCount,
    },
    {
      id: 'MANIFEST' as DockTab,
      label: 'Historial',
      iconActive: 'receipt',
      iconInactive: 'receipt-outline',
      targetScreen: 'ClientHomeScreen',
      params: { tab: 'HISTORY' },
      badge: 0,
    },
    {
      id: 'PROFILE' as DockTab,
      label: 'Mi Perfil',
      iconActive: 'person',
      iconInactive: 'person-outline',
      targetScreen: 'ProfileScreen',
      badge: 0,
    },
  ];

  const currentTabs = isAdmin ? adminTabs : isClient ? clientTabs : distributorTabs;

  const handlePressTab = (tab: any) => {
    if (tab.id === activeTab && (!tab.params || activeTab === 'PROFILE')) return;
    hapticSelection();
    if (tab.params) {
      navigation.navigate(tab.targetScreen, tab.params);
    } else {
      navigation.navigate(tab.targetScreen);
    }
  };

  return (
    <View style={styles.dockOuterContainer} pointerEvents="box-none">
      {/* Máscara de protección inferior: previene que el texto al hacer scroll se trasluzca */}
      <View style={styles.dockBackdropMask} pointerEvents="none" />

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
                  size={18}
                  color={isActive ? COLORS.primary : '#64748B'}
                />

                {/* Badge de notificación */}
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
    bottom: 0,
    paddingBottom: Platform.OS === 'ios' ? 14 : 4,
    paddingTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
    zIndex: 9999,
  },
  dockBackdropMask: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: Platform.OS === 'ios' ? 76 : 60,
    backgroundColor: 'rgba(248, 250, 252, 0.94)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(226, 232, 240, 0.7)',
  },
  dockCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    maxWidth: 390,
    height: 52,
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    // Sombra (Sombra suave)
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  dockItem: {
    flex: 1,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    paddingHorizontal: 2,
  },
  dockItemActive: {
    backgroundColor: '#EFF6FF',
  },
  iconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 22,
  },
  tabLabel: {
    fontSize: 9,
    marginTop: 1,
    letterSpacing: -0.2,
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
