/**
 * ============================================================================
 * COMPONENT: LocationPickerModal.tsx
 * Modal interactivo para colocar, mover y confirmar PINES de entrega en el mapa
 * ============================================================================
 */

import React, { useState, useRef, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_DEFAULT, Region } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../utils/constants';
import { geocodeAddress } from '../../services/geocodingService';
import { hapticImpact, hapticNotification, hapticSelection } from '../../utils/haptics';

const { width, height } = Dimensions.get('window');

// Región inicial por defecto (Lima Metropolitana / Centro)
const DEFAULT_COORDS = {
  latitude: -12.1118,
  longitude: -77.0342,
};

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
  const mapRef = useRef<MapView>(null);

  const [selectedCoord, setSelectedCoord] = useState<{
    latitude: number;
    longitude: number;
  }>({
    latitude: initialLatitude || DEFAULT_COORDS.latitude,
    longitude: initialLongitude || DEFAULT_COORDS.longitude,
  });

  const [searchQuery, setSearchQuery] = useState(addressHint);
  const [isSearching, setIsSearching] = useState(false);

  // Sincronizar si cambian las coordenadas iniciales al abrir
  useEffect(() => {
    if (visible) {
      const lat = initialLatitude || DEFAULT_COORDS.latitude;
      const lng = initialLongitude || DEFAULT_COORDS.longitude;
      setSelectedCoord({ latitude: lat, longitude: lng });
      if (addressHint) {
        setSearchQuery(addressHint);
      }
      setTimeout(() => {
        mapRef.current?.animateToRegion(
          {
            latitude: lat,
            longitude: lng,
            latitudeDelta: 0.015,
            longitudeDelta: 0.015,
          },
          400
        );
      }, 300);
    }
  }, [visible, initialLatitude, initialLongitude, addressHint]);

  // Manejar toque en el mapa para colocar el pin
  const handleMapPress = (e: any) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setSelectedCoord({ latitude, longitude });
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
      setSelectedCoord({ latitude: result.latitude, longitude: result.longitude });
      mapRef.current?.animateToRegion(
        {
          latitude: result.latitude,
          longitude: result.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        600
      );
      hapticNotification('success');
    } else {
      hapticNotification('warning');
      Alert.alert(
        'Dirección no encontrada',
        'No se hallaron coordenadas automáticas. Puedes navegar en el mapa y tocar directamente para colocar el pin.'
      );
    }
  };

  const handleConfirm = () => {
    onSelectLocation(selectedCoord);
    onClose();
  };

  const handleCenterOnPin = () => {
    mapRef.current?.animateToRegion(
      {
        latitude: selectedCoord.latitude,
        longitude: selectedCoord.longitude,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008,
      },
      400
    );
  };

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
              placeholder="Buscar calle, avenida o distrito..."
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
        </View>

        {/* Mapa Interactivo */}
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            provider={PROVIDER_DEFAULT}
            style={styles.map}
            initialRegion={{
              latitude: selectedCoord.latitude,
              longitude: selectedCoord.longitude,
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            }}
            onPress={handleMapPress}
            showsUserLocation={true}
            showsCompass={true}
          >
            <Marker
              coordinate={selectedCoord}
              draggable={true}
              onDragEnd={(e) => setSelectedCoord(e.nativeEvent.coordinate)}
              title="Punto de Entrega"
              description="Arrastra o toca para cambiar de lugar"
            >
              <View style={styles.customPinContainer}>
                <View style={styles.pinBubble}>
                  <Ionicons name="location" size={18} color="#FFFFFF" />
                  <Text style={styles.pinBubbleText}>ENTREGA</Text>
                </View>
                <View style={styles.pinArrow} />
                <View style={styles.pinShadow} />
              </View>
            </Marker>
          </MapView>

          {/* Ayuda Flotante */}
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
});
