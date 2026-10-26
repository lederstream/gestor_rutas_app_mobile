/**
 * ============================================================================
 * SCREEN: CreateOrderScreen.tsx
 * Form with multi-category presets, district selectors, quantity counters & validation
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/RootNavigator';
import { useOrders } from '../context/OrderContext';
import {
  Order,
  ProductCategory,
  OrderPriority,
  PaymentMethod,
} from '../models/Order';
import {
  COLORS,
  CATEGORY_CONFIG,
  PRIORITY_CONFIG,
  PAYMENT_METHOD_CONFIG,
  AVAILABLE_DISTRICTS,
  DEFAULT_DRIVERS,
} from '../utils/constants';
import { formatCurrency } from '../utils/formatters';
import { Header } from '../components/common/Header';
import { CustomInput } from '../components/common/CustomInput';
import { CustomButton } from '../components/common/CustomButton';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateOrderScreen'>;

export const CreateOrderScreen: React.FC<Props> = ({ navigation }) => {
  const { addOrder } = useOrders();

  // Form State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [district, setDistrict] = useState(AVAILABLE_DISTRICTS[0]);
  const [addressReference, setAddressReference] = useState('');
  const [category, setCategory] = useState<ProductCategory>('WATER');
  const [productName, setProductName] = useState(
    'Bidón de Agua Purificada San Mateo 20L'
  );
  const [unit, setUnit] = useState('bidón 20L');
  const [quantity, setQuantity] = useState(2);
  const [unitPrice, setUnitPrice] = useState('16.00');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('YAPE_PLIN');
  const [priority, setPriority] = useState<OrderPriority>('NORMAL');
  const [scheduledTime, setScheduledTime] = useState('10:00 - 12:00 PM');
  const [driverAssigned, setDriverAssigned] = useState(DEFAULT_DRIVERS[0]);
  const [notes, setNotes] = useState('');

  // Form Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto update product default when category changes
  const handleCategoryChange = (cat: ProductCategory) => {
    setCategory(cat);
    switch (cat) {
      case 'WATER':
        setProductName('Bidón de Agua Purificada San Mateo 20L');
        setUnit('bidón 20L');
        setUnitPrice('16.00');
        break;
      case 'GAS':
        setProductName('Balón de Gas GLP 10kg Premium');
        setUnit('balón 10kg');
        setUnitPrice('52.00');
        break;
      case 'BAKERY':
        setProductName('Saco Harina Trigo Especial 50kg');
        setUnit('saco 50kg');
        setUnitPrice('145.00');
        break;
      case 'CLEANING':
        setProductName('Galonera Lejía Concentrada 4L');
        setUnit('galonera 4L');
        setUnitPrice('28.00');
        break;
    }
  };

  // Quantity helpers
  const handleIncrement = () => setQuantity((prev) => prev + 1);
  const handleDecrement = () =>
    setQuantity((prev) => (prev > 1 ? prev - 1 : 1));

  // Computed total
  const parsedPrice = parseFloat(unitPrice) || 0;
  const totalCalculated = quantity * parsedPrice;

  // Validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!customerName.trim() || customerName.trim().length < 3) {
      newErrors.customerName = 'Ingresa el nombre o razón social del cliente (mín. 3 letras)';
    }

    const cleanPhone = customerPhone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length !== 9) {
      newErrors.customerPhone = 'Ingresa un número celular válido de 9 dígitos';
    }

    if (!deliveryAddress.trim() || deliveryAddress.trim().length < 5) {
      newErrors.deliveryAddress = 'Ingresa la dirección exacta de entrega';
    }

    if (!unitPrice || parsedPrice <= 0) {
      newErrors.unitPrice = 'El precio unitario debe ser mayor a 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      Alert.alert('Formulario Incompleto', 'Por favor revisa los campos señalados en rojo.');
      return;
    }

    const newOrderCode = `GR-${Math.floor(1000 + Math.random() * 9000)}`;
    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      orderCode: newOrderCode,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      deliveryAddress: deliveryAddress.trim(),
      district,
      addressReference: addressReference.trim() || undefined,
      category,
      items: [
        {
          id: `item-${Date.now()}`,
          name: productName.trim(),
          quantity,
          unitPrice: parsedPrice,
          unit,
        },
      ],
      totalAmount: totalCalculated,
      paymentMethod,
      paymentStatus: 'PENDING',
      priority,
      status: 'PENDING',
      scheduledTime: scheduledTime.trim() || undefined,
      driverAssigned,
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    addOrder(newOrder);

    Alert.alert(
      '¡Pedido Creado con Éxito!',
      `Se ha despachado el código de entrega ${newOrderCode} para ${customerName}.`,
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
        title="Nuevo Pedido Inmediato"
        subtitle="Despacho de distribución local"
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Category Selector Segment */}
        <Text style={styles.sectionHeader}>1. Selecciona Rubro de Carga</Text>
        <View style={styles.categoryGrid}>
          {(['WATER', 'GAS', 'BAKERY', 'CLEANING'] as ProductCategory[]).map(
            (cat) => {
              const isSelected = category === cat;
              const config = CATEGORY_CONFIG[cat];
              return (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryCard,
                    isSelected && {
                      borderColor: config.color,
                      backgroundColor: config.bg,
                    },
                  ]}
                  onPress={() => handleCategoryChange(cat)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={config.icon as any}
                    size={24}
                    color={isSelected ? config.color : COLORS.textMuted}
                  />
                  <Text
                    style={[
                      styles.categoryCardLabel,
                      isSelected && { color: config.color, fontWeight: '700' },
                    ]}
                  >
                    {config.label.split(' ')[0]}
                  </Text>
                </TouchableOpacity>
              );
            }
          )}
        </View>

        {/* Product & Quantity Box */}
        <View style={styles.cardContainer}>
          <Text style={styles.cardSectionTitle}>Producto y Cantidad</Text>

          <CustomInput
            label="Descripción del Producto"
            value={productName}
            onChangeText={setProductName}
            placeholder="Ej. Bidón 20L, Balón Gas 10kg..."
            icon="cube-outline"
            required
          />

          <View style={styles.quantityAndPriceRow}>
            {/* Quantity Counter */}
            <View style={styles.quantityBox}>
              <Text style={styles.subLabel}>Cantidad</Text>
              <View style={styles.counterControl}>
                <TouchableOpacity
                  style={styles.counterBtn}
                  onPress={handleDecrement}
                  activeOpacity={0.7}
                >
                  <Ionicons name="remove" size={18} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.counterValue}>{quantity}</Text>
                <TouchableOpacity
                  style={styles.counterBtn}
                  onPress={handleIncrement}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add" size={18} color={COLORS.textPrimary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Unit Price */}
            <View style={styles.priceBox}>
              <CustomInput
                label="Precio Unit. (S/.)"
                value={unitPrice}
                onChangeText={setUnitPrice}
                placeholder="16.00"
                keyboardType="numeric"
                error={errors.unitPrice}
                required
              />
            </View>
          </View>

          {/* Subtotal Banner */}
          <View style={styles.totalCalculatedBanner}>
            <Text style={styles.totalBannerLabel}>Total a Facturar/Cobrar:</Text>
            <Text style={styles.totalBannerAmount}>
              {formatCurrency(totalCalculated)}
            </Text>
          </View>
        </View>

        {/* Customer Information */}
        <Text style={styles.sectionHeader}>2. Datos del Cliente y Entrega</Text>
        <View style={styles.cardContainer}>
          <CustomInput
            label="Nombre Completo / Razón Social"
            value={customerName}
            onChangeText={setCustomerName}
            placeholder="Ej. Restaurante Las Brisas / Juan Pérez"
            icon="person-outline"
            error={errors.customerName}
            required
          />

          <CustomInput
            label="Número de Teléfono / Celular (WhatsApp)"
            value={customerPhone}
            onChangeText={setCustomerPhone}
            placeholder="Ej. 987654321"
            icon="call-outline"
            keyboardType="phone-pad"
            maxLength={9}
            error={errors.customerPhone}
            required
          />

          <CustomInput
            label="Dirección de Entrega"
            value={deliveryAddress}
            onChangeText={setDeliveryAddress}
            placeholder="Av. Aviación 2840, Dpto 301"
            icon="navigate-outline"
            error={errors.deliveryAddress}
            required
          />

          {/* District Selector Chips */}
          <Text style={styles.subLabel}>Distrito de Entrega</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.districtScroll}
          >
            {AVAILABLE_DISTRICTS.map((dist) => {
              const isSelected = district === dist;
              return (
                <TouchableOpacity
                  key={dist}
                  style={[
                    styles.districtChip,
                    isSelected && styles.districtChipActive,
                  ]}
                  onPress={() => setDistrict(dist)}
                >
                  <Text
                    style={[
                      styles.districtChipText,
                      isSelected && styles.districtChipTextActive,
                    ]}
                  >
                    {dist}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <CustomInput
            label="Referencia de Llegada"
            value={addressReference}
            onChangeText={setAddressReference}
            placeholder="Ej. Frente al parque, rejas blancas, timbre 3"
            icon="flag-outline"
          />
        </View>

        {/* Logistics Operations */}
        <Text style={styles.sectionHeader}>3. Prioridad y Modalidad de Cobro</Text>
        <View style={styles.cardContainer}>
          {/* Priority Selector */}
          <Text style={styles.subLabel}>Nivel de Prioridad</Text>
          <View style={styles.priorityRow}>
            {(['NORMAL', 'HIGH', 'URGENT'] as OrderPriority[]).map((p) => {
              const isSelected = priority === p;
              const config = PRIORITY_CONFIG[p];
              return (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.priorityPill,
                    isSelected && {
                      backgroundColor: config.bg,
                      borderColor: config.color,
                    },
                  ]}
                  onPress={() => setPriority(p)}
                >
                  <Ionicons
                    name={config.icon as any}
                    size={14}
                    color={isSelected ? config.color : COLORS.textMuted}
                  />
                  <Text
                    style={[
                      styles.priorityPillText,
                      isSelected && { color: config.color, fontWeight: '700' },
                    ]}
                  >
                    {config.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Payment Method Selector */}
          <Text style={[styles.subLabel, { marginTop: 14 }]}>
            Método de Pago
          </Text>
          <View style={styles.paymentMethodGrid}>
            {(['CASH', 'YAPE_PLIN', 'CARD_POS', 'TRANSFER'] as PaymentMethod[]).map(
              (method) => {
                const isSelected = paymentMethod === method;
                const config = PAYMENT_METHOD_CONFIG[method];
                return (
                  <TouchableOpacity
                    key={method}
                    style={[
                      styles.paymentMethodPill,
                      isSelected && styles.paymentMethodPillActive,
                    ]}
                    onPress={() => setPaymentMethod(method)}
                  >
                    <Ionicons
                      name={config.icon as any}
                      size={16}
                      color={isSelected ? COLORS.primary : COLORS.textSecondary}
                    />
                    <Text
                      style={[
                        styles.paymentMethodText,
                        isSelected && styles.paymentMethodTextActive,
                      ]}
                    >
                      {config.label}
                    </Text>
                  </TouchableOpacity>
                );
              }
            )}
          </View>

          <CustomInput
            label="Horario / Ventana de Entrega"
            value={scheduledTime}
            onChangeText={setScheduledTime}
            placeholder="Ej. 10:00 - 12:00 PM"
            icon="time-outline"
            containerStyle={{ marginTop: 14 }}
          />

          <CustomInput
            label="Notas Internas de Despacho"
            value={notes}
            onChangeText={setNotes}
            placeholder="Ej. Dejar con el vigilante si no contestan celular"
            multiline
            numberOfLines={3}
            icon="create-outline"
          />
        </View>

        {/* Submit Button */}
        <View style={styles.submitSection}>
          <CustomButton
            title={`Registrar Pedido (${formatCurrency(totalCalculated)})`}
            icon="checkmark-circle-outline"
            size="lg"
            variant="primary"
            onPress={handleSubmit}
            fullWidth
          />
        </View>
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
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 8,
  },
  categoryGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  categoryCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  categoryCardLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  cardContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
    elevation: 2,
    shadowColor: COLORS.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
  },
  cardSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  quantityAndPriceRow: {
    flexDirection: 'row',
    gap: 12,
  },
  quantityBox: {
    flex: 1,
  },
  subLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  counterControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    height: 50,
    paddingHorizontal: 8,
  },
  counterBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  counterValue: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  priceBox: {
    flex: 1,
  },
  totalCalculatedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginTop: 4,
  },
  totalBannerLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primaryDark,
  },
  totalBannerAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  districtScroll: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    paddingVertical: 2,
  },
  districtChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  districtChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  districtChipText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  districtChipTextActive: {
    color: COLORS.textInverse,
    fontWeight: '700',
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: '#F8FAFC',
    gap: 4,
  },
  priorityPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  paymentMethodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  paymentMethodPill: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: '#F8FAFC',
    gap: 6,
  },
  paymentMethodPillActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#EFF6FF',
  },
  paymentMethodText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  paymentMethodTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  submitSection: {
    marginTop: 8,
  },
});
