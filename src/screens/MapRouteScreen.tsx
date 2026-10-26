/**
 * ============================================================================
 * SCREEN: MapRouteScreen.tsx
 * Interactive GPS Navigation & Multi-stop Route Map (InDrive/Uber Driver Style)
 * ============================================================================
 */

import React, { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Platform,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import MapView, { Marker, PROVIDER_DEFAULT, Region } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/RootNavigator';
import { useOrders } from '../context/OrderContext';
import { Order, OrderStatus } from '../models/Order';
import {
  COLORS,
  CATEGORY_CONFIG,
  STATUS_CONFIG,
  DISTRICT_COORDINATES,
} from '../utils/constants';
import { formatCurrency, formatPhone } from '../utils/formatters';
import { StatusBadge } from '../components/orders/StatusBadge';
import { PriorityBadge } from '../components/orders/PriorityBadge';

const { width } = Dimensions.get('window');

type Props = NativeStackScreenProps<RootStackParamList, 'MapRouteScreen'>;

// Default initial Lima region
const INITIAL_REGION: Region = {
  latitude: -12.1050,
  longitude: -77.0150,
  latitudeDelta: 0.12,
  longitudeDelta: 0.12,
};

export const MapRouteScreen: React.FC<Props> = ({ navigation }) => {
  const { orders, updateOrderStatus } = useOrders();
  const mapRef = useRef<MapView>(null);

  // Filter state for the map
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL'>('ALL');

  // Selected Order for the bottom sheet preview
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Filtered orders with valid coordinates
  const mappedOrders = useMemo(() => {
    return orders
      .filter((o) => {
        if (statusFilter !== 'ALL' && o.status !== statusFilter) return false;
        return true;
      })
      .map((order, index) => {
        // Fallback to district coordinate if order has no explicit latitude
        let lat = order.latitude;
        let lng = order.longitude;
        if (!lat || !lng) {
          const fallback = DISTRICT_COORDINATES[order.district] || {
            latitude: -12.0984,
            longitude: -77.0016,
          };
          lat = fallback.latitude;
          lng = fallback.longitude;
        }
        return {
          ...order,
          latitude: lat,
          longitude: lng,
          stopIndex: index + 1,
        };
      });
  }, [orders, statusFilter]);

  // Active order to show in bottom sheet (selected or first in transit / pending)
  const activeOrder = useMemo(() => {
    if (selectedOrder) {
      const found = mappedOrders.find((o) => o.id === selectedOrder.id);
      if (found) return found;
    }
    // Default to the first in-transit or pending order
    return (
      mappedOrders.find((o) => o.status === 'IN_TRANSIT') ||
      mappedOrders.find((o) => o.status === 'PENDING') ||
      mappedOrders[0] ||
      null
    );
  }, [selectedOrder, mappedOrders]);

  // Center on active stops
  const handleRecenter = () => {
    if (!mapRef.current || mappedOrders.length === 0) return;

    if (mappedOrders.length === 1) {
      mapRef.current.animateToRegion({
        latitude: mappedOrders[0].latitude,
        longitude: mappedOrders[0].longitude,
        latitudeDelta: 0.03,
        longitudeDelta: 0.03,
      });
      return;
    }

    const coordinates = mappedOrders.map((o) => ({
      latitude: o.latitude,
      longitude: o.longitude,
    }));

    mapRef.current.fitToCoordinates(coordinates, {
      edgePadding: { top: 80, right: 60, bottom: 260, left: 60 },
      animated: true,
    });
  };

  // Launch Google Maps or Waze directly
  const handleOpenNavigation = (order: Order) => {
    const fullAddress = `${order.deliveryAddress}, ${order.district}, Lima, Perú`;
    const encoded = encodeURIComponent(fullAddress);

    Alert.alert(
      'Iniciar Navegación GPS',
      `Destino:\n${order.deliveryAddress}\n(${order.district})`,
      [
        {
          text: 'Google Maps (Recomendado)',
          onPress: () => {
            const url = Platform.select({
              ios: `maps://?daddr=${encoded}&dirflg=d`,
              android: `google.navigation:q=${encoded}&mode=d`,
              default: `https://www.google.com/maps/dir/?api=1&destination=${encoded}`,
            });
            Linking.canOpenURL(url)
              .then((supported) => {
                if (supported) {
                  return Linking.openURL(url);
                }
                return Linking.openURL(
                  `https://www.google.com/maps/dir/?api=1&destination=${encoded}`
                );
              })
              .catch(() => {
                Linking.openURL(
                  `https://www.google.com/maps/dir/?api=1&destination=${encoded}`
                );
              });
          },
        },
        {
          text: 'Waze',
          onPress: () => {
            const wazeUrl = `https://waze.com/ul?q=${encoded}&navigate=yes`;
            Linking.openURL(wazeUrl).catch(() => {
              Alert.alert('Waze', 'No se pudo abrir Waze.');
            });
          },
        },
        {
          text: 'Cancelar',
          style: 'cancel',
        },
      ]
    );
  };

  // Call customer
  const handleCall = (phone: string, name: string) => {
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('Llamar', `Llamar a ${name}: ${phone}`);
    });
  };

  // WhatsApp
  const handleWhatsApp = (phone: string, name: string, code: string) => {
    const text = encodeURIComponent(
      `Hola ${name}, te saludamos de Gestor de Rutas. Estamos en camino con tu pedido ${code}.`
    );
    Linking.openURL(`https://wa.me/51${phone}?text=${text}`);
  };

  // Status transitions
  const handleStatusChange = (order: Order, nextStatus: OrderStatus) => {
    updateOrderStatus(order.id, nextStatus);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Floating Header & Filter Bar */}
      <View style={styles.topHeader}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color={COLORS.secondary} />
          </TouchableOpacity>

          <View style={styles.titleContainer}>
            <Text style={styles.screenTitle}>Mapa de Repartos en Vivo</Text>
            <Text style={styles.screenSubtitle}>
              {mappedOrders.length} {mappedOrders.length === 1 ? 'parada' : 'paradas'} en ruta
            </Text>
          </View>

          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleRecenter}
            activeOpacity={0.7}
          >
            <Ionicons name="locate" size={22} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Filter Chips */}
        <View style={styles.filterChipsRow}>
          {(['ALL', 'IN_TRANSIT', 'PENDING', 'DELIVERED'] as const).map(
            (status) => {
              const isActive = statusFilter === status;
              const label =
                status === 'ALL'
                  ? 'Todos'
                  : status === 'IN_TRANSIT'
                  ? 'En Ruta'
                  : status === 'PENDING'
                  ? 'Pendientes'
                  : 'Entregados';

              return (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.chip,
                    isActive && styles.chipActive,
                  ]}
                  onPress={() => setStatusFilter(status)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.chipText,
                      isActive && styles.chipTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            }
          )}
        </View>
      </View>

      {/* Interactive Map */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={styles.map}
        initialRegion={INITIAL_REGION}
        showsUserLocation={true}
        showsCompass={true}
        showsScale={true}
        loadingEnabled={true}
      >
        {mappedOrders.map((order) => {
          const isSelected = activeOrder?.id === order.id;
          const statusColor =
            order.status === 'IN_TRANSIT'
              ? COLORS.statusInTransit
              : order.status === 'DELIVERED'
              ? COLORS.statusDelivered
              : order.status === 'CANCELLED'
              ? COLORS.statusCancelled
              : COLORS.statusPending;

          return (
            <Marker
              key={order.id}
              coordinate={{
                latitude: order.latitude,
                longitude: order.longitude,
              }}
              title={order.customerName}
              description={`${order.deliveryAddress} - ${order.district}`}
              onPress={() => setSelectedOrder(order)}
            >
              <View
                style={[
                  styles.markerPin,
                  { backgroundColor: statusColor },
                  isSelected && styles.markerPinSelected,
                ]}
              >
                <Ionicons
                  name={
                    order.status === 'DELIVERED'
                      ? 'checkmark-outline'
                      : 'navigate'
                  }
                  size={14}
                  color="#FFFFFF"
                />
                <Text style={styles.markerText}>{order.stopIndex}</Text>
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* Bottom Floating Order Card (InDrive / Uber Driver Style) */}
      {activeOrder && (
        <View style={styles.bottomCardWrapper}>
          <View style={styles.card}>
            {/* Stop Sequence & Urgency Header */}
            <View style={styles.cardHeader}>
              <View style={styles.stopBadge}>
                <Text style={styles.stopBadgeNumber}>#{activeOrder.stopIndex}</Text>
                <Text style={styles.stopBadgeText}>
                  {activeOrder.status === 'IN_TRANSIT'
                    ? 'EN CAMINO'
                    : activeOrder.status === 'DELIVERED'
                    ? 'ENTREGADO'
                    : 'SIGUIENTE PARADA'}
                </Text>
              </View>
              <PriorityBadge priority={activeOrder.priority} size="sm" />
            </View>

            {/* Customer & Address */}
            <View style={styles.customerRow}>
              <View style={styles.customerInfo}>
                <Text style={styles.customerName} numberOfLines={1}>
                  {activeOrder.customerName}
                </Text>
                <View style={styles.addressRow}>
                  <Ionicons
                    name="location"
                    size={15}
                    color={COLORS.primary}
                    style={styles.locationIcon}
                  />
                  <Text style={styles.addressText} numberOfLines={2}>
                    {activeOrder.deliveryAddress} ({activeOrder.district})
                  </Text>
                </View>
                {activeOrder.addressReference ? (
                  <Text style={styles.referenceText} numberOfLines={1}>
                    Ref: {activeOrder.addressReference}
                  </Text>
                ) : null}
              </View>

              {/* Quick Contact Buttons */}
              <View style={styles.quickContactsCol}>
                <TouchableOpacity
                  style={styles.circleContactBtn}
                  onPress={() =>
                    handleCall(activeOrder.customerPhone, activeOrder.customerName)
                  }
                  activeOpacity={0.7}
                >
                  <Ionicons name="call" size={16} color={COLORS.primary} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.circleContactBtn, styles.whatsappCircle]}
                  onPress={() =>
                    handleWhatsApp(
                      activeOrder.customerPhone,
                      activeOrder.customerName,
                      activeOrder.orderCode
                    )
                  }
                  activeOpacity={0.7}
                >
                  <Ionicons name="logo-whatsapp" size={16} color="#16A34A" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Financial and Order Summary */}
            <View style={styles.financialRow}>
              <View>
                <Text style={styles.amountLabel}>Monto a Cobrar</Text>
                <Text style={styles.amountValue}>
                  {formatCurrency(activeOrder.totalAmount)}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.detailLink}
                onPress={() =>
                  navigation.navigate('OrderDetailScreen', {
                    orderId: activeOrder.id,
                  })
                }
              >
                <Text style={styles.detailLinkText}>Ver Detalle</Text>
                <Ionicons
                  name="chevron-forward"
                  size={14}
                  color={COLORS.primary}
                />
              </TouchableOpacity>
            </View>

            {/* Driver Actions (GPS + Status) */}
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity
                style={styles.gpsPrimaryButton}
                onPress={() => handleOpenNavigation(activeOrder)}
                activeOpacity={0.85}
              >
                <Ionicons name="navigate" size={18} color="#FFFFFF" />
                <Text style={styles.gpsButtonText}>Navegar con GPS</Text>
              </TouchableOpacity>

              {activeOrder.status === 'PENDING' && (
                <TouchableOpacity
                  style={styles.statusTransitButton}
                  onPress={() => handleStatusChange(activeOrder, 'IN_TRANSIT')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="bicycle" size={16} color="#FFFFFF" />
                  <Text style={styles.statusButtonText}>Iniciar</Text>
                </TouchableOpacity>
              )}

              {activeOrder.status === 'IN_TRANSIT' && (
                <TouchableOpacity
                  style={styles.statusDeliveredButton}
                  onPress={() => handleStatusChange(activeOrder, 'DELIVERED')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="checkmark-done" size={16} color="#FFFFFF" />
                  <Text style={styles.statusButtonText}>Entregar</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  topHeader: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    zIndex: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    alignItems: 'center',
  },
  screenTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.secondary,
  },
  screenSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  filterChipsRow: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipActive: {
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.secondary,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  markerPin: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    gap: 3,
  },
  markerPinSelected: {
    borderColor: '#000000',
    transform: [{ scale: 1.15 }],
  },
  markerText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  bottomCardWrapper: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    zIndex: 10,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  stopBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  stopBadgeNumber: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.primary,
  },
  stopBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  customerInfo: {
    flex: 1,
    paddingRight: 10,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
  },
  locationIcon: {
    marginTop: 2,
  },
  addressText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
    flex: 1,
  },
  referenceText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontStyle: 'italic',
    marginTop: 2,
    marginLeft: 19,
  },
  quickContactsCol: {
    gap: 6,
  },
  circleContactBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  whatsappCircle: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  financialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  amountLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  amountValue: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  detailLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  detailLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  gpsPrimaryButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284C7',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    elevation: 2,
  },
  gpsButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  statusTransitButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.statusInTransit,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 4,
  },
  statusDeliveredButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.statusDelivered,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 4,
  },
  statusButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
