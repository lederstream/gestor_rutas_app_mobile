/**
 * ============================================================================
 * SCREEN: CustomerFormScreen.tsx
 * Formulario para Crear o Editar Cliente con Ubicación GPS
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/RootNavigator';
import { useCustomers } from '../context/CustomerContext';
import { COLORS, AVAILABLE_DISTRICTS, DISTRICT_COORDINATES } from '../utils/constants';
import { Header } from '../components/common/Header';
import { CustomInput } from '../components/common/CustomInput';
import { CustomButton } from '../components/common/CustomButton';
import { LocationPickerModal } from '../components/common/LocationPickerModal';
import { geocodeAddress } from '../services/geocodingService';
import { hapticImpact, hapticNotification, hapticSelection } from '../utils/haptics';

type Props = NativeStackScreenProps<RootStackParamList, 'CustomerFormScreen'>;

export const CustomerFormScreen: React.FC<Props> = ({ route, navigation }) => {
  const customerId = route.params?.customerId;
  const isEditing = Boolean(customerId);
  const { addCustomer, updateCustomer, getCustomerById } = useCustomers();

  // Estados del formulario
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [district, setDistrict] = useState('');
  const [addressReference, setAddressReference] = useState('');
  const [notes, setNotes] = useState('');
  const [latitude, setLatitude] = useState<number | undefined>(undefined);
  const [longitude, setLongitude] = useState<number | undefined>(undefined);

  // Estados de interfaz
  const [isGettingGps, setIsGettingGps] = useState(false);
  const [isMapModalVisible, setIsMapModalVisible] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Cargar cliente existente si estamos editando
  useEffect(() => {
    if (customerId) {
      const existing = getCustomerById(customerId);
      if (existing) {
        setName(existing.name);
        setPhone(existing.phone);
        setDeliveryAddress(existing.deliveryAddress);
        setDistrict(existing.district);
        setAddressReference(existing.addressReference || '');
        setNotes(existing.notes || '');
        setLatitude(existing.latitude);
        setLongitude(existing.longitude);
      }
    }
  }, [customerId, getCustomerById]);

  // Selección rápida de distrito
  const handleSelectDistrictChip = (dist: string) => {
    setDistrict(dist);
    // Si no tiene GPS fijado, podemos sugerir el centro del distrito
    if (!latitude && !longitude && DISTRICT_COORDINATES[dist]) {
      setLatitude(DISTRICT_COORDINATES[dist].latitude);
      setLongitude(DISTRICT_COORDINATES[dist].longitude);
    }
  };

  // Geolocalizar dirección con servicio centralizado
  const handleGeocodeAddress = async () => {
    if (!deliveryAddress.trim() && !district.trim()) {
      Alert.alert(
        'Ingresa una dirección',
        'Escribe primero la dirección y el distrito para geolocalizarla automáticamente.'
      );
      return;
    }

    setIsGettingGps(true);
    const result = await geocodeAddress(deliveryAddress, district);
    setIsGettingGps(false);

    if (result) {
      setLatitude(result.latitude);
      setLongitude(result.longitude);
      hapticNotification('success');
      Alert.alert(
        'Ubicación Fijada',
        result.isExact
          ? `Coordenadas obtenidas: ${result.latitude.toFixed(4)}, ${result.longitude.toFixed(4)}`
          : `Se fijaron las coordenadas del distrito de ${district}. Puedes afinarlas en el mapa interactivo.`
      );
    } else {
      hapticNotification('warning');
      Alert.alert(
        'Sin Coordenadas Exactas',
        'No se encontró la dirección exacta. Puedes fijar el pin directamente en el mapa interactivo.'
      );
    }
  };

  // Validación
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim() || name.trim().length < 2) {
      newErrors.name = 'Ingresa el nombre o razón social del cliente';
    }

    if (!phone.trim() || phone.replace(/\D/g, '').length < 6) {
      newErrors.phone = 'Ingresa un número telefónico válido (mín. 6 dígitos)';
    }

    if (!district.trim()) {
      newErrors.district = 'Indica la ciudad, distrito o zona';
    }

    if (!deliveryAddress.trim() || deliveryAddress.trim().length < 3) {
      newErrors.deliveryAddress = 'Ingresa la dirección de entrega';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) {
      Alert.alert('Datos Incompletos', 'Por favor completa los campos obligatorios en rojo.');
      return;
    }

    if (isEditing && customerId) {
      const existing = getCustomerById(customerId);
      if (existing) {
        updateCustomer({
          ...existing,
          name: name.trim(),
          phone: phone.trim(),
          deliveryAddress: deliveryAddress.trim(),
          district: district.trim(),
          addressReference: addressReference.trim() || undefined,
          notes: notes.trim() || undefined,
          latitude,
          longitude,
        });
        Alert.alert('Éxito', 'Cliente actualizado correctamente.', [
          { text: 'Aceptar', onPress: () => navigation.goBack() },
        ]);
      }
    } else {
      addCustomer({
        name: name.trim(),
        phone: phone.trim(),
        deliveryAddress: deliveryAddress.trim(),
        district: district.trim(),
        addressReference: addressReference.trim() || undefined,
        notes: notes.trim() || undefined,
        latitude,
        longitude,
      });
      Alert.alert('Éxito', 'Cliente registrado correctamente.', [
        { text: 'Aceptar', onPress: () => navigation.goBack() },
      ]);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      
      <Header
        title={isEditing ? 'Editar Cliente' : 'Nuevo Cliente'}
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Banner de Sección */}
        <View style={styles.sectionHeader}>
          <Ionicons name="person-circle-outline" size={24} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>Datos Principales</Text>
        </View>

        <CustomInput
          label="Nombre o Negocio *"
          placeholder="Ej. Bodega Santa Rosa / María García"
          value={name}
          onChangeText={setName}
          error={errors.name}
          icon="business-outline"
        />

        <CustomInput
          label="Teléfono / Celular / WhatsApp *"
          placeholder="Ej. 987654321"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          error={errors.phone}
          icon="call-outline"
        />

        {/* Sección de Ubicación */}
        <View style={[styles.sectionHeader, { marginTop: 16 }]}>
          <Ionicons name="location-outline" size={24} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>Dirección y Entrega</Text>
        </View>

        <CustomInput
          label="Distrito, Ciudad o Zona *"
          placeholder="Ej. Miraflores, San Borja, etc."
          value={district}
          onChangeText={setDistrict}
          error={errors.district}
          icon="navigate-circle-outline"
        />

        {/* Chips de Distritos Rápidos */}
        <View style={styles.chipsContainer}>
          <Text style={styles.chipsLabel}>Sugerencias rápidas:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
            {AVAILABLE_DISTRICTS.map((dist) => (
              <TouchableOpacity
                key={dist}
                style={[
                  styles.chip,
                  district.toLowerCase() === dist.toLowerCase() && styles.chipActive,
                ]}
                onPress={() => handleSelectDistrictChip(dist)}
              >
                <Text
                  style={[
                    styles.chipText,
                    district.toLowerCase() === dist.toLowerCase() && styles.chipTextActive,
                  ]}
                >
                  {dist}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <CustomInput
          label="Dirección de Entrega *"
          placeholder="Ej. Av. Primavera 1234, Dpto 401"
          value={deliveryAddress}
          onChangeText={setDeliveryAddress}
          error={errors.deliveryAddress}
          icon="home-outline"
        />

        <CustomInput
          label="Referencia de Ubicación"
          placeholder="Ej. Frente al colegio, reja blanca, timbre 2"
          value={addressReference}
          onChangeText={setAddressReference}
          icon="information-circle-outline"
        />

        <CustomInput
          label="Indicaciones Especiales / Notas"
          placeholder="Ej. Atiende por las mañanas, pedir firma de recepción"
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={2}
          icon="document-text-outline"
        />

        {/* Módulo GPS */}
        <View style={styles.gpsCard}>
          <View style={styles.gpsHeader}>
            <View style={styles.gpsTitleRow}>
              <Ionicons name="map" size={18} color={COLORS.primary} />
              <Text style={styles.gpsTitle}>Punto GPS en el Mapa</Text>
            </View>
            {latitude && longitude ? (
              <View style={styles.gpsBadgeReady}>
                <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
                <Text style={styles.gpsBadgeReadyText}>Ubicación Fijada</Text>
              </View>
            ) : (
              <Text style={styles.gpsBadgeMissing}>Sin Coordenadas</Text>
            )}
          </View>

          {latitude && longitude ? (
            <View style={styles.coordsBox}>
              <Text style={styles.coordsText}>
                Lat: {latitude.toFixed(5)}, Lon: {longitude.toFixed(5)}
              </Text>
              <TouchableOpacity
                style={styles.clearCoordsBtn}
                onPress={() => {
                  setLatitude(undefined);
                  setLongitude(undefined);
                }}
              >
                <Ionicons name="close-circle" size={16} color={COLORS.danger} />
                <Text style={styles.clearCoordsText}>Quitar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.gpsHelpText}>
              Fijar el GPS permitirá que tus choferes vean a este cliente en el mapa interactivo y
              abran la ruta directa en Google Maps / Waze.
            </Text>
          )}

          <View style={styles.gpsActions}>
            <TouchableOpacity
              style={styles.gpsSearchBtn}
              onPress={handleGeocodeAddress}
              disabled={isGettingGps}
            >
              {isGettingGps ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <>
                  <Ionicons name="locate-outline" size={16} color={COLORS.primary} />
                  <Text style={styles.gpsSearchBtnText}>Geolocalizar</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.gpsMapBtn}
              onPress={() => setIsMapModalVisible(true)}
            >
              <Ionicons name="map-outline" size={16} color={COLORS.textInverse} />
              <Text style={styles.gpsMapBtnText}>Fijar en Mapa</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Botón Guardar */}
        <CustomButton
          title={isEditing ? 'Actualizar Cliente' : 'Guardar Cliente'}
          icon="checkmark-circle"
          variant="primary"
          size="lg"
          onPress={handleSave}
          style={{ marginTop: 20 }}
          fullWidth
        />
      </ScrollView>

      {/* Modal de Mapa Interactivo */}
      <LocationPickerModal
        visible={isMapModalVisible}
        onClose={() => setIsMapModalVisible(false)}
        initialLatitude={latitude || -12.0984}
        initialLongitude={longitude || -77.0016}
        title={`Ubicación de ${name || 'Cliente'}`}
        onSelectLocation={({ latitude: lat, longitude: lng }: { latitude: number; longitude: number }) => {
          setLatitude(lat);
          setLongitude(lng);
          setIsMapModalVisible(false);
          Alert.alert('Coordenadas Asignadas', `Punto guardado: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.secondary,
  },
  chipsContainer: {
    marginBottom: 12,
  },
  chipsLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
    marginBottom: 6,
  },
  chipsScroll: {
    flexDirection: 'row',
  },
  chip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  chipTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  gpsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 8,
    marginBottom: 12,
  },
  gpsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  gpsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  gpsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.secondary,
  },
  gpsBadgeReady: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  gpsBadgeReadyText: {
    fontSize: 11,
    color: COLORS.success,
    fontWeight: '700',
  },
  gpsBadgeMissing: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  coordsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  coordsText: {
    fontSize: 12,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  clearCoordsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  clearCoordsText: {
    fontSize: 11,
    color: COLORS.danger,
    fontWeight: '600',
  },
  gpsHelpText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
    marginBottom: 12,
  },
  gpsActions: {
    flexDirection: 'row',
    gap: 10,
  },
  gpsSearchBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  gpsSearchBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  gpsMapBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.secondary,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  gpsMapBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textInverse,
  },
});
