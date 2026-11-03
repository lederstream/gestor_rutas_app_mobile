/**
 * ============================================================================
 * SCREEN: MapRouteScreen.tsx
 * Mapa de Rutas Ultra-Limpio con GPS Real en Tiempo Real y Sincronización Total
 * Integración con Servidores Esri World Street Map (Libre de 418) y expo-location
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
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { RootStackParamList } from '../navigation/RootNavigator';
import { useOrders } from '../context/OrderContext';
import { useCustomers } from '../context/CustomerContext';
import { Order, OrderStatus } from '../models/Order';
import { COLORS } from '../utils/constants';
import { calculateDistanceKm } from '../utils/routeOptimizer';
import { hapticImpact, hapticSelection, hapticNotification } from '../utils/haptics';

const { width } = Dimensions.get('window');

type Props = NativeStackScreenProps<RootStackParamList, 'MapRouteScreen'>;

export const MapRouteScreen: React.FC<Props> = ({ navigation }) => {
  const { orders, updateOrderStatus } = useOrders();
  const { customers } = useCustomers();
  const mapRef = useRef<WebView>(null);

  // Estado del GPS en vivo
  const [isLiveGpsActive, setIsLiveGpsActive] = useState(false);

  // Ubicación del conductor (inicia en Tacna Centro y se actualiza con el GPS real del teléfono)
  const [driverLocation, setDriverLocation] = useState({
    latitude: -18.0139,
    longitude: -70.2519,
  });

  // Pedido seleccionado para la tarjeta inferior
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // 1. Activar GPS Real del teléfono con expo-location
  useEffect(() => {
    let isMounted = true;
    let subscription: Location.LocationSubscription | null = null;

    const startLiveGps = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.log('Permiso de GPS no concedido');
          return;
        }

        // Obtener posición inicial exacta
        const currentLoc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        if (isMounted && currentLoc?.coords) {
          const newPos = {
            latitude: currentLoc.coords.latitude,
            longitude: currentLoc.coords.longitude,
          };
          setDriverLocation(newPos);
          setIsLiveGpsActive(true);
          setTimeout(() => {
            mapRef.current?.injectJavaScript(
              `window.updateDriverPos && window.updateDriverPos(${newPos.latitude}, ${newPos.longitude}); true;`
            );
          }, 600);
        }

        // Suscribirse a actualizaciones de movimiento en vivo sin saturar la pantalla
        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 5000,
            distanceInterval: 8,
          },
          (loc) => {
            if (isMounted && loc?.coords) {
              const updated = {
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
              };
              setDriverLocation(updated);
              setIsLiveGpsActive(true);
              mapRef.current?.injectJavaScript(
                `window.updateDriverPos && window.updateDriverPos(${updated.latitude}, ${updated.longitude}); true;`
              );
            }
          }
        );
      } catch (err) {
        console.warn('Error leyendo sensor GPS:', err);
      }
    };

    startLiveGps();

    return () => {
      isMounted = false;
      if (subscription) {
        subscription.remove();
      }
    };
  }, []);

  // 2. Órdenes con coordenadas GPS sincronizadas en tiempo real con los Clientes
  const mappedOrders = useMemo(() => {
    return orders
      .map((order, index) => {
        // Sincronizar de inmediato si el cliente tiene un pin guardado o actualizado
        const linkedCustomer = customers.find(
          (c) =>
            (order.customerId && c.id === order.customerId) ||
            c.name.trim().toLowerCase() === order.customerName.trim().toLowerCase()
        );

        const lat =
          typeof linkedCustomer?.latitude === 'number'
            ? linkedCustomer.latitude
            : order.latitude;
        const lng =
          typeof linkedCustomer?.longitude === 'number'
            ? linkedCustomer.longitude
            : order.longitude;

        return {
          ...order,
          latitude: lat as number,
          longitude: lng as number,
          stopIndex: index + 1,
        };
      })
      .filter(
        (o) => typeof o.latitude === 'number' && typeof o.longitude === 'number'
      );
  }, [orders, customers]);

  // 3. Cálculo de proximidad dinámica calculada contra la posición GPS REAL del chofer
  const mappedOrdersWithDistance = useMemo(() => {
    return mappedOrders.map((order) => {
      const distKm = calculateDistanceKm(
        driverLocation.latitude,
        driverLocation.longitude,
        order.latitude,
        order.longitude
      );
      const timeMin = Math.max(1, Math.round(distKm * 2.5));
      const distLabel =
        distKm < 1 ? `${Math.round(distKm * 1000)} m` : `${distKm.toFixed(1)} km`;
      return {
        ...order,
        distanceKm: distKm,
        distanceLabel: distLabel,
        estimatedTimeMin: timeMin,
      };
    });
  }, [mappedOrders, driverLocation]);

  // Pedido activo en foco
  const activeOrder = useMemo(() => {
    if (selectedOrder) {
      const found = mappedOrdersWithDistance.find((o) => o.id === selectedOrder.id);
      if (found) return found;
    }
    return (
      mappedOrdersWithDistance.find((o) => o.status === 'IN_TRANSIT') ||
      mappedOrdersWithDistance.find((o) => o.status === 'PENDING') ||
      mappedOrdersWithDistance[0] ||
      null
    );
  }, [selectedOrder, mappedOrdersWithDistance]);

  // Índice de la parada activa en el listado
  const currentIndex = useMemo(() => {
    if (!activeOrder) return 0;
    const idx = mappedOrdersWithDistance.findIndex((o) => o.id === activeOrder.id);
    return idx >= 0 ? idx : 0;
  }, [activeOrder, mappedOrdersWithDistance]);

  // Distancia del chofer a la parada activa
  const activeDistance = useMemo(() => {
    if (!activeOrder) return null;
    const distKm = calculateDistanceKm(
      driverLocation.latitude,
      driverLocation.longitude,
      activeOrder.latitude,
      activeOrder.longitude
    );
    const timeMin = Math.max(1, Math.round(distKm * 2.5));
    return {
      label: distKm < 1 ? `${Math.round(distKm * 1000)} m` : `${distKm.toFixed(1)} km`,
      timeMin,
    };
  }, [activeOrder, driverLocation]);

  // Cambiar a la parada anterior
  const handlePrevStop = () => {
    if (mappedOrdersWithDistance.length === 0) return;
    hapticSelection();
    const prevIdx =
      (currentIndex - 1 + mappedOrdersWithDistance.length) %
      mappedOrdersWithDistance.length;
    handleSelectStop(mappedOrdersWithDistance[prevIdx]);
  };

  // Cambiar a la siguiente parada
  const handleNextStop = () => {
    if (mappedOrdersWithDistance.length === 0) return;
    hapticSelection();
    const nextIdx = (currentIndex + 1) % mappedOrdersWithDistance.length;
    handleSelectStop(mappedOrdersWithDistance[nextIdx]);
  };

  // Seleccionar parada y enfocarla en el mapa
  const handleSelectStop = (order: Order) => {
    setSelectedOrder(order);
    if (typeof order.latitude === 'number' && typeof order.longitude === 'number') {
      mapRef.current?.injectJavaScript(
        `window.focusStop && window.focusStop('${order.id}', ${order.latitude}, ${order.longitude}); true;`
      );
    }
  };

  // Centrar en el chofer y ajustar todos los pines
  const handleFitAllPins = () => {
    hapticImpact('light');
    mapRef.current?.injectJavaScript(
      `window.fitAllPins && window.fitAllPins(); true;`
    );
  };

  // Recibir toque de un pin directamente desde el mapa
  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'SELECT_STOP' && data.orderId) {
        const found = mappedOrdersWithDistance.find((o) => o.id === data.orderId);
        if (found) {
          hapticSelection();
          setSelectedOrder(found);
        }
      }
    } catch {
      // Ignorar mensajes mal formateados
    }
  };

  // Iniciar Navegación GPS guiada por voz en la app oficial de Google Maps
  const handleOpenNavigation = (order: Order) => {
    hapticImpact('medium');
    let destination = '';
    if (typeof order.latitude === 'number' && typeof order.longitude === 'number') {
      destination = `${order.latitude},${order.longitude}`;
    } else {
      destination = encodeURIComponent(
        `${order.deliveryAddress}, ${order.district}, Tacna, Perú`
      );
    }

    const url = Platform.select({
      ios: `maps://?daddr=${destination}&dirflg=d`,
      android: `google.navigation:q=${destination}&mode=d`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${destination}`,
    });

    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) return Linking.openURL(url);
        return Linking.openURL(
          `https://www.google.com/maps/dir/?api=1&destination=${destination}`
        );
      })
      .catch(() => {
        Linking.openURL(
          `https://www.google.com/maps/dir/?api=1&destination=${destination}`
        );
      });
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
    hapticImpact('medium');
    updateOrderStatus(order.id, nextStatus);
  };

  // Clave única para evitar recargas del mapa al moverse el GPS (solo recarga si cambian las órdenes)
  const stopsKey = useMemo(() => {
    return mappedOrders
      .map((o) => `${o.id}_${o.status}_${o.latitude}_${o.longitude}`)
      .join('|');
  }, [mappedOrders]);

  // HTML interactivo de Leaflet utilizando Esri World Street Map (Libre de 418)
  const leafletHtml = useMemo(() => {
    const stopsJson = JSON.stringify(
      mappedOrders.map((o) => ({
        id: o.id,
        stopIndex: o.stopIndex,
        customerName: o.customerName,
        latitude: o.latitude,
        longitude: o.longitude,
        status: o.status,
      }))
    );

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html, body, #map { width:100%; height:100%; overflow:hidden; background-color:#E2E8F0; }
    
    .driver-pin {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .driver-bubble {
      background: #2563EB;
      color: #FFFFFF;
      font-weight: 800;
      font-size: 11px;
      padding: 5px 9px;
      border-radius: 14px;
      border: 2px solid #FFFFFF;
      box-shadow: 0 4px 10px rgba(0,0,0,0.35);
      white-space: nowrap;
      font-family: -apple-system, Roboto, sans-serif;
    }
    .driver-arrow {
      width: 0;
      height: 0;
      border-left: 5px solid transparent;
      border-right: 5px solid transparent;
      border-top: 6px solid #2563EB;
    }
    .driver-radar {
      width: 14px;
      height: 6px;
      background: rgba(37, 99, 235, 0.4);
      border-radius: 50%;
      margin-top: 1px;
    }

    .stop-pin {
      display: flex;
      flex-direction: column;
      align-items: center;
      cursor: pointer;
    }
    .stop-badge {
      width: 34px;
      height: 34px;
      border-radius: 17px;
      color: #FFFFFF;
      font-weight: 900;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2.5px solid #FFFFFF;
      box-shadow: 0 4px 10px rgba(0,0,0,0.35);
      font-family: -apple-system, Roboto, sans-serif;
    }
    .stop-tip {
      width: 0;
      height: 0;
      border-left: 5px solid transparent;
      border-right: 5px solid transparent;
      border-top: 6px solid #EA580C;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
  <script>
    var stops = ${stopsJson};
    var driverLat = -18.0139;
    var driverLng = -70.2519;

    var map = L.map('map', {
      zoomControl: false,
      attributionControl: false
    }).setView([driverLat, driverLng], 14);

    // Servidor Esri World Street Map: 100% libre, sin API key, sin error 418, excelente calidad en Tacna
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      attribution: 'Tiles &copy; Esri'
    }).addTo(map);

    // Marcador del Chofer con radar GPS
    var driverIcon = L.divIcon({
      className: '',
      html: '<div class="driver-pin"><div class="driver-bubble">🚚 Mi GPS en Vivo</div><div class="driver-arrow"></div><div class="driver-radar"></div></div>',
      iconSize: [130, 36],
      iconAnchor: [65, 32]
    });
    var driverMarker = L.marker([driverLat, driverLng], { icon: driverIcon }).addTo(map);

    var allMarkers = [driverMarker];
    var stopMarkers = {};

    stops.forEach(function(s) {
      var color = s.status === 'DELIVERED' ? '#10B981' : (s.status === 'IN_TRANSIT' ? '#3B82F6' : '#EA580C');
      var icon = L.divIcon({
        className: '',
        html: '<div class="stop-pin"><div class="stop-badge" style="background:' + color + ';">' + s.stopIndex + '</div><div class="stop-tip" style="border-top-color:' + color + ';"></div></div>',
        iconSize: [36, 42],
        iconAnchor: [18, 40]
      });

      var m = L.marker([s.latitude, s.longitude], { icon: icon }).addTo(map);
      m.on('click', function() {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'SELECT_STOP',
            orderId: s.id
          }));
        }
      });
      allMarkers.push(m);
      stopMarkers[s.id] = m;
    });

    if (allMarkers.length > 1) {
      var group = L.featureGroup(allMarkers);
      map.fitBounds(group.getBounds().pad(0.2));
    }

    window.updateDriverPos = function(lat, lng) {
      driverLat = lat;
      driverLng = lng;
      if (driverMarker) {
        driverMarker.setLatLng([lat, lng]);
      }
    };

    window.focusStop = function(orderId, lat, lng) {
      map.setView([lat, lng], 16, { animate: true });
    };

    window.fitAllPins = function() {
      if (allMarkers.length > 1) {
        var group = L.featureGroup(allMarkers);
        map.fitBounds(group.getBounds().pad(0.2));
      } else {
        map.setView([driverLat, driverLng], 15);
      }
    };

    window.centerOnDriver = function() {
      map.setView([driverLat, driverLng], 16, { animate: true });
    };
  </script>
</body>
</html>
`;
  }, [stopsKey]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* MAPA FULLSCREEN EN TODO EL FONDO */}
      <View style={StyleSheet.absoluteFillObject}>
        <WebView
          ref={mapRef}
          source={{
            html: leafletHtml,
            baseUrl: 'https://arcgisonline.com',
          }}
          originWhitelist={['*']}
          userAgent="GestorRutasMobile/1.0 (Linux; Android)"
          style={styles.map}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          allowFileAccess={true}
          scalesPageToFit={true}
          mixedContentMode="always"
          onMessage={handleWebViewMessage}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.mapLoadingOverlay}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.mapLoadingText}>Detectando GPS y mapa de Tacna...</Text>
            </View>
          )}
        />
      </View>

      {/* CABECERA MINIMALISTA FLOTANTE (Volver, Estado de GPS y Centrar) */}
      <View style={styles.topFloatingBar}>
        <TouchableOpacity
          style={styles.floatingRoundBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.secondary} />
        </TouchableOpacity>

        <View style={styles.topTitlePill}>
          <Ionicons
            name={isLiveGpsActive ? 'navigate' : 'location'}
            size={14}
            color={isLiveGpsActive ? '#16A34A' : COLORS.primary}
          />
          <Text style={styles.topTitlePillText}>
            {isLiveGpsActive ? 'GPS en Vivo' : 'Tacna'} • {mappedOrdersWithDistance.length} {mappedOrdersWithDistance.length === 1 ? 'Parada' : 'Paradas'}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.floatingRoundBtn}
          onPress={handleFitAllPins}
          activeOpacity={0.8}
        >
          <Ionicons name="scan" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* ESTADO VACÍO SI NO HAY PARADAS */}
      {mappedOrdersWithDistance.length === 0 && (
        <View style={styles.emptyMapOverlay}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="map-outline" size={32} color={COLORS.primary} />
          </View>
          <Text style={styles.emptyTitle}>No hay paradas en el mapa</Text>
          <Text style={styles.emptySubtitle}>
            Registra tu primer pedido con ubicación para visualizarlo en Tacna.
          </Text>
        </View>
      )}

      {/* TARJETA INFERIOR LIMPIA Y COMPACTA (Estilo Rappi / Uber) */}
      {activeOrder && (
        <View style={styles.bottomSheetWrapper}>
          <View style={styles.bottomCardClean}>
            {/* Fila 1: Paginación (< Parada 1 de 4 >) y Distancia calculada con GPS REAL */}
            <View style={styles.cardHeaderClean}>
              <View style={styles.stopPagination}>
                <TouchableOpacity
                  onPress={handlePrevStop}
                  style={styles.pageArrowBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-back" size={18} color={COLORS.secondary} />
                </TouchableOpacity>

                <View style={styles.stopNumberBadge}>
                  <Text style={styles.stopNumberText}>
                    Parada {currentIndex + 1} de {mappedOrdersWithDistance.length}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={handleNextStop}
                  style={styles.pageArrowBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-forward" size={18} color={COLORS.secondary} />
                </TouchableOpacity>
              </View>

              {activeDistance && (
                <View style={styles.proximityBadgeClean}>
                  <Ionicons name="navigate-outline" size={13} color="#0284C7" />
                  <Text style={styles.proximityTextClean}>
                    A {activeDistance.label} (~{activeDistance.timeMin} min)
                  </Text>
                </View>
              )}
            </View>

            {/* Fila 2: Nombre del Cliente, Dirección y Referencia */}
            <View style={styles.customerBlockClean}>
              <Text style={styles.customerNameClean} numberOfLines={1}>
                {activeOrder.customerName}
              </Text>
              <Text style={styles.customerAddressClean} numberOfLines={1}>
                📍 {activeOrder.deliveryAddress} ({activeOrder.district})
              </Text>
              {activeOrder.addressReference ? (
                <Text style={styles.customerRefClean} numberOfLines={1}>
                  Ref: {activeOrder.addressReference}
                </Text>
              ) : null}
            </View>

            {/* Fila 3: Los únicos botones esenciales para el chofer */}
            <View style={styles.cardActionsRowClean}>
              <TouchableOpacity
                style={styles.gpsPrimaryBtnClean}
                onPress={() => handleOpenNavigation(activeOrder)}
                activeOpacity={0.85}
              >
                <Ionicons name="navigate" size={18} color="#FFFFFF" />
                <Text style={styles.gpsBtnTextClean}>Navegar con GPS</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.iconCircleBtnClean}
                onPress={() =>
                  handleCall(activeOrder.customerPhone, activeOrder.customerName)
                }
                activeOpacity={0.8}
              >
                <Ionicons name="call" size={18} color={COLORS.primary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.iconCircleBtnClean, { backgroundColor: '#DCFCE7' }]}
                onPress={() =>
                  handleWhatsApp(
                    activeOrder.customerPhone,
                    activeOrder.customerName,
                    activeOrder.orderCode
                  )
                }
                activeOpacity={0.8}
              >
                <Ionicons name="logo-whatsapp" size={18} color="#16A34A" />
              </TouchableOpacity>

              {activeOrder.status === 'PENDING' && (
                <TouchableOpacity
                  style={styles.statusActionBtnClean}
                  onPress={() => handleStatusChange(activeOrder, 'IN_TRANSIT')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="bicycle" size={16} color="#FFFFFF" />
                  <Text style={styles.statusActionBtnText}>Iniciar</Text>
                </TouchableOpacity>
              )}

              {activeOrder.status === 'IN_TRANSIT' && (
                <TouchableOpacity
                  style={[
                    styles.statusActionBtnClean,
                    { backgroundColor: COLORS.success },
                  ]}
                  onPress={() => handleStatusChange(activeOrder, 'DELIVERED')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="checkmark-done" size={16} color="#FFFFFF" />
                  <Text style={styles.statusActionBtnText}>Entregar</Text>
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
    flex: 1,
  },
  mapLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  mapLoadingText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  topFloatingBar: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  floatingRoundBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  topTitlePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  topTitlePillText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.secondary,
  },
  emptyMapOverlay: {
    position: 'absolute',
    top: '40%',
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
    color: COLORS.secondary,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  bottomSheetWrapper: {
    position: 'absolute',
    bottom: 20,
    left: 14,
    right: 14,
    zIndex: 10,
  },
  bottomCardClean: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeaderClean: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  stopPagination: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pageArrowBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopNumberBadge: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stopNumberText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.secondary,
  },
  proximityBadgeClean: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  proximityTextClean: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0369A1',
  },
  customerBlockClean: {
    marginBottom: 14,
  },
  customerNameClean: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.secondary,
    marginBottom: 3,
  },
  customerAddressClean: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  customerRefClean: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontStyle: 'italic',
    marginTop: 2,
  },
  cardActionsRowClean: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gpsPrimaryBtnClean: {
    flex: 1.8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 14,
    elevation: 3,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  gpsBtnTextClean: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  iconCircleBtnClean: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusActionBtnClean: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: COLORS.secondary,
    paddingVertical: 12,
    borderRadius: 14,
  },
  statusActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
});
