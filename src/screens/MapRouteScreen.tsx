/**
 * ============================================================================
 * SCREEN: MapRouteScreen.tsx
 * Mapa de Rutas Interactivo con vista de TODOS los pines de un solo vistazo
 * ============================================================================
 */

import React, { useState, useRef, useMemo, useEffect } from 'react';
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
import { COLORS } from '../utils/constants';
import { formatCurrency } from '../utils/formatters';
import { PriorityBadge } from '../components/orders/PriorityBadge';
import { getDynamicPriority } from '../utils/priorityHelper';
import { optimizeRouteOrder } from '../utils/routeOptimizer';
import { hapticImpact, hapticNotification, hapticSelection } from '../utils/haptics';

const { width } = Dimensions.get('window');

type Props = NativeStackScreenProps<RootStackParamList, 'MapRouteScreen'>;

// Región inicial por defecto
const DEFAULT_INITIAL_REGION: Region = {
  latitude: -12.1050,
  longitude: -77.0150,
  latitudeDelta: 0.15,
  longitudeDelta: 0.15,
};

export const MapRouteScreen: React.FC<Props> = ({ navigation }) => {
  const { orders, updateOrderStatus } = useOrders();
  const mapRef = useRef<MapView>(null);
  const isMapReadyRef = useRef(false);

  // Filtro de estado
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL'>('ALL');

  // Modo de optimización inteligente de paradas
  const [isRouteOptimized, setIsRouteOptimized] = useState(false);

  // Pedido seleccionado para preview
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Órdenes mapeadas con coordenadas válidas y secuencia calculada
  const { mappedOrders, totalDistanceKm } = useMemo(() => {
    const valid = orders.filter((o) => {
      if (statusFilter !== 'ALL' && o.status !== statusFilter) return false;
      return typeof o.latitude === 'number' && typeof o.longitude === 'number';
    });

    if (isRouteOptimized && valid.length > 1) {
      const { optimizedOrders, totalDistanceKm: distance } = optimizeRouteOrder(valid);
      return {
        mappedOrders: optimizedOrders.map((order) => ({
          ...order,
          latitude: order.latitude as number,
          longitude: order.longitude as number,
          stopIndex: order.stopNumber,
          dynamicInfo: getDynamicPriority(order),
        })),
        totalDistanceKm: distance,
      };
    }

    return {
      mappedOrders: valid.map((order, index) => ({
        ...order,
        latitude: order.latitude as number,
        longitude: order.longitude as number,
        stopIndex: index + 1,
        dynamicInfo: getDynamicPriority(order),
      })),
      totalDistanceKm: 0,
    };
  }, [orders, statusFilter, isRouteOptimized]);

  // Pedido activo en la tarjeta flotante inferior
  const activeOrder = useMemo(() => {
    if (selectedOrder) {
      const found = mappedOrders.find((o) => o.id === selectedOrder.id);
      if (found) return found;
    }
    return (
      mappedOrders.find((o) => o.status === 'IN_TRANSIT') ||
      mappedOrders.find((o) => o.status === 'PENDING') ||
      mappedOrders[0] ||
      null
    );
  }, [selectedOrder, mappedOrders]);

  // Función clave: Ajustar el mapa para mostrar TODOS los pines de un solo vistazo
  const handleFitAllPins = () => {
    if (!mapRef.current || mappedOrders.length === 0) return;

    const coordinates = mappedOrders.map((o) => ({
      latitude: o.latitude,
      longitude: o.longitude,
    }));

    if (coordinates.length === 1) {
      mapRef.current.animateToRegion(
        {
          latitude: coordinates[0].latitude,
          longitude: coordinates[0].longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        },
        500
      );
      return;
    }

    mapRef.current.fitToCoordinates(coordinates, {
      edgePadding: { top: 140, right: 60, bottom: 270, left: 60 },
      animated: true,
    });
  };

  // Ajustar cámara cuando el mapa esté listo y cuando cambien los pedidos
  const onMapReady = () => {
    isMapReadyRef.current = true;
    setTimeout(() => {
      handleFitAllPins();
    }, 400);
  };

  useEffect(() => {
    if (isMapReadyRef.current && mappedOrders.length > 0) {
      handleFitAllPins();
    }
  }, [mappedOrders.length, statusFilter]);

  // Navegar con GPS hacia la parada
  const handleOpenNavigation = (order: Order) => {
    const fullAddress = `${order.deliveryAddress}, ${order.district}`;
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
                if (supported) return Linking.openURL(url);
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

  const handleCall = (phone: string, name: string) => {
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('Llamar', `Llamar a ${name}: ${phone}`);
    });
  };

  const handleWhatsApp = (phone: string, name: string, code: string) => {
    const text = encodeURIComponent(
      `Hola ${name}, te saludamos de Gestor de Rutas. Estamos en camino con tu entrega ${code}.`
    );
    Linking.openURL(`https://wa.me/51${phone}?text=${text}`);
  };

  const handleStatusChange = (order: Order, nextStatus: OrderStatus) => {
    updateOrderStatus(order.id, nextStatus);
  };

  const initialRegion = useMemo(() => {
    if (mappedOrders.length > 0) {
      return {
        latitude: mappedOrders[0].latitude,
        longitude: mappedOrders[0].longitude,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      };
    }
    return DEFAULT_INITIAL_REGION;
  }, [mappedOrders]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Cabecera Flotante Superior */}
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
            <Text style={styles.screenTitle}>Mapa de Ruta Completa</Text>
            <Text style={styles.screenSubtitle}>
              {mappedOrders.length === 0
                ? 'Sin paradas con GPS'
                : `${mappedOrders.length} ${mappedOrders.length === 1 ? 'parada visible' : 'paradas visibles a la vez'}`}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleFitAllPins}
            activeOpacity={0.7}
          >
            <Ionicons name="expand" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Pestañas de Filtro */}
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
                  style={[styles.chip, isActive && styles.chipActive]}
                  onPress={() => setStatusFilter(status)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            }
          )}
        </View>

        {/* Botón de Optimización de Secuencia y Ajuste de Vista */}
        {mappedOrders.length > 1 && (
          <View style={styles.actionRowOptimization}>
            <TouchableOpacity
              style={[
                styles.optimizeRouteButton,
                isRouteOptimized && styles.optimizeRouteButtonActive,
              ]}
              onPress={() => {
                hapticImpact('medium');
                setIsRouteOptimized(!isRouteOptimized);
              }}
              activeOpacity={0.8}
            >
              <Ionicons
                name="flash"
                size={14}
                color={isRouteOptimized ? '#FFFFFF' : '#D97706'}
              />
              <Text
                style={[
                  styles.optimizeRouteButtonText,
                  isRouteOptimized && { color: '#FFFFFF' },
                ]}
              >
                {isRouteOptimized
                  ? `⚡ Paradas Optimizadas (~${totalDistanceKm} km)`
                  : '⚡ Optimizar Secuencia'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.fitAllButtonCompact}
              onPress={() => {
                hapticSelection();
                handleFitAllPins();
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="scan-outline" size={14} color="#0284C7" />
              <Text style={styles.fitAllButtonText}>Ajustar Vista</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Mapa Satelital / Vectorial */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation={true}
        showsCompass={true}
        loadingEnabled={true}
        onMapReady={onMapReady}
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
              description={`${order.deliveryAddress} (${order.district}) - ${order.dynamicInfo.timeLabel}`}
              onPress={() => {
                hapticSelection();
                setSelectedOrder(order);
              }}
              tracksViewChanges={false}
            >
              <View
                style={[
                  styles.markerPin,
                  { backgroundColor: statusColor },
                  isSelected && styles.markerPinSelected,
                ]}
              >
                <Text style={styles.markerText}>#{order.stopIndex}</Text>
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* Estado Vacío si no hay pedidos */}
      {mappedOrders.length === 0 && (
        <View style={styles.emptyMapOverlay}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="map-outline" size={32} color={COLORS.primary} />
          </View>
          <Text style={styles.emptyTitle}>No hay paradas en el mapa</Text>
          <Text style={styles.emptySubtitle}>
            Registra tu primer pedido con ubicación para visualizarlo con sus pines de ruta.
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => navigation.navigate('CreateOrderScreen')}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
            <Text style={styles.emptyButtonText}>Crear Pedido</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Tarjeta Flotante Inferior del Pedido Activo */}
      {activeOrder && (
        <View style={styles.bottomCardWrapper}>
          <View style={styles.card}>
            {/* Cabecera de la Parada */}
            <View style={styles.cardHeader}>
              <View style={styles.stopBadge}>
                <Text style={styles.stopBadgeNumber}>#{activeOrder.stopIndex}</Text>
                <Text style={styles.stopBadgeText}>
                  {activeOrder.status === 'IN_TRANSIT'
                    ? 'EN CAMINO'
                    : activeOrder.status === 'DELIVERED'
                    ? 'ENTREGADO'
                    : 'PARADA SIGUIENTE'}
                </Text>
              </View>

              {/* Urgencia Automática */}
              <View style={[styles.waitBadge, { backgroundColor: activeOrder.dynamicInfo.badgeBg }]}>
                <Ionicons name="time-outline" size={12} color={activeOrder.dynamicInfo.badgeColor} />
                <Text style={[styles.waitBadgeText, { color: activeOrder.dynamicInfo.badgeColor }]}>
                  {activeOrder.dynamicInfo.timeLabel}
                </Text>
              </View>
            </View>

            {/* Datos del Cliente y Dirección */}
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

              {/* Botones de Contacto */}
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

            {/* Cobro y Enlace de Detalle */}
            <View style={styles.financialRow}>
              <View>
                <Text style={styles.amountLabel}>Total a Cobrar</Text>
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
                <Text style={styles.detailLinkText}>Ver Detalle Completo</Text>
                <Ionicons
                  name="chevron-forward"
                  size={14}
                  color={COLORS.primary}
                />
              </TouchableOpacity>
            </View>

            {/* Botones de Acción para el Conductor */}
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
    left: 14,
    right: 14,
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
    marginBottom: 8,
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
    marginTop: 1,
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
  actionRowOptimization: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  optimizeRouteButton: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 8,
    paddingVertical: 7,
    gap: 5,
  },
  optimizeRouteButtonActive: {
    backgroundColor: '#D97706',
    borderColor: '#B45309',
  },
  optimizeRouteButtonText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400E',
  },
  fitAllButtonCompact: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 8,
    paddingVertical: 7,
    gap: 4,
  },
  fitAllButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  markerPin: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
  },
  markerPinSelected: {
    borderColor: '#0F172A',
    transform: [{ scale: 1.2 }],
  },
  markerText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  emptyMapOverlay: {
    position: 'absolute',
    top: '38%',
    left: 24,
    right: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  bottomCardWrapper: {
    position: 'absolute',
    bottom: 24,
    left: 14,
    right: 14,
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
  waitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  waitBadgeText: {
    fontSize: 11,
    fontWeight: '700',
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
