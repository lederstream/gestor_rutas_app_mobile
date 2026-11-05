import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions,
  Platform,
  Linking,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { RootStackParamList } from '../navigation/RootNavigator';
import { useAuth } from '../context/AuthContext';
import { useOrders } from '../context/OrderContext';
import { useCustomers } from '../context/CustomerContext';
import { Order, OrderStatus } from '../models/Order';
import { COLORS } from '../utils/constants';
import { formatCurrency } from '../utils/formatters';
import { calculateDistanceKm } from '../utils/routeOptimizer';
import { hapticImpact, hapticSelection, hapticNotification } from '../utils/haptics';
import { FloatingBottomDock } from '../components/common/FloatingBottomDock';

const { width } = Dimensions.get('window');

type Props = NativeStackScreenProps<RootStackParamList, 'MapRouteScreen'>;

export const MapRouteScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const { orders, updateOrderStatus } = useOrders();
  const { customers } = useCustomers();
  const mapRef = useRef<WebView>(null);

  const isAdmin = user?.role === 'ADMIN';
  const isDistributor = user?.role === 'DISTRIBUTOR';

  // Filtro de Categoría para el Administrador
  const [adminCategoryFilter, setAdminCategoryFilter] = useState<string>('ALL');
  const [isAdminCategoryModalVisible, setIsAdminCategoryModalVisible] = useState(false);

  const adminCategoryLabel = useMemo(() => {
    switch (adminCategoryFilter) {
      case 'WATER':
        return '💧 Agua';
      case 'GAS':
        return '🔥 Gas';
      case 'BAKERY':
        return '🥖 Panadería';
      case 'CLEANING':
        return '🧴 Limpieza';
      default:
        return '🌍 Todos';
    }
  }, [adminCategoryFilter]);

  // Estado del GPS en vivo
  const [isLiveGpsActive, setIsLiveGpsActive] = useState(false);

  // Ubicación del distribuidor (inicia en Tacna Centro y se actualiza con el GPS real del teléfono)
  const [driverLocation, setDriverLocation] = useState({
    latitude: -18.0139,
    longitude: -70.2519,
  });

  // Pedido seleccionado para la tarjeta inferior
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Estado del modal rápido de carga a descargar
  const [isCargoModalVisible, setIsCargoModalVisible] = useState(false);

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

  // 2. Filtrar órdenes según rol: el distribuidor solo ve su rubro especializado; el admin puede filtrar libremente
  const ordersForMap = useMemo(() => {
    if (isDistributor) {
      const specialty = user?.specialtyCategory || 'WATER';
      return orders.filter((o) => o.category === specialty);
    }
    if (isAdmin && adminCategoryFilter !== 'ALL') {
      return orders.filter((o) => o.category === adminCategoryFilter);
    }
    return orders;
  }, [orders, isDistributor, user, isAdmin, adminCategoryFilter]);

  // Órdenes con coordenadas GPS sincronizadas y Algoritmo Anti-Colisión de Pines
  const mappedOrders = useMemo(() => {
    const coordSeen = new Map<string, number>();

    return ordersForMap
      .map((order, index) => {
        // Buscar cliente por ID o por razón social
        const linkedCustomer = customers.find(
          (c) =>
            (order.customerId && c.id === order.customerId) ||
            c.name.trim().toLowerCase() === order.customerName.trim().toLowerCase()
        );

        // Prioridad 1: Coordenadas específicas asignadas a la orden
        // Prioridad 2: Coordenadas fijadas en el perfil del cliente
        // Prioridad 3: Tacna Centro (-18.0139, -70.2519)
        let lat =
          typeof order.latitude === 'number'
            ? order.latitude
            : typeof linkedCustomer?.latitude === 'number'
            ? linkedCustomer.latitude
            : -18.0139;

        let lng =
          typeof order.longitude === 'number'
            ? order.longitude
            : typeof linkedCustomer?.longitude === 'number'
            ? linkedCustomer.longitude
            : -70.2519;

        // Ajuste de marcadores:
        // Si dos pedidos coinciden en lat/lng (mismo local o clientes en la misma manzana),
        // aplicamos una micro-separación radial de ~20 metros para que NINGÚN PIN oculte al otro.
        const coordKey = `${lat.toFixed(4)}_${lng.toFixed(4)}`;
        const occurrences = coordSeen.get(coordKey) || 0;
        coordSeen.set(coordKey, occurrences + 1);

        if (occurrences > 0) {
          const angle = (occurrences * 90 * Math.PI) / 180;
          lat += Math.sin(angle) * 0.00022;
          lng += Math.cos(angle) * 0.00022;
        }

        return {
          ...order,
          latitude: lat,
          longitude: lng,
          stopIndex: index + 1,
        };
      })
      .filter(
        (o) => typeof o.latitude === 'number' && typeof o.longitude === 'number'
      );
  }, [ordersForMap, customers]);

  // 3. Cálculo de proximidad dinámica calculada contra la posición GPS REAL del distribuidor
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

  // Distancia del distribuidor a la parada activa
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

  // Cantidad total de unidades a descargar en esta parada
  const totalItemsQty = useMemo(() => {
    if (!activeOrder?.items) return 0;
    return activeOrder.items.reduce((sum, item) => sum + item.quantity, 0);
  }, [activeOrder]);

  // Resumen condensado de artículos para la vista colapsada
  const itemsSummaryText = useMemo(() => {
    if (!activeOrder?.items || activeOrder.items.length === 0) return 'Sin productos asignados';
    return activeOrder.items
      .map((it) => `${it.quantity}x ${it.name.split('(')[0].trim()}`)
      .join(', ');
  }, [activeOrder]);

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

  // Centrar en el distribuidor y ajustar todos los pines
  const handleFitAllPins = () => {
    hapticImpact('light');
    mapRef.current?.injectJavaScript(
      `window.fitAllPins && window.fitAllPins(); true;`
    );
  };

  const isMapReadyRef = useRef(false);

  // Actualizar marcadores en el mapa de Leaflet
  const syncStopsWithMap = useCallback(() => {
    if (!isMapReadyRef.current) return;
    const stopsPayload = mappedOrders.map((o) => ({
      id: o.id,
      stopIndex: o.stopIndex,
      customerName: o.customerName,
      latitude: o.latitude,
      longitude: o.longitude,
      status: o.status,
    }));
    mapRef.current?.injectJavaScript(
      `window.renderStops && window.renderStops(${JSON.stringify(stopsPayload)}); true;`
    );
  }, [mappedOrders]);

  // Actualizar pines cuando cambie el listado de órdenes o sus estados
  useEffect(() => {
    syncStopsWithMap();
  }, [syncStopsWithMap]);

  // Al regresar de otra pantalla (ej. finalizar entrega en OrderDetailScreen)
  useFocusEffect(
    useCallback(() => {
      // Forzar a Leaflet a recalcular sus dimensiones físicas de pantalla
      mapRef.current?.injectJavaScript(
        `window.map && window.map.invalidateSize(); true;`
      );
      syncStopsWithMap();
    }, [syncStopsWithMap])
  );

  // Recibir mensajes y toques de pines desde el mapa interactivo
  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'MAP_READY') {
        isMapReadyRef.current = true;
        syncStopsWithMap();
        return;
      }
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
    if (nextStatus === 'DELIVERED') {
      Alert.alert(
        'Confirmar Entrega Conforme 📦',
        `Cliente: ${order.customerName}\n` +
        `Total a cobrar: ${formatCurrency(order.totalAmount)} (${
          order.paymentMethod === 'CASH'
            ? '💵 Efectivo'
            : order.paymentMethod === 'YAPE_PLIN'
            ? '📱 Yape / Plin'
            : '💳 POS / Transferencia'
        })\n\n` +
        `¿Confirmas que los productos fueron entregados y se recibió el cobro conforme?`,
        [
          {
            text: 'Cancelar',
            style: 'cancel',
          },
          {
            text: 'Sí, Confirmar Entrega',
            style: 'default',
            onPress: () => {
              hapticImpact('heavy');
              updateOrderStatus(order.id, 'DELIVERED');
            },
          },
        ],
        { cancelable: true }
      );
      return;
    }

    hapticImpact('medium');
    updateOrderStatus(order.id, nextStatus);
  };

  // HTML interactivo de Leaflet persistente (Se inicializa una sola vez y NUNCA se destruye)
  const leafletHtml = useMemo(() => {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html, body, #map { width:100%; height:100%; overflow:hidden; background-color:#CBD5E1; }
    
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
    var map = null;
    var driverMarker = null;
    var stopMarkers = {};
    var driverLat = -18.0139;
    var driverLng = -70.2519;

    function initMap() {
      if (map) return;
      try {
        var container = L.DomUtil.get('map');
        if (container !== null) {
          container._leaflet_id = null;
        }

        map = L.map('map', {
          zoomControl: false,
          attributionControl: false
        }).setView([driverLat, driverLng], 14);

        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
          maxZoom: 19,
          attribution: 'Tiles &copy; Esri'
        }).addTo(map);

        var driverIcon = L.divIcon({
          className: '',
          html: '<div class="driver-pin"><div class="driver-bubble">🚚 Distribuidor</div><div class="driver-arrow"></div><div class="driver-radar"></div></div>',
          iconSize: [130, 36],
          iconAnchor: [65, 32]
        });
        driverMarker = L.marker([driverLat, driverLng], { icon: driverIcon }).addTo(map);

        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_READY' }));
        }
      } catch(err) {
        console.error('Error initMap:', err);
      }
    }

    // Renderizar o actualizar paradas sin recargar el DOM
    window.renderStops = function(stops) {
      if (!map) return;
      try {
        for (var id in stopMarkers) {
          if (stopMarkers[id]) {
            map.removeLayer(stopMarkers[id]);
          }
        }
        stopMarkers = {};

        var boundsList = [driverMarker];

        stops.forEach(function(s) {
          var isDelivered = s.status === 'DELIVERED';
          var color = isDelivered ? '#10B981' : (s.status === 'IN_TRANSIT' ? '#3B82F6' : '#EA580C');
          var badgeText = isDelivered ? '✓' : s.stopIndex;

          var icon = L.divIcon({
            className: '',
            html: '<div class="stop-pin"><div class="stop-badge" style="background:' + color + ';">' + badgeText + '</div><div class="stop-tip" style="border-top-color:' + color + ';"></div></div>',
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
          stopMarkers[s.id] = m;
          boundsList.push(m);
        });

        if (boundsList.length > 1) {
          var group = L.featureGroup(boundsList);
          map.fitBounds(group.getBounds().pad(0.2));
        }
      } catch(err) {
        console.error('Error renderStops:', err);
      }
    };

    window.updateDriverPos = function(lat, lng) {
      driverLat = lat;
      driverLng = lng;
      if (driverMarker) {
        driverMarker.setLatLng([lat, lng]);
      }
    };

    window.focusStop = function(orderId, lat, lng) {
      if (map) {
        map.setView([lat, lng], 16, { animate: true });
      }
    };

    window.fitAllPins = function() {
      if (!map) return;
      var markers = [driverMarker];
      for (var id in stopMarkers) {
        markers.push(stopMarkers[id]);
      }
      if (markers.length > 1) {
        var group = L.featureGroup(markers);
        map.fitBounds(group.getBounds().pad(0.2));
      } else {
        map.setView([driverLat, driverLng], 15);
      }
    };

    window.centerOnDriver = function() {
      if (map) {
        map.setView([driverLat, driverLng], 16, { animate: true });
      }
    };

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      setTimeout(initMap, 50);
    } else {
      document.addEventListener('DOMContentLoaded', initMap);
    }
  </script>
</body>
</html>
`;
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* MAPA FULLSCREEN EN TODO EL FONDO */}
      <View style={StyleSheet.absoluteFillObject}>
        <WebView
          ref={mapRef}
          key="tacna-persistent-map-webview"
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
          onLoadEnd={() => {
            isMapReadyRef.current = true;
            syncStopsWithMap();
          }}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.mapLoadingOverlay}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.mapLoadingText}>Detectando GPS y mapa de Tacna...</Text>
            </View>
          )}
        />
      </View>

      {/* CABECERA MINIMALISTA FLOTANTE (Volver, Píldora Central Unificada y Centrar) */}
      <View style={styles.topFloatingBar}>
        {navigation.canGoBack() && (
          <TouchableOpacity
            style={styles.floatingRoundBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={20} color={COLORS.secondary} />
          </TouchableOpacity>
        )}

        {/* Píldora Central: En Admin es interactiva (Combobox de rubro), en Distribuidor es informativa */}
        {isAdmin ? (
          <TouchableOpacity
            style={styles.topTitlePillInteractive}
            onPress={() => {
              hapticSelection();
              setIsAdminCategoryModalVisible(true);
            }}
            activeOpacity={0.82}
          >
            <Ionicons name="funnel" size={12} color={COLORS.primary} />
            <Text style={styles.topTitlePillText}>
              {adminCategoryLabel} • {mappedOrdersWithDistance.length} {mappedOrdersWithDistance.length === 1 ? 'parada' : 'paradas'}
            </Text>
            <Ionicons name="chevron-down" size={12} color="#64748B" />
          </TouchableOpacity>
        ) : (
          <View style={styles.topTitlePill}>
            <Ionicons
              name={isLiveGpsActive ? 'navigate' : 'location'}
              size={13}
              color={isLiveGpsActive ? '#16A34A' : COLORS.primary}
            />
            <Text style={styles.topTitlePillText}>
              {isLiveGpsActive ? 'GPS en Vivo' : 'Ruta'} • {mappedOrdersWithDistance.length} {mappedOrdersWithDistance.length === 1 ? 'parada' : 'paradas'}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.floatingRoundBtn}
          onPress={handleFitAllPins}
          activeOpacity={0.8}
        >
          <Ionicons name="scan" size={18} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* ESTADO VACÍO SI NO HAY PARADAS */}
      {mappedOrdersWithDistance.length === 0 && (
        <View style={styles.emptyMapOverlay}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="map-outline" size={32} color={COLORS.primary} />
          </View>
          <Text style={styles.emptyTitle}>No hay entregas en esta ruta</Text>
          <Text style={styles.emptySubtitle}>
            {isDistributor
              ? 'No tienes despachos pendientes de tu rubro en este momento.'
              : 'No hay pedidos activos registrados en la categoría seleccionada.'}
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

            {/* Fila 2: Nombre del Cliente, Dirección y Referencia + Botón Cuadrado de Pedido */}
            <View style={styles.customerBlockClean}>
              <View style={styles.customerInfoCol}>
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

              {/* Botón Cuadrado de Pedido (2 líneas: Ítems arriba, Monto abajo - abre Manifiesto) */}
              <TouchableOpacity
                style={styles.orderSquareBadgeBtn}
                onPress={() => {
                  hapticImpact('light');
                  setIsCargoModalVisible(true);
                }}
                activeOpacity={0.78}
              >
                <View style={styles.orderSquareTopRow}>
                  <Ionicons name="cube" size={11} color="#0284C7" />
                  <Text style={styles.orderSquareQtyText}>
                    {totalItemsQty} {totalItemsQty === 1 ? 'ítem' : 'ítems'}
                  </Text>
                </View>
                <Text style={styles.orderSquarePriceText}>
                  {formatCurrency(activeOrder.totalAmount)}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Fila 3: Botones esenciales para el distribuidor (4 botones amplios y respirables) */}
            <View style={styles.cardActionsRowClean}>
              <TouchableOpacity
                style={styles.gpsPrimaryBtnClean}
                onPress={() => handleOpenNavigation(activeOrder)}
                activeOpacity={0.85}
              >
                <Ionicons name="navigate" size={16} color="#FFFFFF" />
                <Text style={styles.gpsBtnTextClean}>GPS</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.iconCircleBtnClean}
                onPress={() =>
                  handleCall(activeOrder.customerPhone, activeOrder.customerName)
                }
                activeOpacity={0.8}
              >
                <Ionicons name="call" size={16} color={COLORS.primary} />
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
                <Ionicons name="logo-whatsapp" size={16} color="#16A34A" />
              </TouchableOpacity>

              {activeOrder.status === 'PENDING' && (
                <TouchableOpacity
                  style={styles.statusActionBtnClean}
                  onPress={() => handleStatusChange(activeOrder, 'IN_TRANSIT')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="bicycle" size={15} color="#FFFFFF" />
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
                  <Ionicons name="checkmark-done" size={15} color="#FFFFFF" />
                  <Text style={styles.statusActionBtnText}>Entregar</Text>
                </TouchableOpacity>
              )}

              {activeOrder.status === 'DELIVERED' && (
                <View style={styles.deliveredDoneBadge}>
                  <Ionicons name="checkmark-circle" size={15} color="#16A34A" />
                  <Text style={styles.deliveredDoneBadgeText}>Listo</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      )}

      {/* MODAL: MANIFIESTO RÁPIDO DE CARGA A DESCARGAR EN PARADA */}
      {activeOrder && (
        <Modal
          visible={isCargoModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsCargoModalVisible(false)}
        >
          <View style={styles.cargoModalBackdrop}>
            <TouchableOpacity
              style={styles.cargoModalDismissArea}
              activeOpacity={1}
              onPress={() => setIsCargoModalVisible(false)}
            />

            <View style={styles.cargoModalCard}>
              {/* Cabecera del Modal */}
              <View style={styles.cargoModalHeader}>
                <View style={styles.cargoModalIconBox}>
                  <Ionicons name="cube" size={20} color="#0284C7" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cargoModalTitle}>
                    Carga a Descargar
                  </Text>
                  <Text style={styles.cargoModalSubtitle} numberOfLines={1}>
                    Parada {currentIndex + 1} • {activeOrder.customerName}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.cargoModalCloseBtn}
                  onPress={() => setIsCargoModalVisible(false)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                style={styles.cargoModalScroll}
              >
                {/* Monto y Método de Pago */}
                <View style={styles.cargoPaymentSummaryBox}>
                  <View>
                    <Text style={styles.cargoPaymentSummaryLabel}>Monto a Cobrar</Text>
                    <Text style={styles.cargoPaymentSummaryAmount}>
                      {formatCurrency(activeOrder.totalAmount)}
                    </Text>
                  </View>
                  <View style={styles.cargoPaymentMethodPill}>
                    <Text style={styles.cargoPaymentMethodPillText}>
                      {activeOrder.paymentMethod === 'CASH'
                        ? '💵 Efectivo'
                        : activeOrder.paymentMethod === 'YAPE_PLIN'
                        ? '📱 Yape / Plin'
                        : '💳 POS / Transferencia'}
                    </Text>
                  </View>
                </View>

                {/* Aviso Instructivo de Billete y Vuelto si es Efectivo */}
                {activeOrder.paymentMethod === 'CASH' && activeOrder.amountPaid && activeOrder.amountPaid > activeOrder.totalAmount ? (
                  <View style={styles.cargoChangeAlertBox}>
                    <Ionicons name="swap-horizontal" size={16} color="#1D4ED8" />
                    <Text style={styles.cargoChangeAlertText}>
                      Paga con <Text style={{ fontWeight: '800' }}>{formatCurrency(activeOrder.amountPaid)}</Text> • Llevar vuelto: <Text style={{ fontWeight: '900', color: '#1D4ED8' }}>{formatCurrency(activeOrder.changeDue || (activeOrder.amountPaid - activeOrder.totalAmount))}</Text>
                    </Text>
                  </View>
                ) : null}

                {/* Lista de Productos Físicos a Bajar */}
                <Text style={styles.cargoSectionHeader}>
                  Productos a Bajar ({totalItemsQty} {totalItemsQty === 1 ? 'unidad' : 'unidades'})
                </Text>
                <View style={styles.cargoItemsCard}>
                  {activeOrder.items.map((item, idx) => (
                    <View key={item.id || idx} style={styles.cargoModalItemRow}>
                      <View style={styles.cargoModalItemQtyBadge}>
                        <Text style={styles.cargoModalItemQtyText}>{item.quantity}x</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cargoModalItemName}>{item.name}</Text>
                        {item.unit ? (
                          <Text style={styles.cargoModalItemUnit}>{item.unit}</Text>
                        ) : null}
                      </View>
                      <Text style={styles.cargoModalItemPrice}>
                        {formatCurrency(item.unitPrice * item.quantity)}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Envases de Retorno si aplica */}
                {(activeOrder.returnedContainers || 0) > 0 && (
                  <View style={styles.cargoModalReturnAlert}>
                    <Ionicons name="repeat" size={18} color="#D97706" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cargoModalReturnTitle}>
                        Exigir Envases de Retorno
                      </Text>
                      <Text style={styles.cargoModalReturnSubtitle}>
                        Recoger {activeOrder.returnedContainers} envases vacíos antes de entregar la carga.
                      </Text>
                    </View>
                  </View>
                )}

                {/* Notas de Entrega */}
                {activeOrder.notes ? (
                  <View style={styles.cargoModalNotesBox}>
                    <Ionicons name="document-text-outline" size={16} color="#475569" />
                    <Text style={styles.cargoModalNotesText}>
                      Nota: {activeOrder.notes}
                    </Text>
                  </View>
                ) : null}
              </ScrollView>

              {/* Botón de Cierre Rápido */}
              <TouchableOpacity
                style={styles.cargoModalDoneBtn}
                onPress={() => setIsCargoModalVisible(false)}
                activeOpacity={0.88}
              >
                <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                <Text style={styles.cargoModalDoneBtnText}>Listo, Volver al Mapa</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* MODAL SELECTOR DE CATEGORÍA PARA EL MAPA (SOLO ADMIN) */}
      {isAdmin && (
        <Modal
          visible={isAdminCategoryModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsAdminCategoryModalVisible(false)}
        >
          <View style={styles.mapFilterBackdrop}>
            <TouchableOpacity
              style={styles.mapFilterDismissArea}
              activeOpacity={1}
              onPress={() => setIsAdminCategoryModalVisible(false)}
            />
            <View style={styles.mapFilterSheetCard}>
              <View style={styles.mapFilterSheetHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="funnel" size={18} color={COLORS.primary} />
                  <Text style={styles.mapFilterSheetTitle}>Filtrar Rutas en el Mapa</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setIsAdminCategoryModalVisible(false)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              {[
                { id: 'ALL', label: '🌍 Todos los Rubros' },
                { id: 'WATER', label: '💧 Agua Purificada' },
                { id: 'GAS', label: '🔥 Gas Doméstico' },
                { id: 'BAKERY', label: '🥖 Panadería y Pastelería' },
                { id: 'CLEANING', label: '🧴 Productos de Limpieza' },
              ].map((cat) => {
                const isSelected = adminCategoryFilter === cat.id;
                const count =
                  cat.id === 'ALL'
                    ? orders.length
                    : orders.filter((o) => o.category === cat.id).length;

                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.mapFilterOptionRow,
                      isSelected && styles.mapFilterOptionRowActive,
                    ]}
                    onPress={() => {
                      hapticImpact('light');
                      setAdminCategoryFilter(cat.id);
                      setIsAdminCategoryModalVisible(false);
                    }}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.mapFilterOptionLabel,
                        isSelected && styles.mapFilterOptionLabelActive,
                      ]}
                    >
                      {cat.label}
                    </Text>
                    <View
                      style={[
                        styles.mapFilterCountBadge,
                        isSelected && styles.mapFilterCountBadgeActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.mapFilterCountBadgeText,
                          isSelected && styles.mapFilterCountBadgeTextActive,
                        ]}
                      >
                        {count}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </Modal>
      )}

      {/* Dock de Navegación Flotante en Burbujas */}
      <FloatingBottomDock activeTab="MAP" navigation={navigation} />
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
    top: Platform.OS === 'ios' ? 52 : 44,
    left: 14,
    right: 14,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  floatingRoundBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  topTitlePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  topTitlePillInteractive: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  topTitlePillText: {
    fontSize: 12.5,
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
    bottom: Platform.OS === 'ios' ? 76 : 64,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 10,
  },
  customerInfoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  customerNameClean: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.secondary,
    marginBottom: 2,
  },
  customerAddressClean: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  customerRefClean: {
    fontSize: 11.5,
    color: COLORS.textMuted,
    fontStyle: 'italic',
    marginTop: 2,
  },
  orderSquareBadgeBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: '#BAE6FD',
    minWidth: 76,
  },
  orderSquareTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 2,
  },
  orderSquareQtyText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  orderSquarePriceText: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#0F172A',
  },
  cargoModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  cargoModalDismissArea: {
    flex: 1,
  },
  cargoModalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '75%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 20,
  },
  cargoModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  cargoModalIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cargoModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  cargoModalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  cargoModalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cargoModalScroll: {
    marginBottom: 16,
  },
  cargoPaymentSummaryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  cargoPaymentSummaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  cargoPaymentSummaryAmount: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.primary,
    marginTop: 2,
  },
  cargoPaymentMethodPill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  cargoPaymentMethodPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0369A1',
  },
  cargoChangeAlertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
  },
  cargoChangeAlertText: {
    fontSize: 12,
    color: '#1E40AF',
    flex: 1,
  },
  cargoSectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  cargoItemsCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    gap: 10,
  },
  cargoModalItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cargoModalItemQtyBadge: {
    backgroundColor: '#E0F2FE',
    minWidth: 32,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  cargoModalItemQtyText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0284C7',
  },
  cargoModalItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  cargoModalItemUnit: {
    fontSize: 11,
    color: '#64748B',
  },
  cargoModalItemPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
  },
  cargoModalReturnAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 12,
  },
  cargoModalReturnTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#B45309',
  },
  cargoModalReturnSubtitle: {
    fontSize: 11.5,
    color: '#92400E',
    marginTop: 2,
  },
  cargoModalNotesBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#F1F5F9',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  cargoModalNotesText: {
    fontSize: 12,
    color: '#475569',
    fontStyle: 'italic',
    flex: 1,
  },
  cargoModalDoneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 14,
  },
  cargoModalDoneBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  cardActionsRowClean: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gpsPrimaryBtnClean: {
    flex: 1.1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
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
    flex: 1.9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: COLORS.secondary,
    paddingVertical: 12,
    borderRadius: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  statusActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  mapFilterBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  mapFilterDismissArea: {
    flex: 1,
  },
  mapFilterSheetCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 18,
    paddingBottom: Platform.OS === 'ios' ? 34 : 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 16,
  },
  mapFilterSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  mapFilterSheetTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.secondary,
  },
  mapFilterOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  mapFilterOptionRowActive: {
    backgroundColor: '#EFF6FF',
  },
  mapFilterOptionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  mapFilterOptionLabelActive: {
    fontWeight: '800',
    color: COLORS.primary,
  },
  mapFilterCountBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  mapFilterCountBadgeActive: {
    backgroundColor: '#DBEAFE',
  },
  mapFilterCountBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
  },
  mapFilterCountBadgeTextActive: {
    color: COLORS.primary,
  },
  deliveredDoneBadge: {
    flex: 1.9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#DCFCE7',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  deliveredDoneBadgeText: {
    color: '#15803D',
    fontWeight: '800',
    fontSize: 12.5,
  },
});
