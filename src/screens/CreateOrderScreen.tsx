/**
 * ============================================================================
 * SCREEN: CreateOrderScreen.tsx
 * Generación de Nuevo Pedido con Selector Inteligente de Clientes y Catálogo
 * ============================================================================
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/RootNavigator';
import { useOrders } from '../context/OrderContext';
import { useCustomers } from '../context/CustomerContext';
import { useProducts } from '../context/ProductContext';
import { Customer } from '../models/Customer';
import { Product } from '../models/Product';
import { Order, OrderItem, PaymentMethod, OrderPriority } from '../models/Order';
import {
  COLORS,
  PAYMENT_METHOD_CONFIG,
  PRIORITY_CONFIG,
  DISTRICT_COORDINATES,
} from '../utils/constants';
import { formatCurrency } from '../utils/formatters';
import { Header } from '../components/common/Header';
import { CustomInput } from '../components/common/CustomInput';
import { CustomButton } from '../components/common/CustomButton';
import { LocationPickerModal } from '../components/common/LocationPickerModal';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateOrderScreen'>;

export const CreateOrderScreen: React.FC<Props> = ({ route, navigation }) => {
  const { addOrder } = useOrders();
  const { customers, getCustomerById, addCustomer } = useCustomers();
  const { products } = useProducts();

  // Modo de selección de cliente: 'EXISTING' | 'MANUAL'
  const [clientMode, setClientMode] = useState<'EXISTING' | 'MANUAL'>('EXISTING');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isCustomerModalVisible, setIsCustomerModalVisible] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [saveAsNewCustomer, setSaveAsNewCustomer] = useState(false);

  // Datos del Cliente y Entrega
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [district, setDistrict] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [addressReference, setAddressReference] = useState('');
  const [latitude, setLatitude] = useState<number | undefined>(route?.params?.initialLatitude);
  const [longitude, setLongitude] = useState<number | undefined>(route?.params?.initialLongitude);
  const [isGettingGps, setIsGettingGps] = useState(false);
  const [isMapModalVisible, setIsMapModalVisible] = useState(false);

  // Lista de Productos del Pedido
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [isProductModalVisible, setIsProductModalVisible] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  // Formulario de Producto Manual
  const [manualProductName, setManualProductName] = useState('');
  const [manualPrice, setManualPrice] = useState('');
  const [manualUnit, setManualUnit] = useState('Unidad');
  const [showManualProductForm, setShowManualProductForm] = useState(false);

  // Operaciones
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [priority, setPriority] = useState<OrderPriority>('NORMAL');
  const [scheduledTime, setScheduledTime] = useState('');
  const [notes, setNotes] = useState('');

  // Errores
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Función para rellenar automáticamente todos los datos del cliente seleccionado
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
      if (client.notes) {
        setNotes((prev) => (prev ? `${prev} | ${client.notes}` : client.notes || ''));
      }
      setClientMode('EXISTING');
    }
  };

  // 1. Cargar cliente inicial si viene en la navegación (ej: desde CustomerListScreen)
  useEffect(() => {
    const initialCustId = route?.params?.initialCustomerId;
    if (initialCustId) {
      applyCustomerData(initialCustId);
    } else if (customers.length > 0 && !selectedCustomerId && !customerName) {
      applyCustomerData(customers[0].id);
    }
  }, [route?.params?.initialCustomerId, customers]);

  // Filtrado de clientes para el modal selector
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers;
    const q = customerSearch.toLowerCase().trim();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.deliveryAddress.toLowerCase().includes(q) ||
        c.district.toLowerCase().includes(q)
    );
  }, [customers, customerSearch]);

  // Filtrado de productos para el catálogo modal
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products;
    const q = productSearch.toLowerCase().trim();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.unit.toLowerCase().includes(q) ||
        p.code?.toLowerCase().includes(q)
    );
  }, [products, productSearch]);

  // Añadir producto desde el catálogo
  const handleAddProductFromCatalog = (prod: Product) => {
    setOrderItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.name.toLowerCase() === prod.name.toLowerCase());
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex].quantity += 1;
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
    setIsProductModalVisible(false);
  };

  // Añadir producto manual
  const handleAddManualProduct = () => {
    if (!manualProductName.trim()) {
      Alert.alert('Nombre Requerido', 'Ingresa el nombre del producto o servicio.');
      return;
    }
    const priceNum = parseFloat(manualPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      Alert.alert('Precio Inválido', 'Ingresa un precio mayor a 0.');
      return;
    }

    setOrderItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        name: manualProductName.trim(),
        quantity: 1,
        unitPrice: priceNum,
        unit: manualUnit.trim() || 'Unidad',
      },
    ]);

    setManualProductName('');
    setManualPrice('');
    setManualUnit('Unidad');
    setShowManualProductForm(false);
  };

  // Modificar cantidad de un ítem
  const handleUpdateQuantity = (itemId: string, delta: number) => {
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

  // Eliminar ítem
  const handleRemoveItem = (itemId: string) => {
    setOrderItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  // Cálculo del monto total
  const totalAmount = useMemo(() => {
    return orderItems.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);
  }, [orderItems]);

  // Geolocalizar dirección
  const handleGetLocation = async () => {
    if (!deliveryAddress.trim() && !district.trim()) {
      Alert.alert(
        'Ingresa una dirección',
        'Escribe primero la dirección y el distrito para geolocalizarla automáticamente en el mapa.'
      );
      return;
    }

    setIsGettingGps(true);
    try {
      const query = `${deliveryAddress}, ${district}`;
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'GestorRutasMobile/1.0',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lon = parseFloat(data[0].lon);
          setLatitude(lat);
          setLongitude(lon);
          Alert.alert('Ubicación Fijada', `Coordenadas: ${lat.toFixed(4)}, ${lon.toFixed(4)}`);
          setIsGettingGps(false);
          return;
        }
      }

      if (DISTRICT_COORDINATES[district]) {
        const coords = DISTRICT_COORDINATES[district];
        setLatitude(coords.latitude);
        setLongitude(coords.longitude);
        Alert.alert('Ubicación Fijada', `Se usaron las coordenadas del distrito de ${district}.`);
      } else {
        Alert.alert('Sin Coordenadas', 'No se encontraron coordenadas en la red. Puedes fijar el pin en el mapa.');
      }
    } catch {
      Alert.alert('Aviso', 'No se pudo conectar al servicio de mapas.');
    } finally {
      setIsGettingGps(false);
    }
  };

  // Validación antes de guardar
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!customerName.trim() || customerName.trim().length < 2) {
      newErrors.customerName = 'Selecciona o ingresa el nombre del cliente';
    }

    if (!customerPhone.trim() || customerPhone.replace(/\D/g, '').length < 6) {
      newErrors.customerPhone = 'Ingresa un número telefónico válido (mín. 6 dígitos)';
    }

    if (!district.trim()) {
      newErrors.district = 'Indica la ciudad, distrito o zona';
    }

    if (!deliveryAddress.trim() || deliveryAddress.trim().length < 3) {
      newErrors.deliveryAddress = 'Ingresa la dirección de entrega';
    }

    if (orderItems.length === 0) {
      newErrors.orderItems = 'Agrega al menos un producto o servicio al pedido';
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

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      orderCode: newOrderCode,
      customerId: linkedCustomerId,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      deliveryAddress: deliveryAddress.trim(),
      district: district.trim(),
      addressReference: addressReference.trim() || undefined,
      category: 'GENERAL',
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
      createdAt: new Date().toISOString(),
    };

    addOrder(newOrder);

    Alert.alert(
      '¡Pedido Creado con Éxito!',
      `Se registró el pedido ${newOrderCode} para ${customerName} por ${formatCurrency(totalAmount)}.`,
      [
        {
          text: 'Ver en Mapa GPS',
          onPress: () => {
            navigation.replace('MapRouteScreen', { highlightOrderId: newOrder.id });
          },
        },
        {
          text: 'Ir a Pedidos',
          onPress: () => navigation.goBack(),
          style: 'cancel',
        },
      ]
    );
  };

  const selectedCustomerObj = customers.find((c) => c.id === selectedCustomerId);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

      <Header
        title="Generar Nuevo Pedido"
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* =================================================================== */}
        {/* SECCIÓN 1: CLIENTE */}
        {/* =================================================================== */}
        <View style={styles.cardSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>1</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Cliente y Destinatario</Text>
              <Text style={styles.sectionSubtitle}>
                Elige de tus clientes guardados para autocompletar todo
              </Text>
            </View>
          </View>

          {/* Selector de Modo */}
          <View style={styles.modeTabs}>
            <TouchableOpacity
              style={[styles.modeTab, clientMode === 'EXISTING' && styles.modeTabActive]}
              onPress={() => setClientMode('EXISTING')}
            >
              <Ionicons
                name="people"
                size={16}
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
              style={[styles.modeTab, clientMode === 'MANUAL' && styles.modeTabActive]}
              onPress={() => {
                setClientMode('MANUAL');
                setSelectedCustomerId(null);
              }}
            >
              <Ionicons
                name="person-add-outline"
                size={16}
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

          {/* MODO CLIENTE EXISTENTE */}
          {clientMode === 'EXISTING' ? (
            <View style={styles.clientSelectedBox}>
              {selectedCustomerObj ? (
                <View style={styles.clientSummaryCard}>
                  <View style={styles.clientAvatar}>
                    <Text style={{ fontSize: 20 }}>
                      {selectedCustomerObj.name.toLowerCase().includes('restaurante')
                        ? '🍽️'
                        : selectedCustomerObj.name.toLowerCase().includes('panader')
                        ? '🥖'
                        : selectedCustomerObj.name.toLowerCase().includes('bodega')
                        ? '🏪'
                        : selectedCustomerObj.name.toLowerCase().includes('lavander')
                        ? '🫧'
                        : '👤'}
                    </Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={styles.clientTitleRow}>
                      <Text style={styles.clientNameText} numberOfLines={1}>
                        {selectedCustomerObj.name}
                      </Text>
                      <View style={styles.linkedBadge}>
                        <Ionicons name="checkmark-circle" size={12} color={COLORS.success} />
                        <Text style={styles.linkedBadgeText}>Cargado</Text>
                      </View>
                    </View>

                    <Text style={styles.clientPhoneText}>
                      📞 {selectedCustomerObj.phone}
                    </Text>
                    <Text style={styles.clientAddressText} numberOfLines={1}>
                      📍 {selectedCustomerObj.deliveryAddress} ({selectedCustomerObj.district})
                    </Text>

                    {Boolean(selectedCustomerObj.latitude && selectedCustomerObj.longitude) && (
                      <View style={styles.gpsReadyRow}>
                        <Ionicons name="navigate-circle" size={12} color={COLORS.success} />
                        <Text style={styles.gpsReadyText}>Coordenadas GPS listas</Text>
                      </View>
                    )}
                  </View>

                  <TouchableOpacity
                    style={styles.changeClientBtn}
                    onPress={() => setIsCustomerModalVisible(true)}
                  >
                    <Text style={styles.changeClientBtnText}>Cambiar</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.selectClientButton}
                  onPress={() => setIsCustomerModalVisible(true)}
                >
                  <Ionicons name="search" size={20} color={COLORS.primary} />
                  <Text style={styles.selectClientButtonText}>
                    Toca aquí para seleccionar un cliente de la lista
                  </Text>
                </TouchableOpacity>
              )}

              {errors.customerName && (
                <Text style={styles.errorInline}>{errors.customerName}</Text>
              )}
            </View>
          ) : (
            /* MODO MANUAL */
            <View style={styles.manualClientForm}>
              <CustomInput
                label="Nombre o Negocio del Cliente *"
                placeholder="Ej. Bodega Don Pepe"
                value={customerName}
                onChangeText={setCustomerName}
                error={errors.customerName}
                icon="business-outline"
              />

              <CustomInput
                label="Teléfono / Celular / WhatsApp *"
                placeholder="Ej. 987654321"
                value={customerPhone}
                onChangeText={setCustomerPhone}
                keyboardType="phone-pad"
                error={errors.customerPhone}
                icon="call-outline"
              />

              <TouchableOpacity
                style={styles.saveClientCheckbox}
                onPress={() => setSaveAsNewCustomer(!saveAsNewCustomer)}
              >
                <Ionicons
                  name={saveAsNewCustomer ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={saveAsNewCustomer ? COLORS.primary : COLORS.textMuted}
                />
                <Text style={styles.saveClientCheckboxText}>
                  Guardar este cliente en "Mis Clientes" para futuros pedidos
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* =================================================================== */}
        {/* SECCIÓN 2: PRODUCTOS Y SERVICIOS */}
        {/* =================================================================== */}
        <View style={styles.cardSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>2</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Productos y Servicios a Entregar</Text>
              <Text style={styles.sectionSubtitle}>
                Selecciona del catálogo o escribe un ítem personalizado
              </Text>
            </View>
          </View>

          {/* Botones para agregar productos */}
          <View style={styles.productActionRow}>
            <TouchableOpacity
              style={styles.addCatalogBtn}
              onPress={() => setIsProductModalVisible(true)}
            >
              <Ionicons name="cart-outline" size={18} color={COLORS.textInverse} />
              <Text style={styles.addCatalogBtnText}>+ De Mis Productos</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.addManualBtn}
              onPress={() => setShowManualProductForm(!showManualProductForm)}
            >
              <Ionicons name="pencil-outline" size={16} color={COLORS.primary} />
              <Text style={styles.addManualBtnText}>+ Ítem Libre</Text>
            </TouchableOpacity>
          </View>

          {/* Mini-formulario de ítem libre/manual */}
          {showManualProductForm && (
            <View style={styles.manualProductBox}>
              <Text style={styles.manualBoxTitle}>Agregar Ítem Manual</Text>
              <TextInput
                style={styles.manualInput}
                placeholder="Nombre del producto o servicio"
                placeholderTextColor={COLORS.textMuted}
                value={manualProductName}
                onChangeText={setManualProductName}
              />
              <View style={styles.manualRow}>
                <TextInput
                  style={[styles.manualInput, { flex: 1 }]}
                  placeholder="Precio Unitario (S/)"
                  placeholderTextColor={COLORS.textMuted}
                  value={manualPrice}
                  onChangeText={setManualPrice}
                  keyboardType="decimal-pad"
                />
                <TextInput
                  style={[styles.manualInput, { flex: 1 }]}
                  placeholder="Unidad (Unidad, Caja)"
                  placeholderTextColor={COLORS.textMuted}
                  value={manualUnit}
                  onChangeText={setManualUnit}
                />
              </View>
              <TouchableOpacity
                style={styles.manualAddConfirmBtn}
                onPress={handleAddManualProduct}
              >
                <Ionicons name="add-circle" size={16} color={COLORS.textInverse} />
                <Text style={styles.manualAddConfirmBtnText}>Agregar al Pedido</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Lista de ítems en el pedido */}
          {orderItems.length > 0 ? (
            <View style={styles.orderItemsList}>
              {orderItems.map((item) => {
                const subtotal = item.quantity * item.unitPrice;
                return (
                  <View key={item.id} style={styles.itemRow}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemNameText}>{item.name}</Text>
                      <Text style={styles.itemPriceUnitText}>
                        {formatCurrency(item.unitPrice)} c/u ({item.unit || 'unidad'})
                      </Text>
                    </View>

                    {/* Selector de cantidad [-] 1 [+] */}
                    <View style={styles.quantityControls}>
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => handleUpdateQuantity(item.id, -1)}
                      >
                        <Ionicons name="remove" size={14} color={COLORS.textPrimary} />
                      </TouchableOpacity>

                      <Text style={styles.qtyText}>{item.quantity}</Text>

                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => handleUpdateQuantity(item.id, 1)}
                      >
                        <Ionicons name="add" size={14} color={COLORS.textPrimary} />
                      </TouchableOpacity>
                    </View>

                    {/* Subtotal y Eliminar */}
                    <View style={styles.itemEnd}>
                      <Text style={styles.subtotalText}>{formatCurrency(subtotal)}</Text>
                      <TouchableOpacity
                        style={styles.removeBtn}
                        onPress={() => handleRemoveItem(item.id)}
                      >
                        <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}

              {/* Total acumulado */}
              <View style={styles.totalSummaryRow}>
                <View>
                  <Text style={styles.totalItemsCount}>
                    {orderItems.reduce((acc, i) => acc + i.quantity, 0)} artículos en total
                  </Text>
                  <Text style={styles.totalLabel}>Monto Total a Cobrar:</Text>
                </View>
                <Text style={styles.totalAmountValue}>{formatCurrency(totalAmount)}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.emptyProductsBox}>
              <Ionicons name="cube-outline" size={32} color={COLORS.textMuted} />
              <Text style={styles.emptyProductsText}>
                No has agregado productos al pedido.
              </Text>
              <Text style={styles.emptyProductsSubtext}>
                Toca "+ De Mis Productos" para cargar del catálogo en 1 toque.
              </Text>
            </View>
          )}

          {errors.orderItems && (
            <Text style={styles.errorInline}>{errors.orderItems}</Text>
          )}
        </View>

        {/* =================================================================== */}
        {/* SECCIÓN 3: UBICACIÓN Y GPS */}
        {/* =================================================================== */}
        <View style={styles.cardSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>3</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Punto de Entrega y Ruta</Text>
              <Text style={styles.sectionSubtitle}>
                {selectedCustomerObj
                  ? 'Datos traídos automáticamente del cliente'
                  : 'Ingresa la dirección de entrega'}
              </Text>
            </View>
          </View>

          <CustomInput
            label="Ciudad / Distrito / Zona *"
            placeholder="Ej. Miraflores, San Borja, etc."
            value={district}
            onChangeText={setDistrict}
            error={errors.district}
            icon="navigate-circle-outline"
          />

          <CustomInput
            label="Dirección de Entrega *"
            placeholder="Ej. Av. Javier Prado Este 2450"
            value={deliveryAddress}
            onChangeText={setDeliveryAddress}
            error={errors.deliveryAddress}
            icon="home-outline"
          />

          <CustomInput
            label="Referencia de Ubicación"
            placeholder="Ej. Frente al parque, puerta verde"
            value={addressReference}
            onChangeText={setAddressReference}
            icon="information-circle-outline"
          />

          {/* Estado de GPS y Acciones */}
          <View style={styles.gpsBanner}>
            <View style={styles.gpsInfoCol}>
              <View style={styles.gpsRow}>
                <Ionicons
                  name={latitude && longitude ? 'pin' : 'location-outline'}
                  size={18}
                  color={latitude && longitude ? COLORS.success : COLORS.textMuted}
                />
                <Text style={styles.gpsStatusTitle}>
                  {latitude && longitude ? 'Ubicación GPS Fijada' : 'Sin coordenadas GPS'}
                </Text>
              </View>
              {latitude && longitude ? (
                <Text style={styles.coordsSubtext}>
                  {latitude.toFixed(4)}, {longitude.toFixed(4)}
                </Text>
              ) : (
                <Text style={styles.coordsSubtext}>
                  Geolocaliza para ver este pedido en el mapa de ruta
                </Text>
              )}
            </View>

            <View style={styles.gpsBtnGroup}>
              <TouchableOpacity
                style={styles.gpsMiniBtn}
                onPress={handleGetLocation}
                disabled={isGettingGps}
              >
                {isGettingGps ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : (
                  <>
                    <Ionicons name="locate-outline" size={14} color={COLORS.primary} />
                    <Text style={styles.gpsMiniBtnText}>Buscar</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.gpsMiniBtn, styles.gpsMiniBtnDark]}
                onPress={() => setIsMapModalVisible(true)}
              >
                <Ionicons name="map-outline" size={14} color={COLORS.textInverse} />
                <Text style={[styles.gpsMiniBtnText, { color: COLORS.textInverse }]}>Mapa</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* =================================================================== */}
        {/* SECCIÓN 4: PAGO, PRIORIDAD Y NOTAS */}
        {/* =================================================================== */}
        <View style={styles.cardSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>4</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Condiciones de Cobro y Operación</Text>
            </View>
          </View>

          {/* Método de pago */}
          <Text style={styles.inputGroupLabel}>Método de Pago</Text>
          <View style={styles.paymentMethodsGrid}>
            {(Object.keys(PAYMENT_METHOD_CONFIG) as PaymentMethod[]).map((method) => {
              const cfg = PAYMENT_METHOD_CONFIG[method];
              const isSelected = paymentMethod === method;
              return (
                <TouchableOpacity
                  key={method}
                  style={[styles.paymentMethodCard, isSelected && styles.paymentMethodCardSelected]}
                  onPress={() => setPaymentMethod(method)}
                >
                  <Ionicons
                    name={cfg.icon as any}
                    size={18}
                    color={isSelected ? COLORS.primary : COLORS.textSecondary}
                  />
                  <Text
                    style={[
                      styles.paymentMethodLabel,
                      isSelected && styles.paymentMethodLabelSelected,
                    ]}
                  >
                    {cfg.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Prioridad */}
          <Text style={[styles.inputGroupLabel, { marginTop: 12 }]}>Prioridad de Entrega</Text>
          <View style={styles.priorityGrid}>
            {(['NORMAL', 'HIGH', 'URGENT'] as OrderPriority[]).map((p) => {
              const cfg = PRIORITY_CONFIG[p];
              const isSelected = priority === p;
              return (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.priorityCard,
                    isSelected && { borderColor: cfg.color, backgroundColor: cfg.bg },
                  ]}
                  onPress={() => setPriority(p)}
                >
                  <Ionicons name={cfg.icon as any} size={16} color={cfg.color} />
                  <Text style={[styles.priorityCardText, isSelected && { color: cfg.color }]}>
                    {cfg.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <CustomInput
            label="Horario Sugerido de Entrega (Opcional)"
            placeholder="Ej. De 10:00 AM a 12:00 PM / Inmediato"
            value={scheduledTime}
            onChangeText={setScheduledTime}
            icon="time-outline"
          />

          <CustomInput
            label="Notas para el Repartidor / Chofer (Opcional)"
            placeholder="Ej. Cobrar con vuelto de S/ 100, timbre malogrado..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={2}
            icon="chatbubble-outline"
          />
        </View>

        {/* Botón Principal de Confirmación */}
        <CustomButton
          title={`Confirmar y Crear Pedido (${formatCurrency(totalAmount)})`}
          icon="checkmark-circle"
          size="lg"
          variant="primary"
          onPress={handleSubmit}
          style={styles.submitButton}
          fullWidth
        />
      </ScrollView>

      {/* =================================================================== */}
      {/* MODAL 1: SELECTOR DE CLIENTES */}
      {/* =================================================================== */}
      <Modal
        visible={isCustomerModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsCustomerModalVisible(false)}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Seleccionar Cliente</Text>
                <Text style={styles.modalSubtitle}>
                  Toca un cliente para traer todos sus datos y ubicación
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setIsCustomerModalVisible(false)}
              >
                <Ionicons name="close" size={22} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Buscador dentro del modal */}
            <View style={styles.modalSearchBox}>
              <Ionicons name="search" size={18} color={COLORS.textMuted} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Buscar por nombre, teléfono o distrito..."
                placeholderTextColor={COLORS.textMuted}
                value={customerSearch}
                onChangeText={setCustomerSearch}
              />
              {customerSearch.length > 0 && (
                <TouchableOpacity onPress={() => setCustomerSearch('')}>
                  <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Lista de clientes para seleccionar */}
            <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={styles.customerPickItem}
                    onPress={() => {
                      applyCustomerData(c.id);
                      setIsCustomerModalVisible(false);
                    }}
                  >
                    <View style={styles.pickAvatar}>
                      <Text style={{ fontSize: 20 }}>
                        {c.name.toLowerCase().includes('restaurante')
                          ? '🍽️'
                          : c.name.toLowerCase().includes('panader')
                          ? '🥖'
                          : c.name.toLowerCase().includes('bodega')
                          ? '🏪'
                          : c.name.toLowerCase().includes('lavander')
                          ? '🫧'
                          : '👤'}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pickNameText}>{c.name}</Text>
                      <Text style={styles.pickAddressText} numberOfLines={1}>
                        📍 {c.deliveryAddress} • {c.district}
                      </Text>
                      <Text style={styles.pickPhoneText}>📞 {c.phone}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyPickContainer}>
                  <Ionicons name="person-outline" size={40} color={COLORS.textMuted} />
                  <Text style={styles.emptyPickTitle}>No se encontró el cliente</Text>
                  <TouchableOpacity
                    style={styles.addClientFromPickBtn}
                    onPress={() => {
                      setIsCustomerModalVisible(false);
                      setClientMode('MANUAL');
                      if (customerSearch) setCustomerName(customerSearch);
                    }}
                  >
                    <Text style={styles.addClientFromPickBtnText}>
                      Ingresar como Cliente Nuevo
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>

      {/* =================================================================== */}
      {/* MODAL 2: CATÁLOGO DE PRODUCTOS */}
      {/* =================================================================== */}
      <Modal
        visible={isProductModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsProductModalVisible(false)}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Agregar de Mis Productos</Text>
                <Text style={styles.modalSubtitle}>
                  Toca un producto para añadirlo al pedido actual
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setIsProductModalVisible(false)}
              >
                <Ionicons name="close" size={22} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Buscador dentro del modal de productos */}
            <View style={styles.modalSearchBox}>
              <Ionicons name="search" size={18} color={COLORS.textMuted} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Buscar producto o unidad..."
                placeholderTextColor={COLORS.textMuted}
                value={productSearch}
                onChangeText={setProductSearch}
              />
              {productSearch.length > 0 && (
                <TouchableOpacity onPress={() => setProductSearch('')}>
                  <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Lista de productos para seleccionar */}
            <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
              {filteredProducts.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={styles.productPickItem}
                  onPress={() => handleAddProductFromCatalog(p)}
                >
                  <View style={[styles.productPickIconBox, { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE' }]}>
                    <Text style={{ fontSize: 20 }}>
                      {p.name.toLowerCase().includes('agua')
                        ? '💧'
                        : p.name.toLowerCase().includes('gas')
                        ? '🔥'
                        : p.name.toLowerCase().includes('harina') || p.name.toLowerCase().includes('pan')
                        ? '🥖'
                        : p.name.toLowerCase().includes('lej') || p.name.toLowerCase().includes('deterg')
                        ? '🧴'
                        : '📦'}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.productPickName}>{p.name}</Text>
                    <Text style={styles.productPickUnit}>Presentación: {p.unit}</Text>
                  </View>
                  <View style={styles.productPickPriceBox}>
                    <Text style={styles.productPickPrice}>{formatCurrency(p.price)}</Text>
                    <View style={styles.productAddBadge}>
                      <Ionicons name="add" size={14} color={COLORS.primary} />
                      <Text style={styles.productAddBadgeText}>Agregar</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Modal de Mapa Interactivo para el Pedido */}
      <LocationPickerModal
        visible={isMapModalVisible}
        onClose={() => setIsMapModalVisible(false)}
        initialLatitude={latitude || -12.0984}
        initialLongitude={longitude || -77.0016}
        title={`Entrega: ${customerName || 'Cliente'}`}
        onSelectLocation={({ latitude: lat, longitude: lng }: { latitude: number; longitude: number }) => {
          setLatitude(lat);
          setLongitude(lng);
          setIsMapModalVisible(false);
          Alert.alert('Punto Fijado', `GPS establecido: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
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
  cardSection: {
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
    shadowRadius: 6,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeText: {
    color: COLORS.textInverse,
    fontWeight: '800',
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.secondary,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 4,
    marginBottom: 14,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modeTabActive: {
    backgroundColor: COLORS.surface,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  modeTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  modeTabTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  clientSelectedBox: {
    marginTop: 4,
  },
  clientSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    gap: 10,
  },
  clientAvatar: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#93C5FD',
  },
  clientAvatarText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.primary,
  },
  clientTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  clientNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    flex: 1,
  },
  linkedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 2,
  },
  linkedBadgeText: {
    fontSize: 10,
    color: COLORS.success,
    fontWeight: '700',
  },
  clientPhoneText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  clientAddressText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  gpsReadyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  gpsReadyText: {
    fontSize: 10,
    color: COLORS.success,
    fontWeight: '600',
  },
  changeClientBtn: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  changeClientBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  selectClientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    gap: 8,
  },
  selectClientButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
    textAlign: 'center',
  },
  manualClientForm: {
    marginTop: 4,
  },
  saveClientCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    marginBottom: 8,
  },
  saveClientCheckboxText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    flex: 1,
  },
  errorInline: {
    fontSize: 12,
    color: COLORS.danger,
    marginTop: 6,
    fontWeight: '600',
  },
  productActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  addCatalogBtn: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  addCatalogBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textInverse,
  },
  addManualBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  addManualBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  manualProductBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
  },
  manualBoxTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.secondary,
    marginBottom: 8,
  },
  manualInput: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  manualRow: {
    flexDirection: 'row',
    gap: 8,
  },
  manualAddConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.secondary,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  manualAddConfirmBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textInverse,
  },
  orderItemsList: {
    marginTop: 4,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  itemInfo: {
    flex: 1,
  },
  itemNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  itemPriceUnitText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginHorizontal: 8,
  },
  qtyBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  qtyText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    minWidth: 20,
    textAlign: 'center',
  },
  itemEnd: {
    alignItems: 'flex-end',
    gap: 4,
  },
  subtotalText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
  },
  removeBtn: {
    padding: 2,
  },
  totalSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  totalItemsCount: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.secondary,
  },
  totalAmountValue: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
  },
  emptyProductsBox: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
  },
  emptyProductsText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 8,
  },
  emptyProductsSubtext: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  gpsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 4,
    gap: 10,
  },
  gpsInfoCol: {
    flex: 1,
  },
  gpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  gpsStatusTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  coordsSubtext: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  gpsBtnGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  gpsMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    gap: 4,
  },
  gpsMiniBtnDark: {
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.secondary,
  },
  gpsMiniBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  inputGroupLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  paymentMethodsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  paymentMethodCardSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: COLORS.primary,
  },
  paymentMethodLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  paymentMethodLabelSelected: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  priorityGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  priorityCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#F8FAFC',
  },
  priorityCardText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  submitButton: {
    marginTop: 8,
  },
  /* Modales */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.secondary,
  },
  modalSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
    marginBottom: 12,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  modalList: {
    maxHeight: 380,
  },
  customerPickItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 12,
  },
  pickAvatar: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  pickAvatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primary,
  },
  pickNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  pickAddressText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  pickPhoneText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  emptyPickContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyPickTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginTop: 8,
    marginBottom: 12,
  },
  addClientFromPickBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addClientFromPickBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textInverse,
  },
  productPickItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 12,
  },
  productPickIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productPickName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  productPickUnit: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  productPickPriceBox: {
    alignItems: 'flex-end',
    gap: 4,
  },
  productPickPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primary,
  },
  productAddBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
  },
  productAddBadgeText: {
    fontSize: 10,
    color: COLORS.primary,
    fontWeight: '700',
  },
});
