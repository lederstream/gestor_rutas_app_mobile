/**
 * ============================================================================
 * SCREEN: CreateOrderScreen.tsx
 * Formulario 100% dinámico: Cualquier producto/servicio, precio libre y cualquier ciudad
 * ============================================================================
 */

import React, { useState } from 'react';
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
import * as Location from 'expo-location';
import { RootStackParamList } from '../navigation/RootNavigator';
import { useOrders } from '../context/OrderContext';
import { Order, PaymentMethod } from '../models/Order';
import { COLORS, PAYMENT_METHOD_CONFIG } from '../utils/constants';
import { formatCurrency } from '../utils/formatters';
import { Header } from '../components/common/Header';
import { CustomInput } from '../components/common/CustomInput';
import { CustomButton } from '../components/common/CustomButton';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateOrderScreen'>;

export const CreateOrderScreen: React.FC<Props> = ({ navigation }) => {
  const { addOrder } = useOrders();

  // Cliente
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // Ubicación libre (cualquier ciudad o país)
  const [district, setDistrict] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [addressReference, setAddressReference] = useState('');
  const [latitude, setLatitude] = useState<number | undefined>(undefined);
  const [longitude, setLongitude] = useState<number | undefined>(undefined);
  const [isGettingGps, setIsGettingGps] = useState(false);

  // Producto / Servicio libre
  const [productName, setProductName] = useState('');
  const [unit, setUnit] = useState('unidad');
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState('');

  // Operaciones
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [scheduledTime, setScheduledTime] = useState('');
  const [notes, setNotes] = useState('');

  // Errores
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Helpers de cantidad
  const handleIncrement = () => setQuantity((prev) => prev + 1);
  const handleDecrement = () => setQuantity((prev) => (prev > 1 ? prev - 1 : 1));

  // Cálculo de total
  const parsedPrice = parseFloat(unitPrice) || 0;
  const totalCalculated = quantity * parsedPrice;

  // Obtener ubicación GPS actual del dispositivo
  const handleGetLocation = async () => {
    setIsGettingGps(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permiso Denegado',
          'Se necesita permiso de ubicación para fijar el punto GPS en el mapa.'
        );
        setIsGettingGps(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setLatitude(loc.coords.latitude);
      setLongitude(loc.coords.longitude);

      // Intento de geocodificación inversa para autollenar dirección si está vacía
      try {
        const reverse = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });

        if (reverse && reverse.length > 0) {
          const item = reverse[0];
          if (!deliveryAddress && (item.street || item.name)) {
            setDeliveryAddress(`${item.street || item.name} ${item.streetNumber || ''}`.trim());
          }
          if (!district && (item.district || item.city || item.subregion)) {
            setDistrict(item.district || item.city || item.subregion || '');
          }
        }
      } catch {
        // Fallback silencioso
      }

      Alert.alert(
        'GPS Capturado con Éxito',
        `Punto fijado en: ${loc.coords.latitude.toFixed(4)}, ${loc.coords.longitude.toFixed(4)}`
      );
    } catch {
      Alert.alert(
        'Error de GPS',
        'No se pudo obtener la posición actual. Puedes ingresar la dirección manualmente.'
      );
    } finally {
      setIsGettingGps(false);
    }
  };

  // Validación
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!customerName.trim() || customerName.trim().length < 2) {
      newErrors.customerName = 'Ingresa el nombre o negocio del cliente';
    }

    if (!customerPhone.trim() || customerPhone.replace(/\D/g, '').length < 6) {
      newErrors.customerPhone = 'Ingresa un número telefónico válido (mín. 6 dígitos)';
    }

    if (!district.trim()) {
      newErrors.district = 'Indica la ciudad, distrito o zona (ej. Centro, Cayma, Miraflores)';
    }

    if (!deliveryAddress.trim() || deliveryAddress.trim().length < 3) {
      newErrors.deliveryAddress = 'Ingresa la dirección o punto de entrega';
    }

    if (!productName.trim()) {
      newErrors.productName = 'Ingresa el nombre de tu producto o servicio';
    }

    if (!unitPrice || parsedPrice <= 0) {
      newErrors.unitPrice = 'El precio unitario debe ser mayor a 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Datos Incompletos', 'Por favor revisa los campos señalados en rojo.');
      return;
    }

    let finalLat = latitude;
    let finalLng = longitude;

    // Si no se capturó por GPS, intentar geocodificar la dirección escrita
    if (!finalLat || !finalLng) {
      try {
        const query = `${deliveryAddress}, ${district}`;
        const geocoded = await Location.geocodeAsync(query);
        if (geocoded && geocoded.length > 0) {
          finalLat = geocoded[0].latitude;
          finalLng = geocoded[0].longitude;
        }
      } catch {
        // Fallback si no hay internet o falla geocodificación
      }
    }

    // Código aleatorio legible
    const newOrderCode = `PED-${Math.floor(1000 + Math.random() * 9000)}`;

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      orderCode: newOrderCode,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      deliveryAddress: deliveryAddress.trim(),
      district: district.trim(),
      addressReference: addressReference.trim() || undefined,
      category: 'GENERAL',
      items: [
        {
          id: `item-${Date.now()}`,
          name: productName.trim(),
          quantity,
          unitPrice: parsedPrice,
          unit: unit.trim() || 'unidad',
        },
      ],
      totalAmount: totalCalculated,
      paymentMethod,
      paymentStatus: 'PENDING',
      priority: 'NORMAL', // El sistema la escalará automáticamente con el tiempo
      status: 'PENDING',
      scheduledTime: scheduledTime.trim() || undefined,
      notes: notes.trim() || undefined,
      latitude: finalLat,
      longitude: finalLng,
      createdAt: new Date().toISOString(),
    };

    addOrder(newOrder);

    Alert.alert(
      '¡Pedido Creado con Éxito!',
      `Se registró el pedido ${newOrderCode} para ${customerName} por ${formatCurrency(totalCalculated)}.`,
      [
        {
          text: 'Continuar',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      <Header
        title="Nuevo Pedido / Servicio"
        subtitle="Registra tus productos, precios y clientes a medida"
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Sección 1: Cliente */}
        <View style={styles.formSection}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="person-circle-outline" size={18} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Datos del Cliente</Text>
          </View>

          <CustomInput
            label="Nombre del Cliente o Negocio *"
            value={customerName}
            onChangeText={(text) => {
              setCustomerName(text);
              if (errors.customerName) setErrors({ ...errors, customerName: '' });
            }}
            placeholder="Ej. Juan Pérez, Bodega La Esquina, etc."
            icon="person-outline"
            error={errors.customerName}
          />

          <CustomInput
            label="Teléfono o WhatsApp *"
            value={customerPhone}
            onChangeText={(text) => {
              setCustomerPhone(text);
              if (errors.customerPhone) setErrors({ ...errors, customerPhone: '' });
            }}
            placeholder="Ej. 987654321"
            icon="call-outline"
            keyboardType="phone-pad"
            error={errors.customerPhone}
          />
        </View>

        {/* Sección 2: Ubicación libre */}
        <View style={styles.formSection}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="location-outline" size={18} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Lugar de Entrega o Visita</Text>
          </View>

          <CustomInput
            label="Ciudad, Distrito o Zona *"
            value={district}
            onChangeText={(text) => {
              setDistrict(text);
              if (errors.district) setErrors({ ...errors, district: '' });
            }}
            placeholder="Ej. Arequipa, Surco, Centro, Trujillo, etc."
            icon="business-outline"
            error={errors.district}
          />

          <CustomInput
            label="Dirección Exacta *"
            value={deliveryAddress}
            onChangeText={(text) => {
              setDeliveryAddress(text);
              if (errors.deliveryAddress) setErrors({ ...errors, deliveryAddress: '' });
            }}
            placeholder="Ej. Calle Los Pinos 234, Dpto 3B"
            icon="map-outline"
            error={errors.deliveryAddress}
          />

          <CustomInput
            label="Referencia de Llegada"
            value={addressReference}
            onChangeText={setAddressReference}
            placeholder="Ej. Casa verde con reja negra, frente al parque"
            icon="compass-outline"
          />

          {/* Botón GPS */}
          <TouchableOpacity
            style={[styles.gpsPickButton, latitude ? styles.gpsPickButtonActive : null]}
            onPress={handleGetLocation}
            disabled={isGettingGps}
            activeOpacity={0.8}
          >
            {isGettingGps ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons
                name={latitude ? 'checkmark-circle' : 'locate-outline'}
                size={18}
                color="#FFFFFF"
              />
            )}
            <Text style={styles.gpsPickButtonText}>
              {isGettingGps
                ? 'Obteniendo GPS...'
                : latitude
                ? `Punto GPS Fijado (${latitude.toFixed(3)}, ${longitude?.toFixed(3)})`
                : 'Fijar mi ubicación GPS actual en el mapa'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Sección 3: Tu Producto o Servicio y Precios */}
        <View style={styles.formSection}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="pricetag-outline" size={18} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Producto o Servicio a Ofrecer</Text>
          </View>

          <CustomInput
            label="¿Qué vas a entregar o realizar? *"
            value={productName}
            onChangeText={(text) => {
              setProductName(text);
              if (errors.productName) setErrors({ ...errors, productName: '' });
            }}
            placeholder="Ej. Pastel de Fresas, Servicio Técnico, etc."
            icon="cube-outline"
            error={errors.productName}
          />

          <View style={styles.productDetailsRow}>
            {/* Precio Unitario */}
            <View style={styles.halfCol}>
              <CustomInput
                label="Precio Unitario *"
                value={unitPrice}
                onChangeText={(text) => {
                  setUnitPrice(text);
                  if (errors.unitPrice) setErrors({ ...errors, unitPrice: '' });
                }}
                placeholder="0.00"
                icon="cash-outline"
                keyboardType="numeric"
                error={errors.unitPrice}
              />
            </View>

            {/* Presentación / Unidad */}
            <View style={styles.halfCol}>
              <CustomInput
                label="Presentación / Unidad"
                value={unit}
                onChangeText={setUnit}
                placeholder="unidad, servicio, kg..."
                icon="layers-outline"
              />
            </View>
          </View>

          {/* Contador de Cantidad */}
          <View style={styles.quantityContainer}>
            <Text style={styles.quantityLabel}>Cantidad de Unidades</Text>
            <View style={styles.stepperWrapper}>
              <TouchableOpacity
                style={styles.stepBtn}
                onPress={handleDecrement}
                activeOpacity={0.7}
              >
                <Ionicons name="remove" size={18} color={COLORS.primary} />
              </TouchableOpacity>
              <Text style={styles.quantityValue}>{quantity}</Text>
              <TouchableOpacity
                style={styles.stepBtn}
                onPress={handleIncrement}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={18} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Subtotal en vivo */}
          <View style={styles.subtotalBanner}>
            <Text style={styles.subtotalLabel}>Total a Cobrar:</Text>
            <Text style={styles.subtotalValue}>{formatCurrency(totalCalculated)}</Text>
          </View>
        </View>

        {/* Sección 4: Método de Pago y Horario */}
        <View style={styles.formSection}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="wallet-outline" size={18} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Cobranza y Horario</Text>
          </View>

          <Text style={styles.fieldLabel}>Método de Pago</Text>
          <View style={styles.paymentMethodsRow}>
            {(['CASH', 'YAPE_PLIN', 'CARD_POS', 'TRANSFER'] as PaymentMethod[]).map(
              (pm) => {
                const config = PAYMENT_METHOD_CONFIG[pm];
                const isSelected = paymentMethod === pm;
                return (
                  <TouchableOpacity
                    key={pm}
                    style={[styles.paymentMethodChip, isSelected && styles.paymentMethodActive]}
                    onPress={() => setPaymentMethod(pm)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={config.icon as any}
                      size={15}
                      color={isSelected ? '#FFFFFF' : COLORS.textSecondary}
                    />
                    <Text
                      style={[
                        styles.paymentMethodText,
                        isSelected && styles.paymentMethodTextActive,
                      ]}
                    >
                      {config.label.split('/')[0]}
                    </Text>
                  </TouchableOpacity>
                );
              }
            )}
          </View>

          <CustomInput
            label="Horario Programado (Opcional)"
            value={scheduledTime}
            onChangeText={setScheduledTime}
            placeholder="Ej. Mañana 10:00 AM, Urgente, etc."
            icon="alarm-outline"
            containerStyle={{ marginTop: 12 }}
          />

          <CustomInput
            label="Notas Adicionales"
            value={notes}
            onChangeText={setNotes}
            placeholder="Indicaciones para el conductor o despacho..."
            icon="document-text-outline"
            multiline
            numberOfLines={2}
          />
        </View>

        {/* Notificación de Prioridad Automática */}
        <View style={styles.autoPriorityNotice}>
          <Ionicons name="flash" size={18} color="#D97706" />
          <View style={styles.autoPriorityTextCol}>
            <Text style={styles.autoPriorityTitle}>Prioridad Inteligente Activa</Text>
            <Text style={styles.autoPrioritySubtitle}>
              No te preocupes por clasificar la urgencia: el sistema elevará automáticamente
              la prioridad del pedido si pasa más de 30 o 60 minutos sin ser entregado.
            </Text>
          </View>
        </View>

        {/* Botón de Enviar */}
        <CustomButton
          title={`Guardar y Despachar (${formatCurrency(totalCalculated)})`}
          icon="checkmark-circle"
          size="lg"
          variant="primary"
          onPress={handleSubmit}
          style={styles.submitBtn}
          fullWidth
        />
      </ScrollView>
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
  formSection: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.secondary,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  productDetailsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  halfCol: {
    flex: 1,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: 8,
  },
  quantityLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  stepperWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 4,
  },
  stepBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    elevation: 1,
  },
  quantityValue: {
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.secondary,
  },
  subtotalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DCFCE7',
    marginTop: 10,
  },
  subtotalLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#166534',
  },
  subtotalValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#15803D',
  },
  gpsPickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284C7',
    paddingVertical: 11,
    borderRadius: 10,
    gap: 8,
    marginTop: 6,
  },
  gpsPickButtonActive: {
    backgroundColor: '#059669',
  },
  gpsPickButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  paymentMethodsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  paymentMethodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  paymentMethodActive: {
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.secondary,
  },
  paymentMethodText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  paymentMethodTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  autoPriorityNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    padding: 12,
    gap: 10,
    marginBottom: 20,
  },
  autoPriorityTextCol: {
    flex: 1,
  },
  autoPriorityTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400E',
  },
  autoPrioritySubtitle: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 2,
    lineHeight: 16,
  },
  submitBtn: {
    marginBottom: 20,
  },
});
