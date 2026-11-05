import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/RootNavigator';
import { useOrders } from '../context/OrderContext';
import { useCustomers } from '../context/CustomerContext';
import { useProducts } from '../context/ProductContext';
import { Customer, isB2BCustomer } from '../models/Customer';
import { Product } from '../models/Product';
import { Order, OrderItem, PaymentMethod, OrderPriority, ProductCategory } from '../models/Order';
import {
  COLORS,
  PAYMENT_METHOD_CONFIG,
  PRIORITY_CONFIG,
  DISTRICT_COORDINATES,
  SPACING,
  RADIUS,
  TOUCH_TARGET,
} from '../utils/constants';
import { formatCurrency } from '../utils/formatters';
import { geocodeAddress } from '../services/geocodingService';
import { hapticImpact, hapticNotification, hapticSelection } from '../utils/haptics';
import { Header } from '../components/common/Header';
import { CustomInput } from '../components/common/CustomInput';
import { LocationPickerModal } from '../components/common/LocationPickerModal';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateOrderScreen'>;

export const CreateOrderScreen: React.FC<Props> = ({ route, navigation }) => {
  const { addOrder } = useOrders();
  const { customers, getCustomerById, addCustomer } = useCustomers();
  const { products } = useProducts();

  // Paso actual del asistente (1: Cliente, 2: Productos, 3: Cobro y Confirmar)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  
  // PASO 1: CLIENTE
  
  const [clientMode, setClientMode] = useState<'EXISTING' | 'MANUAL'>('EXISTING');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [saveAsNewCustomer, setSaveAsNewCustomer] = useState(false);

  // Datos manuales
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [district, setDistrict] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [addressReference, setAddressReference] = useState('');
  const [latitude, setLatitude] = useState<number | undefined>(route?.params?.initialLatitude);
  const [longitude, setLongitude] = useState<number | undefined>(route?.params?.initialLongitude);
  const [isGettingGps, setIsGettingGps] = useState(false);
  const [isMapModalVisible, setIsMapModalVisible] = useState(false);

  // Estados de Validación Reactiva (errores visibles en texto rojo bajo cada input)
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [manualItemErrors, setManualItemErrors] = useState<Record<string, string>>({});

  
  // PASO 2: PRODUCTOS
  
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [productCategoryFilter, setProductCategoryFilter] = useState<string>('ALL');
  const [showManualItemForm, setShowManualItemForm] = useState(false);
  const [manualItemName, setManualItemName] = useState('');
  const [manualItemPrice, setManualItemPrice] = useState('');
  const [manualItemUnit, setManualItemUnit] = useState('Unidad');

  
  // PASO 3: PAGO Y DESPACHO
  
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [cashAmountGiven, setCashAmountGiven] = useState('');
  const [priority, setPriority] = useState<OrderPriority>('NORMAL');
  const [scheduledTime, setScheduledTime] = useState('');
  const [notes, setNotes] = useState('');

  // Auto-seleccionar cliente inicial si viene en la navegación
  useEffect(() => {
    const initialCustId = route?.params?.initialCustomerId;
    if (initialCustId) {
      applyCustomerData(initialCustId);
    } else if (customers.length > 0 && !selectedCustomerId && !customerName) {
      applyCustomerData(customers[0].id);
    }
  }, [route?.params?.initialCustomerId, customers]);

  const applyCustomerData = (custId: string) => {
    const client = getCustomerById(custId);
    if (client) {
      setSelectedCustomerId(client.id);
      setCustomerName(client.name);
      setCustomerPhone(client.phone);
      setDeliveryAddress(client.deliveryAddress);
      setDistrict(client.district);
      setAddressReference(client.addressReference || '');
      setLatitude(client.latitude);
      setLongitude(client.longitude);
      setClientMode('EXISTING');
      setErrors({});
      hapticSelection();
    }
  };

  const selectedCustomerObj = customers.find((c) => c.id === selectedCustomerId);

  // Filtrado de clientes para selector
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers;
    const q = customerSearch.toLowerCase().trim();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.district.toLowerCase().includes(q)
    );
  }, [customers, customerSearch]);

  // Filtrado de productos para el catálogo del Paso 2
  const filteredProducts = useMemo(() => {
    if (productCategoryFilter === 'ALL') return products;
    return products.filter((p) => p.category === productCategoryFilter);
  }, [products, productCategoryFilter]);

  // Manejo de cantidades en productos
  const handleAddProduct = (prod: Product) => {
    hapticImpact('light');
    setErrors((errs) => {
      const copy = { ...errs };
      delete copy.orderItems;
      return copy;
    });
    setOrderItems((prev) => {
      const idx = prev.findIndex((item) => item.name.toLowerCase() === prod.name.toLowerCase());
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx].quantity += 1;
        return updated;
      }
      return [
        ...prev,
        {
          id: `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          name: prod.name,
          quantity: 1,
          unitPrice: prod.price,
          unit: prod.unit,
        },
      ];
    });
  };

  const handleUpdateQuantity = (itemId: string, delta: number) => {
    hapticSelection();
    setOrderItems((prev) =>
      prev
        .map((item) => {
          if (item.id === itemId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter((item): item is OrderItem => item !== null)
    );
  };

  const handleAddManualItem = () => {
    const itemErrors: Record<string, string> = {};
    if (!manualItemName.trim()) {
      itemErrors.name = 'Indica el nombre del producto o servicio';
    }
    const priceNum = parseFloat(manualItemPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      itemErrors.price = 'Indica un precio unitario mayor a S/. 0.00';
    }

    if (Object.keys(itemErrors).length > 0) {
      setManualItemErrors(itemErrors);
      hapticNotification('error');
      return;
    }

    setManualItemErrors({});
    hapticImpact('medium');
    setOrderItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        name: manualItemName.trim(),
        quantity: 1,
        unitPrice: priceNum,
        unit: manualItemUnit.trim() || 'Unidad',
      },
    ]);

    setErrors((errs) => {
      const copy = { ...errs };
      delete copy.orderItems;
      return copy;
    });

    setManualItemName('');
    setManualItemPrice('');
    setShowManualItemForm(false);
  };

  const totalAmount = useMemo(() => {
    return orderItems.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);
  }, [orderItems]);

  // Vuelto calculado para pago en efectivo
  const calculatedChange = useMemo(() => {
    if (paymentMethod !== 'CASH') return 0;
    const given = parseFloat(cashAmountGiven);
    if (isNaN(given) || given <= totalAmount) return 0;
    return given - totalAmount;
  }, [paymentMethod, cashAmountGiven, totalAmount]);

  // Geolocalización usando el servicio centralizado
  const handleGeocode = async () => {
    if (!deliveryAddress.trim() && !district.trim()) {
      Alert.alert('Dirección Requerida', 'Escribe primero la dirección y el distrito.');
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
        'Ubicación Fijada 📍',
        result.isExact
          ? `Coordenadas exactas obtenidas:\n${result.latitude.toFixed(4)}, ${result.longitude.toFixed(4)}`
          : `Se fijaron las coordenadas del distrito de ${district}. Puedes afinar el pin en el mapa.`
      );
    } else {
      hapticNotification('warning');
      Alert.alert('Aviso', 'No se encontraron coordenadas en la red. Puedes fijar el pin en el mapa.');
    }
  };

  // Validaciones estrictas por paso (con mensajes visibles en rojo bajo cada input)
  const validateStep1 = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (clientMode === 'EXISTING') {
      if (!selectedCustomerId && !customerName.trim()) {
        newErrors.customer = 'Debes seleccionar un cliente de la lista para continuar.';
      }
    } else {
      if (!customerName.trim() || customerName.trim().length < 3) {
        newErrors.customerName = 'Ingresa el nombre o razón social (mínimo 3 caracteres)';
      }
      const cleanPhone = customerPhone.replace(/\D/g, '');
      if (!customerPhone.trim() || cleanPhone.length !== 9) {
        newErrors.customerPhone = 'Ingresa un número celular válido de exactamente 9 dígitos';
      }
      if (!district.trim()) {
        newErrors.district = 'Indica la ciudad, distrito o zona de entrega';
      }
      if (!deliveryAddress.trim() || deliveryAddress.trim().length < 5) {
        newErrors.deliveryAddress = 'Ingresa la dirección exacta de entrega (mínimo 5 caracteres)';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!validateStep1()) {
        hapticNotification('error');
        return;
      }
      hapticImpact('medium');
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (orderItems.length === 0) {
        setErrors((prev) => ({
          ...prev,
          orderItems: 'Agrega al menos un producto o servicio del catálogo al pedido.',
        }));
        hapticNotification('error');
        return;
      }
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy.orderItems;
        return copy;
      });
      hapticImpact('medium');
      setCurrentStep(3);
    }
  };

  const handlePrevStep = () => {
    hapticSelection();
    if (currentStep === 3) setCurrentStep(2);
    else if (currentStep === 2) setCurrentStep(1);
    else navigation.goBack();
  };

  // Envío final del pedido
  const handleFinalSubmit = () => {
    if (!customerName.trim() || !deliveryAddress.trim()) {
      setCurrentStep(1);
      validateStep1();
      return;
    }

    if (orderItems.length === 0) {
      setCurrentStep(2);
      setErrors((prev) => ({
        ...prev,
        orderItems: 'El pedido debe contener al menos un producto para ser despachado.',
      }));
      return;
    }

    let finalLat = latitude;
    let finalLng = longitude;

    if (!finalLat || !finalLng) {
      if (DISTRICT_COORDINATES[district]) {
        finalLat = DISTRICT_COORDINATES[district].latitude;
        finalLng = DISTRICT_COORDINATES[district].longitude;
      }
    }

    let linkedCustomerId = selectedCustomerId || undefined;
    if (clientMode === 'MANUAL' && saveAsNewCustomer) {
      const created = addCustomer({
        name: customerName.trim(),
        phone: customerPhone.trim(),
        deliveryAddress: deliveryAddress.trim(),
        district: district.trim(),
        addressReference: addressReference.trim() || undefined,
        notes: notes.trim() || undefined,
        latitude: finalLat,
        longitude: finalLng,
      });
      linkedCustomerId = created.id;
    }

    const newOrderCode = `PED-${Math.floor(1000 + Math.random() * 9000)}`;

    const givenCash = paymentMethod === 'CASH' ? parseFloat(cashAmountGiven) || undefined : undefined;
    const change = givenCash && givenCash > totalAmount ? givenCash - totalAmount : undefined;

    // Determinar categoría logística correspondiente
    let detectedCategory: ProductCategory = 'WATER';
    if (orderItems.length > 0) {
      const itemsText = orderItems.map((i) => i.name.toLowerCase()).join(' ');
      if (itemsText.includes('gas') || itemsText.includes('balón') || itemsText.includes('glp')) {
        detectedCategory = 'GAS';
      } else if (itemsText.includes('harina') || itemsText.includes('pan') || itemsText.includes('manteca')) {
        detectedCategory = 'BAKERY';
      } else if (
        itemsText.includes('lejía') ||
        itemsText.includes('detergente') ||
        itemsText.includes('limpieza') ||
        itemsText.includes('desinfectante')
      ) {
        detectedCategory = 'CLEANING';
      } else if (productCategoryFilter !== 'ALL') {
        detectedCategory = productCategoryFilter as ProductCategory;
      }
    }

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      orderCode: newOrderCode,
      customerId: linkedCustomerId,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      deliveryAddress: deliveryAddress.trim(),
      district: district.trim(),
      addressReference: addressReference.trim() || undefined,
      category: detectedCategory,
      items: orderItems,
      totalAmount,
      paymentMethod,
      paymentStatus: 'PENDING',
      priority,
      status: 'PENDING',
      scheduledTime: scheduledTime.trim() || undefined,
      notes: notes.trim() || undefined,
      latitude: finalLat,
      longitude: finalLng,
      amountPaid: givenCash,
      changeDue: change,
      createdAt: new Date().toISOString(),
    };

    addOrder(newOrder);
    hapticNotification('success');

    Alert.alert(
      '¡Pedido Creado con Éxito! 🎉',
      `Se registró el despacho ${newOrderCode} para ${customerName} por ${formatCurrency(totalAmount)}.`,
      [
        {
          text: '🗺️ Ver en Mapa GPS',
          onPress: () => {
            navigation.replace('MapRouteScreen', { highlightOrderId: newOrder.id });
          },
        },
        {
          text: '📦 Ir a Lista de Pedidos',
          onPress: () => navigation.goBack(),
          style: 'cancel',
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

      <Header
        title="Generar Nuevo Pedido"
        subtitle={`Paso ${currentStep} de 3 • ${
          currentStep === 1
            ? 'Destinatario'
            : currentStep === 2
            ? 'Productos y Carga'
            : 'Cobro y Despacho'
        }`}
        showBackButton={true}
        onBackPress={handlePrevStep}
      />

      {/* Indicador Visual de Progreso (Paso 1 - 2 - 3) */}
      <View style={styles.stepperBar}>
        <View style={styles.stepItem}>
          <View
            style={[
              styles.stepCircle,
              currentStep >= 1 && styles.stepCircleActive,
              currentStep > 1 && styles.stepCircleDone,
            ]}
          >
            {currentStep > 1 ? (
              <Ionicons name="checkmark" size={14} color="#FFFFFF" />
            ) : (
              <Text style={styles.stepNumberText}>1</Text>
            )}
          </View>
          <Text style={[styles.stepLabel, currentStep === 1 && styles.stepLabelActive]}>
            Cliente
          </Text>
        </View>

        <View style={[styles.stepLine, currentStep >= 2 && styles.stepLineActive]} />

        <View style={styles.stepItem}>
          <View
            style={[
              styles.stepCircle,
              currentStep >= 2 && styles.stepCircleActive,
              currentStep > 2 && styles.stepCircleDone,
            ]}
          >
            {currentStep > 2 ? (
              <Ionicons name="checkmark" size={14} color="#FFFFFF" />
            ) : (
              <Text
                style={[
                  styles.stepNumberText,
                  currentStep < 2 && { color: COLORS.textMuted },
                ]}
              >
                2
              </Text>
            )}
          </View>
          <Text style={[styles.stepLabel, currentStep === 2 && styles.stepLabelActive]}>
            Productos
          </Text>
        </View>

        <View style={[styles.stepLine, currentStep >= 3 && styles.stepLineActive]} />

        <View style={styles.stepItem}>
          <View
            style={[
              styles.stepCircle,
              currentStep === 3 && styles.stepCircleActive,
            ]}
          >
            <Text
              style={[
                styles.stepNumberText,
                currentStep < 3 && { color: COLORS.textMuted },
              ]}
            >
              3
            </Text>
          </View>
          <Text style={[styles.stepLabel, currentStep === 3 && styles.stepLabelActive]}>
            Cobro
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* PASO 1: SELECCIÓN O REGISTRO DE CLIENTE */}
          {currentStep === 1 && (
            <View>
              {/* Pestañas de modo */}
              <View style={styles.modeTabs}>
                <TouchableOpacity
                  style={[
                    styles.modeTab,
                    clientMode === 'EXISTING' && styles.modeTabActive,
                  ]}
                  onPress={() => {
                    setClientMode('EXISTING');
                    hapticSelection();
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="people"
                    size={18}
                    color={clientMode === 'EXISTING' ? COLORS.primary : COLORS.textSecondary}
                  />
                  <Text
                    style={[
                      styles.modeTabText,
                      clientMode === 'EXISTING' && styles.modeTabTextActive,
                    ]}
                  >
                    Mis Clientes ({customers.length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modeTab,
                    clientMode === 'MANUAL' && styles.modeTabActive,
                  ]}
                  onPress={() => {
                    setClientMode('MANUAL');
                    setSelectedCustomerId(null);
                    hapticSelection();
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="person-add-outline"
                    size={18}
                    color={clientMode === 'MANUAL' ? COLORS.primary : COLORS.textSecondary}
                  />
                  <Text
                    style={[
                      styles.modeTabText,
                      clientMode === 'MANUAL' && styles.modeTabTextActive,
                    ]}
                  >
                    Nuevo / Manual
                  </Text>
                </TouchableOpacity>
              </View>

              {clientMode === 'EXISTING' ? (
                <View>
                  {/* Si ya hay un cliente seleccionado, mostrar su tarjeta confirmada */}
                  {selectedCustomerObj ? (
                    <View style={styles.customerCardSelected}>
                      <View style={styles.customerCardHeader}>
                        <View
                          style={[
                            styles.avatarCircle,
                            isB2BCustomer(selectedCustomerObj)
                              ? styles.avatarCircleB2B
                              : styles.avatarCircleB2C,
                          ]}
                        >
                          <Ionicons
                            name={isB2BCustomer(selectedCustomerObj) ? 'storefront' : 'person'}
                            size={20}
                            color={isB2BCustomer(selectedCustomerObj) ? '#2563EB' : '#059669'}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={styles.customerCardName} numberOfLines={1}>
                              {selectedCustomerObj.name}
                            </Text>
                          </View>
                          <Text style={styles.customerCardPhone}>
                            📞 {selectedCustomerObj.phone} • {isB2BCustomer(selectedCustomerObj) ? 'B2B Negocio' : 'B2C Hogar'}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.changeCustomerBtn}
                          onPress={() => setSelectedCustomerId(null)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.changeCustomerText}>Cambiar</Text>
                        </TouchableOpacity>
                      </View>

                      <View style={styles.customerAddressRow}>
                        <Ionicons name="location" size={16} color={COLORS.primary} />
                        <Text style={styles.customerAddressText}>
                          {selectedCustomerObj.deliveryAddress} ({selectedCustomerObj.district})
                        </Text>
                      </View>

                      {Boolean(selectedCustomerObj.latitude && selectedCustomerObj.longitude) && (
                        <View style={styles.gpsConfirmedBadge}>
                          <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
                          <Text style={styles.gpsConfirmedText}>Coordenadas GPS listas para ruta</Text>
                        </View>
                      )}
                    </View>
                  ) : (
                    /* Buscador y lista rápida de clientes */
                    <View>
                      {errors.customer ? (
                        <View style={styles.errorNoticeBox}>
                          <Ionicons name="alert-circle" size={16} color={COLORS.danger} />
                          <Text style={styles.errorNoticeText}>{errors.customer}</Text>
                        </View>
                      ) : null}

                      <View style={styles.searchBarBox}>
                        <Ionicons name="search" size={18} color={COLORS.textMuted} />
                        <TextInput
                          style={styles.searchBarInput}
                          placeholder="Buscar cliente por nombre o teléfono..."
                          placeholderTextColor={COLORS.textMuted}
                          value={customerSearch}
                          onChangeText={setCustomerSearch}
                        />
                      </View>

                      <View style={styles.customerPickerList}>
                        {filteredCustomers.map((cust) => (
                          <TouchableOpacity
                            key={cust.id}
                            style={styles.customerPickItem}
                            onPress={() => applyCustomerData(cust.id)}
                            activeOpacity={0.7}
                          >
                            <View
                              style={[
                                styles.avatarMiniCircle,
                                isB2BCustomer(cust) ? styles.avatarMiniB2B : styles.avatarMiniB2C,
                              ]}
                            >
                              <Ionicons
                                name={isB2BCustomer(cust) ? 'storefront' : 'person'}
                                size={14}
                                color={isB2BCustomer(cust) ? '#2563EB' : '#059669'}
                              />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.customerPickName}>{cust.name}</Text>
                              <Text style={styles.customerPickSub}>
                                {cust.phone} • {cust.district} • {isB2BCustomer(cust) ? 'B2B' : 'B2C'}
                              </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              ) : (
                /* Formulario Manual con Validaciones Visuales en Rojo */
                <View style={styles.manualFormCard}>
                  <CustomInput
                    label="Nombre Completo o Razón Social"
                    placeholder="Ej. Bodega Don Lucho"
                    value={customerName}
                    onChangeText={(text) => {
                      setCustomerName(text);
                      if (errors.customerName) setErrors((prev) => ({ ...prev, customerName: '' }));
                    }}
                    required
                    icon="person-outline"
                    error={errors.customerName}
                  />

                  <CustomInput
                    label="Teléfono Celular / WhatsApp"
                    placeholder="Ej. 987654321"
                    value={customerPhone}
                    onChangeText={(text) => {
                      setCustomerPhone(text);
                      if (errors.customerPhone) setErrors((prev) => ({ ...prev, customerPhone: '' }));
                    }}
                    keyboardType="phone-pad"
                    maxLength={9}
                    required
                    icon="call-outline"
                    error={errors.customerPhone}
                  />

                  <CustomInput
                    label="Ciudad o Distrito"
                    placeholder="Ej. Tacna, Pocollay, Gregorio Albarracín..."
                    value={district}
                    onChangeText={(text) => {
                      setDistrict(text);
                      if (errors.district) setErrors((prev) => ({ ...prev, district: '' }));
                    }}
                    required
                    icon="business-outline"
                    error={errors.district}
                  />

                  <CustomInput
                    label="Dirección Exacta de Entrega"
                    placeholder="Ej. Av. Bolognesi 845"
                    value={deliveryAddress}
                    onChangeText={(text) => {
                      setDeliveryAddress(text);
                      if (errors.deliveryAddress) setErrors((prev) => ({ ...prev, deliveryAddress: '' }));
                    }}
                    required
                    icon="location-outline"
                    error={errors.deliveryAddress}
                  />

                  <CustomInput
                    label="Referencia (Opcional)"
                    placeholder="Ej. Frente al parque, puerta blanca"
                    value={addressReference}
                    onChangeText={setAddressReference}
                    icon="navigate-outline"
                  />

                  {/* Botón de Geocodificación Automática */}
                  <View style={styles.gpsActionBar}>
                    <TouchableOpacity
                      style={styles.gpsActionBtn}
                      onPress={handleGeocode}
                      disabled={isGettingGps}
                      activeOpacity={0.8}
                    >
                      {isGettingGps ? (
                        <ActivityIndicator size="small" color={COLORS.primary} />
                      ) : (
                        <>
                          <Ionicons name="locate" size={16} color={COLORS.primary} />
                          <Text style={styles.gpsActionBtnText}>
                            {latitude && longitude ? 'Actualizar Coordenadas GPS' : 'Autodetectar GPS'}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.gpsActionBtn, { backgroundColor: COLORS.secondary }]}
                      onPress={() => setIsMapModalVisible(true)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="map" size={16} color="#FFFFFF" />
                      <Text style={[styles.gpsActionBtnText, { color: '#FFFFFF' }]}>Ver Mapa</Text>
                    </TouchableOpacity>
                  </View>

                  {Boolean(latitude && longitude) && (
                    <Text style={styles.coordsOkText}>
                      📍 GPS Fijado: {latitude?.toFixed(4)}, {longitude?.toFixed(4)}
                    </Text>
                  )}

                  <TouchableOpacity
                    style={styles.saveCustomerCheckRow}
                    onPress={() => setSaveAsNewCustomer(!saveAsNewCustomer)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={saveAsNewCustomer ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={saveAsNewCustomer ? COLORS.primary : COLORS.textMuted}
                    />
                    <Text style={styles.saveCustomerCheckText}>
                      Guardar este cliente en "Mis Clientes" para futuros pedidos
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* PASO 2: PRODUCTOS Y CARGA */}
          {currentStep === 2 && (
            <View>
              {/* Alerta de Validación Visible en Rojo si no hay artículos */}
              {errors.orderItems ? (
                <View style={styles.errorNoticeBox}>
                  <Ionicons name="alert-circle" size={18} color={COLORS.danger} />
                  <Text style={styles.errorNoticeText}>{errors.orderItems}</Text>
                </View>
              ) : null}

              {/* Resumen flotante de artículos ya agregados */}
              {orderItems.length > 0 && (
                <View style={styles.selectedItemsSummaryCard}>
                  <View style={styles.summaryTitleRow}>
                    <Text style={styles.summaryTitleText}>
                      🛒 {orderItems.reduce((acc, i) => acc + i.quantity, 0)} artículos seleccionados
                    </Text>
                    <Text style={styles.summaryTotalText}>{formatCurrency(totalAmount)}</Text>
                  </View>

                  <View style={styles.itemsPillsList}>
                    {orderItems.map((item) => (
                      <View key={item.id} style={styles.itemPillRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.itemPillName} numberOfLines={1}>
                            {item.name}
                          </Text>
                          <Text style={styles.itemPillSub}>
                            {formatCurrency(item.unitPrice)} c/u
                          </Text>
                        </View>

                        {/* Botones de cantidad [-] X [+] */}
                        <View style={styles.counterGroup}>
                          <TouchableOpacity
                            style={styles.counterBtn}
                            onPress={() => handleUpdateQuantity(item.id, -1)}
                          >
                            <Ionicons name="remove" size={16} color={COLORS.textPrimary} />
                          </TouchableOpacity>
                          <Text style={styles.counterQtyText}>{item.quantity}</Text>
                          <TouchableOpacity
                            style={styles.counterBtn}
                            onPress={() => handleUpdateQuantity(item.id, 1)}
                          >
                            <Ionicons name="add" size={16} color={COLORS.textPrimary} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Selector de Categorías para el Catálogo */}
              <View style={styles.catalogHeaderRow}>
                <Text style={styles.catalogSectionTitle}>Selecciona del Catálogo:</Text>
                <TouchableOpacity
                  onPress={() => setShowManualItemForm(!showManualItemForm)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.addCustomItemLink}>+ Ítem Libre</Text>
                </TouchableOpacity>
              </View>

              {/* Formulario de ítem libre si se expande con validación en rojo */}
              {showManualItemForm && (
                <View style={styles.manualItemCard}>
                  <Text style={styles.manualItemTitle}>Agregar Ítem Libre / Personalizado</Text>
                  <CustomInput
                    label="Descripción del Producto o Servicio"
                    placeholder="Ej. Bidón de Agua Especial 20L"
                    value={manualItemName}
                    onChangeText={(t) => {
                      setManualItemName(t);
                      if (manualItemErrors.name) setManualItemErrors((p) => ({ ...p, name: '' }));
                    }}
                    required
                    error={manualItemErrors.name}
                  />

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <CustomInput
                        label="Precio S/"
                        placeholder="Ej. 18.00"
                        value={manualItemPrice}
                        onChangeText={(t) => {
                          setManualItemPrice(t);
                          if (manualItemErrors.price) setManualItemErrors((p) => ({ ...p, price: '' }));
                        }}
                        keyboardType="decimal-pad"
                        required
                        error={manualItemErrors.price}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <CustomInput
                        label="Unidad"
                        placeholder="Ej. Unidad, Galón"
                        value={manualItemUnit}
                        onChangeText={setManualItemUnit}
                      />
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.addManualItemConfirmBtn}
                    onPress={handleAddManualItem}
                  >
                    <Text style={styles.addManualItemConfirmText}>+ Agregar al Pedido</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Cuadrícula visual de productos con toque directo */}
              <View style={styles.productsGrid}>
                {filteredProducts.map((prod) => {
                  const alreadyInOrder = orderItems.find(
                    (i) => i.name.toLowerCase() === prod.name.toLowerCase()
                  );

                  return (
                    <TouchableOpacity
                      key={prod.id}
                      style={[
                        styles.productGridCard,
                        alreadyInOrder && styles.productGridCardActive,
                      ]}
                      onPress={() => handleAddProduct(prod)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.productCardTop}>
                        <Text style={styles.productPriceText}>{formatCurrency(prod.price)}</Text>
                        {alreadyInOrder && (
                          <View style={styles.itemBadgeCounter}>
                            <Text style={styles.itemBadgeCounterText}>
                              {alreadyInOrder.quantity}x
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.productGridName} numberOfLines={2}>
                        {prod.name}
                      </Text>
                      <Text style={styles.productGridUnit}>{prod.unit}</Text>
                      <View style={styles.addPlusBtn}>
                        <Ionicons name="add" size={16} color={COLORS.primary} />
                        <Text style={styles.addPlusBtnText}>Agregar</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* PASO 3: COBRO Y DESPACHO FINAL */}
          {currentStep === 3 && (
            <View>
              {/* Tarjeta de Resumen Económico */}
              <View style={styles.economicSummaryCard}>
                <Text style={styles.economicSubtitle}>Total a Cobrar:</Text>
                <Text style={styles.economicTotalAmount}>{formatCurrency(totalAmount)}</Text>
                <Text style={styles.economicItemsCount}>
                  {orderItems.reduce((acc, i) => acc + i.quantity, 0)} artículos en total para{' '}
                  {customerName}
                </Text>
              </View>

              {/* Selector Visual de Método de Pago */}
              <Text style={styles.stepSectionHeader}>Método de Pago Acordado</Text>
              <View style={styles.paymentMethodsRow}>
                {(Object.keys(PAYMENT_METHOD_CONFIG) as PaymentMethod[]).map((m) => {
                  const cfg = PAYMENT_METHOD_CONFIG[m];
                  const isSelected = paymentMethod === m;
                  return (
                    <TouchableOpacity
                      key={m}
                      style={[
                        styles.paymentMethodButton,
                        isSelected && styles.paymentMethodButtonActive,
                      ]}
                      onPress={() => {
                        setPaymentMethod(m);
                        hapticSelection();
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={cfg.icon as any}
                        size={22}
                        color={isSelected ? '#FFFFFF' : COLORS.textPrimary}
                      />
                      <Text
                        style={[
                          styles.paymentMethodBtnText,
                          isSelected && styles.paymentMethodBtnTextActive,
                        ]}
                      >
                        {cfg.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Calculadora de Vuelto para Efectivo */}
              {paymentMethod === 'CASH' && (
                <View style={styles.cashCalculatorCard}>
                  <Text style={styles.cashCalcTitle}>💵 Cálculo de Vuelto (Efectivo)</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <TextInput
                      style={[styles.formInput, { flex: 1, marginBottom: 0 }]}
                      placeholder="¿Con cuánto paga el cliente? (Ej. 100)"
                      placeholderTextColor={COLORS.textMuted}
                      value={cashAmountGiven}
                      onChangeText={setCashAmountGiven}
                      keyboardType="decimal-pad"
                    />
                  </View>
                  {calculatedChange > 0 ? (
                    <View style={styles.changeDueBox}>
                      <Text style={styles.changeDueLabel}>Vuelto a Entregar:</Text>
                      <Text style={styles.changeDueAmount}>{formatCurrency(calculatedChange)}</Text>
                    </View>
                  ) : null}
                </View>
              )}

              {/* Prioridad de Entrega */}
              <Text style={[styles.stepSectionHeader, { marginTop: 18 }]}>Prioridad de Entrega</Text>
              <View style={styles.prioritySelectorRow}>
                {(['NORMAL', 'HIGH', 'URGENT'] as OrderPriority[]).map((p) => {
                  const cfg = PRIORITY_CONFIG[p];
                  const isSelected = priority === p;
                  return (
                    <TouchableOpacity
                      key={p}
                      style={[
                        styles.prioritySelectBtn,
                        isSelected && { backgroundColor: cfg.color, borderColor: cfg.color },
                      ]}
                      onPress={() => {
                        setPriority(p);
                        hapticSelection();
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={cfg.icon as any}
                        size={16}
                        color={isSelected ? '#FFFFFF' : cfg.color}
                      />
                      <Text
                        style={[
                          styles.prioritySelectBtnText,
                          isSelected && { color: '#FFFFFF', fontWeight: '800' },
                        ]}
                      >
                        {cfg.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Observaciones Rápidas */}
              <Text style={[styles.stepSectionHeader, { marginTop: 18 }]}>Instrucciones de Entrega</Text>
              <TextInput
                style={[styles.formInput, { height: 70, textAlignVertical: 'top' }]}
                placeholder="Instrucciones para el distribuidor (Ej: llamar al llegar, dejar en recepción)"
                placeholderTextColor={COLORS.textMuted}
                value={notes}
                onChangeText={setNotes}
                multiline
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Barra Inferior Fija de Navegación del Asistente */}
      <View style={styles.bottomNavContainer}>
        {currentStep < 3 ? (
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleNextStep}
            activeOpacity={0.88}
          >
            <Text style={styles.continueButtonText}>Continuar</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.confirmFinalButton}
            onPress={handleFinalSubmit}
            activeOpacity={0.88}
          >
            <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
            <Text style={styles.confirmFinalButtonText}>Confirmar Despacho</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Modal interactivo de mapa para colocar pin si se desea afinar */}
      <LocationPickerModal
        visible={isMapModalVisible}
        onClose={() => setIsMapModalVisible(false)}
        initialLatitude={latitude}
        initialLongitude={longitude}
        addressHint={`${deliveryAddress}, ${district}`}
        onSelectLocation={(coords) => {
          setLatitude(coords.latitude);
          setLongitude(coords.longitude);
          setIsMapModalVisible(false);
          hapticNotification('success');
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
  /* Stepper */
  stepperBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  stepItem: {
    alignItems: 'center',
    gap: 4,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
  },
  stepCircleActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  stepCircleDone: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  stepLabelActive: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E2E8F0',
    marginHorizontal: SPACING.sm,
    marginBottom: 16,
  },
  stepLineActive: {
    backgroundColor: COLORS.primary,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: 110,
  },
  /* Modo Tabs */
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: RADIUS.md,
    padding: 4,
    marginBottom: SPACING.md,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
    gap: 6,
  },
  modeTabActive: {
    backgroundColor: COLORS.surface,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  modeTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  modeTabTextActive: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  /* Tarjeta de cliente seleccionado */
  customerCardSelected: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1.5,
    borderColor: COLORS.primaryLight,
    elevation: 2,
  },
  customerCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: SPACING.sm,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  avatarCircleB2B: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  avatarCircleB2C: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  customerCardName: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  customerCardPhone: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  changeCustomerBtn: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
  },
  changeCustomerText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  customerAddressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 8,
  },
  customerAddressText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  gpsConfirmedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.sm,
    gap: 6,
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  gpsConfirmedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  /* Buscador de clientes */
  searchBarBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    height: 46,
    gap: 8,
    marginBottom: SPACING.md,
  },
  searchBarInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  customerPickerList: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  customerPickItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 10,
  },
  avatarMiniCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  avatarMiniB2B: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  avatarMiniB2C: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  customerPickName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  customerPickSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  /* Formulario manual */
  manualFormCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  formFieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 6,
    marginTop: 10,
  },
  formInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.textPrimary,
    minHeight: 46,
  },
  gpsActionBar: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  gpsActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  gpsActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  coordsOkText: {
    fontSize: 11,
    color: COLORS.success,
    fontWeight: '700',
    marginTop: 6,
  },
  saveCustomerCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  saveCustomerCheckText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  /* Paso 2: Productos */
  selectedItemsSummaryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    marginBottom: SPACING.lg,
    elevation: 2,
  },
  summaryTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    paddingBottom: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  summaryTitleText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primary,
  },
  summaryTotalText: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  itemsPillsList: {
    gap: 8,
  },
  itemPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: RADIUS.md,
    gap: 8,
  },
  itemPillName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  itemPillSub: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  counterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  counterBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterQtyText: {
    fontSize: 13,
    fontWeight: '800',
    paddingHorizontal: 8,
    color: COLORS.textPrimary,
  },
  catalogHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  catalogSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addCustomItemLink: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  manualItemCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
    marginBottom: SPACING.md,
    gap: 8,
  },
  manualItemTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.secondary,
  },
  addManualItemConfirmBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    paddingVertical: 10,
    alignItems: 'center',
  },
  addManualItemConfirmText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  productGridCard: {
    width: '48%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'space-between',
  },
  productGridCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#F8FBFF',
  },
  productCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  productPriceText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  itemBadgeCounter: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  itemBadgeCounterText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  productGridName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    lineHeight: 17,
  },
  productGridUnit: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
    marginBottom: 8,
  },
  addPlusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: RADIUS.sm,
    paddingVertical: 6,
    gap: 4,
  },
  addPlusBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  /* Paso 3: Cobro */
  economicSummaryCard: {
    backgroundColor: COLORS.secondary,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  economicSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  economicTotalAmount: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    marginVertical: 4,
  },
  economicItemsCount: {
    fontSize: 12,
    color: '#CBD5E1',
  },
  stepSectionHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  paymentMethodsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  paymentMethodButton: {
    width: '48%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  paymentMethodButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  paymentMethodBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  paymentMethodBtnTextActive: {
    color: '#FFFFFF',
  },
  cashCalculatorCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginTop: 12,
  },
  cashCalcTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400E',
    marginBottom: 8,
  },
  changeDueBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: RADIUS.sm,
  },
  changeDueLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
  },
  changeDueAmount: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.success,
  },
  prioritySelectorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  prioritySelectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    gap: 4,
  },
  prioritySelectBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  /* Barra Inferior */
  bottomNavContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  continueButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    height: TOUCH_TARGET.buttonHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 3,
  },
  continueButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  confirmFinalButton: {
    backgroundColor: COLORS.success,
    borderRadius: RADIUS.md,
    height: TOUCH_TARGET.buttonHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 4,
  },
  confirmFinalButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  errorNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#F87171',
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.md,
    gap: 8,
  },
  errorNoticeText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
});
