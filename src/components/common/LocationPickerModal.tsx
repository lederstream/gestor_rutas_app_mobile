import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { COLORS } from '../../utils/constants';
import { geocodeAddress } from '../../services/geocodingService';
import { hapticImpact, hapticNotification, hapticSelection } from '../../utils/haptics';

const { width, height } = Dimensions.get('window');

// Región inicial por defecto (Tacna Centro / Paseo Cívico)
const DEFAULT_COORDS = {
  latitude: -18.0139,
  longitude: -70.2519,
};

// Distritos rápidos de Tacna para salto instantáneo del pin
const TACNA_DISTRICTS_QUICK = [
  { label: 'Tacna Centro', latitude: -18.0139, longitude: -70.2519 },
  { label: 'Gregorio Albarracín', latitude: -18.0450, longitude: -70.2600 },
  { label: 'Pocollay', latitude: -18.0050, longitude: -70.2300 },
  { label: 'Alto de la Alianza', latitude: -17.9980, longitude: -70.2520 },
  { label: 'Ciudad Nueva', latitude: -17.9920, longitude: -70.2450 },
];

export interface LocationPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectLocation: (coords: { latitude: number; longitude: number }) => void;
  initialLatitude?: number;
  initialLongitude?: number;
  title?: string;
  subtitle?: string;
  addressHint?: string;
}

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  visible,
  onClose,
  onSelectLocation,
  initialLatitude,
  initialLongitude,
  title = 'Colocar Pin de Entrega',
  subtitle = 'Toca en el mapa o arrastra el pin hasta el lugar exacto',
  addressHint = '',
}) => {
  const mapRef = useRef<WebView>(null);

  const [selectedCoord, setSelectedCoord] = useState<{
    latitude: number;
    longitude: number;
  }>({
    latitude: initialLatitude || DEFAULT_COORDS.latitude,
    longitude: initialLongitude || DEFAULT_COORDS.longitude,
  });

  const [searchQuery, setSearchQuery] = useState(addressHint);
  const [isSearching, setIsSearching] = useState(false);
  const [isGettingGps, setIsGettingGps] = useState(false);

  // Obtener la ubicación GPS real del celular y centrar el pin allí
  const handleUseCurrentGps = async () => {
    try {
      setIsGettingGps(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permiso de Ubicación',
          'Activa los permisos de ubicación en tu teléfono para detectar tu GPS en tiempo real.'
        );
        setIsGettingGps(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      if (loc?.coords) {
        updateMapPin(loc.coords.latitude, loc.coords.longitude);
        hapticNotification('success');
      }
    } catch {
      Alert.alert('GPS', 'No se pudo leer la ubicación del sensor GPS.');
    } finally {
      setIsGettingGps(false);
    }
  };

  // Sincronizar si cambian las coordenadas iniciales al abrir
  useEffect(() => {
    if (visible) {
      const lat = initialLatitude || DEFAULT_COORDS.latitude;
      const lng = initialLongitude || DEFAULT_COORDS.longitude;
      setSelectedCoord({ latitude: lat, longitude: lng });
      if (addressHint) {
        setSearchQuery(addressHint);
      }
      // Actualizar el pin en el mapa si el WebView ya estaba montado
      setTimeout(() => {
        mapRef.current?.injectJavaScript(`window.updatePin && window.updatePin(${lat}, ${lng}); true;`);
      }, 400);
    }
  }, [visible, initialLatitude, initialLongitude, addressHint]);

  // Actualizar coordenadas y sincronizar marcador del mapa
  const updateMapPin = (lat: number, lng: number) => {
    setSelectedCoord({ latitude: lat, longitude: lng });
    mapRef.current?.injectJavaScript(`window.updatePin && window.updatePin(${lat}, ${lng}); true;`);
  };

  // Ajuste fino direccional para mover el pin en el mapa de Tacna
  const handleNudge = (deltaLat: number, deltaLng: number) => {
    hapticSelection();
    const newLat = parseFloat((selectedCoord.latitude + deltaLat).toFixed(6));
    const newLng = parseFloat((selectedCoord.longitude + deltaLng).toFixed(6));
    updateMapPin(newLat, newLng);
  };

  // Buscar dirección con servicio centralizado
  const handleSearchAddress = async () => {
    if (!searchQuery.trim()) {
      Alert.alert('Buscar dirección', 'Escribe una dirección o distrito para buscar.');
      return;
    }

    setIsSearching(true);
    const result = await geocodeAddress(searchQuery.trim(), '');
    setIsSearching(false);

    if (result) {
      updateMapPin(result.latitude, result.longitude);
      hapticNotification('success');
    } else {
      hapticNotification('warning');
      Alert.alert(
        'Dirección no encontrada',
        'No se hallaron coordenadas automáticas. Toca directamente en el mapa para colocar el pin.'
      );
    }
  };

  const handleConfirm = () => {
    onSelectLocation(selectedCoord);
    onClose();
  };

  const handleCenterOnPin = () => {
    hapticImpact('light');
    updateMapPin(DEFAULT_COORDS.latitude, DEFAULT_COORDS.longitude);
  };

  // Manejador de eventos desde el mapa interactivo (tap en mapa o drag del pin)
  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'LOCATION_CHANGED' && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
        setSelectedCoord({
          latitude: parseFloat(data.latitude.toFixed(6)),
          longitude: parseFloat(data.longitude.toFixed(6)),
        });
        hapticSelection();
      }
    } catch {
      // Ignorar mensajes mal formateados
    }
  };

  // HTML interactivo de Leaflet + OpenStreetMap 100% libre sin API Keys
  const leafletPickerHtml = useMemo(() => {
    const lat = selectedCoord.latitude;
    const lng = selectedCoord.longitude;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html, body, #map { width:100%; height:100%; overflow:hidden; background-color:#F1F5F9; }
    .custom-pin {
      display: flex;
      flex-direction: column;
      align-items: center;
      cursor: pointer;
    }
    .pin-bubble {
      background: #EF4444;
      color: #FFFFFF;
      font-weight: 800;
      font-size: 11px;
      padding: 5px 10px;
      border-radius: 14px;
      border: 2px solid #FFFFFF;
      box-shadow: 0 4px 10px rgba(0,0,0,0.3);
      white-space: nowrap;
      font-family: -apple-system, Roboto, sans-serif;
    }
    .pin-arrow {
      width: 0;
      height: 0;
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-top: 8px solid #EF4444;
    }
    .pin-shadow {
      width: 14px;
      height: 6px;
      background: rgba(0, 0, 0, 0.25);
      border-radius: 50%;
      margin-top: 2px;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
  <script>
    var map = L.map('map', {
      zoomControl: true,
      attributionControl: false
    }).setView([${lat}, ${lng}], 16);

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      attribution: 'Tiles &copy; Esri'
    }).addTo(map);

    var pinIcon = L.divIcon({
      className: '',
      html: '<div class="custom-pin"><div class="pin-bubble">📍 Punto de Entrega</div><div class="pin-arrow"></div><div class="pin-shadow"></div></div>',
      iconSize: [140, 44],
      iconAnchor: [70, 40]
    });

    var marker = L.marker([${lat}, ${lng}], {
      icon: pinIcon,
      draggable: true
    }).addTo(map);

    function sendCoord(lat, lng) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'LOCATION_CHANGED',
          latitude: lat,
          longitude: lng
        }));
      }
    }

    marker.on('dragend', function() {
      var p = marker.getLatLng();
      sendCoord(p.lat, p.lng);
    });

    map.on('click', function(e) {
      marker.setLatLng(e.latlng);
      sendCoord(e.latlng.lat, e.latlng.lng);
    });

    window.updatePin = function(newLat, newLng) {
      marker.setLatLng([newLat, newLng]);
      map.setView([newLat, newLng], 16, { animate: true });
    };
  </script>
</body>
</html>
`;
  }, []); // Creado una sola vez para que el mapa no parpadee al moverse

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Cabecera Superior */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={24} color={COLORS.secondary} />
          </TouchableOpacity>

          <View style={styles.headerTextCol}>
            <Text style={styles.headerTitle}>{title}</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.centerBtn}
            onPress={handleCenterOnPin}
            activeOpacity={0.7}
          >
            <Ionicons name="locate" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Barra de Búsqueda de Ubicación */}
        <View style={styles.searchBarWrapper}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={COLORS.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar calle, avenida o distrito en Tacna..."
              placeholderTextColor={COLORS.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearchAddress}
              returnKeyType="search"
            />
            {isSearching ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <TouchableOpacity
                onPress={handleSearchAddress}
                style={styles.searchActionBtn}
              >
                <Text style={styles.searchActionText}>Buscar</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Accesos Rápidos a Distritos de Tacna y GPS en Vivo */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickDistrictsRow}
          >
            <TouchableOpacity
              style={styles.currentGpsChip}
              onPress={handleUseCurrentGps}
              activeOpacity={0.8}
            >
              {isGettingGps ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="navigate" size={13} color="#FFFFFF" />
                  <Text style={styles.currentGpsChipText}>Mi Ubicación GPS</Text>
                </>
              )}
            </TouchableOpacity>

            {TACNA_DISTRICTS_QUICK.map((d) => (
              <TouchableOpacity
                key={d.label}
                style={styles.quickDistChip}
                onPress={() => {
                  hapticImpact('light');
                  updateMapPin(d.latitude, d.longitude);
                }}
                activeOpacity={0.75}
              >
                <Ionicons name="location-outline" size={12} color={COLORS.primary} />
                <Text style={styles.quickDistText}>{d.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Mapa Interactivo con Leaflet + OpenStreetMap */}
        <View style={styles.mapContainer}>
          <WebView
            ref={mapRef}
            source={{
              html: leafletPickerHtml,
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
                <Text style={styles.mapLoadingText}>Cargando mapa de Tacna...</Text>
              </View>
            )}
          />

          {/* Ayuda flotante para indicar que se puede tocar la pantalla */}
          <View style={styles.helpPill}>
            <Ionicons name="finger-print" size={14} color="#0284C7" />
            <Text style={styles.helpPillText}>
              Toca cualquier calle o arrastra el PIN
            </Text>
          </View>
        </View>

        {/* Panel Inferior con Coordenadas y Confirmación */}
        <View style={styles.bottomCard}>
          <View style={styles.coordsRow}>
            <View style={styles.coordBox}>
              <Text style={styles.coordLabel}>Latitud</Text>
              <Text style={styles.coordValue}>
                {selectedCoord.latitude.toFixed(6)}
              </Text>
            </View>
            <View style={styles.coordDivider} />
            <View style={styles.coordBox}>
              <Text style={styles.coordLabel}>Longitud</Text>
              <Text style={styles.coordValue}>
                {selectedCoord.longitude.toFixed(6)}
              </Text>
            </View>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={handleConfirm}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
              <Text style={styles.confirmBtnText}>Fijar este Pin</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextCol: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.secondary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  centerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBarWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textPrimary,
    marginLeft: 8,
    marginRight: 8,
    paddingVertical: 0,
  },
  searchActionBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  searchActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  helpPill: {
    position: 'absolute',
    top: 14,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 6,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  helpPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
  },
  customPinContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
  },
  pinBubbleText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  pinArrow: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 0,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#EF4444',
  },
  pinShadow: {
    width: 14,
    height: 5,
    borderRadius: 7,
    backgroundColor: 'rgba(0,0,0,0.25)',
    marginTop: 2,
  },
  bottomCard: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  coordsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  coordBox: {
    alignItems: 'center',
  },
  coordLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  coordValue: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.secondary,
    marginTop: 2,
  },
  coordDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#CBD5E1',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 12,
  },
  cancelBtnText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
  confirmBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    elevation: 2,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  mapLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  mapLoadingText: {
    marginTop: 8,
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  nudgeContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 14,
    padding: 6,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  nudgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginVertical: 4,
  },
  nudgeBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    minWidth: 42,
  },
  nudgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 2,
  },
  quickDistrictsRow: {
    paddingTop: 8,
    gap: 6,
  },
  quickDistChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  quickDistText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  currentGpsChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0284C7',
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: 12,
  },
  currentGpsChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
