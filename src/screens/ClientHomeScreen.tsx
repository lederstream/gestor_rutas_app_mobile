import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  Modal,
  Linking,
  Dimensions,
  Platform,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useOrders } from '../context/OrderContext';
import { useCustomers } from '../context/CustomerContext';
import { useProducts } from '../context/ProductContext';
import { Product } from '../models/Product';
import { Order, OrderItem, PaymentMethod, ProductCategory } from '../models/Order';
import { COLORS, SPACING, RADIUS, TOUCH_TARGET } from '../utils/constants';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { hapticImpact, hapticNotification, hapticSelection } from '../utils/haptics';
import { LocationPickerModal } from '../components/common/LocationPickerModal';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 44) / 2;

type ClientTab = 'CATALOG' | 'ORDER' | 'HISTORY';

interface Props {
  navigation: any;
  route?: any;
}

export const ClientHomeScreen: React.FC<Props> = ({ navigation, route }) => {
  const { user, updateProfile } = useAuth();
  const { orders, addOrder } = useOrders();
  const { products } = useProducts();
  const { updateCustomer, getCustomerById } = useCustomers();

  // Pestaña activa del portal del cliente
  const [currentTab, setCurrentTab] = useState<ClientTab>('CATALOG');

  useEffect(() => {
    if (route?.params?.tab) {
      setCurrentTab(route.params.tab);
    }
  }, [route?.params?.tab]);

  // Filtro de categoría en catálogo
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Carrito de compras Multi-Producto: { [productId]: cantidad }
  const [cart, setCart] = useState<Record<string, number>>({});
  const [isCartModalVisible, setIsCartModalVisible] = useState(false);
  const [cartPaymentMethod, setCartPaymentMethod] = useState<PaymentMethod>('CASH');
  const [cartCashGiven, setCartCashGiven] = useState<string>('');
  const [orderNotes, setOrderNotes] = useState('');

  // Identificador del pedido activo enfocado en el rastreador
  const [selectedActiveOrderId, setSelectedActiveOrderId] = useState<string | null>(null);

  // Modal para fijar PIN GPS en el mapa
  const [isMapModalVisible, setIsMapModalVisible] = useState(false);

  // Categorías del catálogo
  const categories = [
    { key: 'ALL', label: '✨ Todos' },
    { key: 'WATER', label: '💧 Agua' },
    { key: 'GAS', label: '🔥 Gas GLP' },
    { key: 'BAKERY', label: '🥖 Panadería' },
    { key: 'CLEANING', label: '🧴 Limpieza' },
  ];

  // Productos filtrados según categoría
  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'ALL') return products;
    return products.filter((p) => p.category === selectedCategory);
  }, [products, selectedCategory]);

  // Métricas del carrito en tiempo real
  const totalCartItems = useMemo(() => {
    return Object.values(cart).reduce((sum, q) => sum + q, 0);
  }, [cart]);

  const totalCartAmount = useMemo(() => {
    return Object.entries(cart).reduce((sum, [id, qty]) => {
      const prod = products.find((p) => p.id === id);
      return sum + (prod ? prod.price * qty : 0);
    }, 0);
  }, [cart, products]);

  // Lista detallada de artículos en el carrito
  const cartItemsList = useMemo(() => {
    return Object.entries(cart)
      .filter(([_, qty]) => qty > 0)
      .map(([id, qty]) => {
        const prod = products.find((p) => p.id === id);
        return {
          product: prod,
          quantity: qty,
          subtotal: prod ? prod.price * qty : 0,
        };
      })
      .filter((item) => Boolean(item.product));
  }, [cart, products]);

  // Todos los pedidos activos en curso para este cliente (Multi-Despacho Simultáneo)
  const activeOrders = useMemo(() => {
    if (!user) return [];
    return orders.filter(
      (o) =>
        (o.customerId === user.customerId ||
          o.customerName.toLowerCase() === user.name.toLowerCase()) &&
        (o.status === 'PENDING' || o.status === 'IN_TRANSIT')
    );
  }, [orders, user]);

  // Pedido activo enfocado actualmente en el rastreador
  const activeOrder = useMemo(() => {
    if (activeOrders.length === 0) return null;
    if (selectedActiveOrderId) {
      const found = activeOrders.find((o) => o.id === selectedActiveOrderId);
      if (found) return found;
    }
    return activeOrders[0];
  }, [activeOrders, selectedActiveOrderId]);

  // Rubro especializado actual del carrito (Garantiza transporte mono-rubro por vehículo)
  const cartCategory = useMemo(() => {
    return cartItemsList.length > 0 ? cartItemsList[0].product?.category : null;
  }, [cartItemsList]);

  // Historial de compras anteriores
  const pastOrders = useMemo(() => {
    if (!user) return [];
    return orders.filter(
      (o) =>
        (o.customerId === user.customerId ||
          o.customerName.toLowerCase() === user.name.toLowerCase()) &&
        (o.status === 'DELIVERED' || o.status === 'CANCELLED')
    );
  }, [orders, user]);

  // Gestión de cantidades en el carrito con validación de vehículo especializado
  const handleAddToCart = (productId: string) => {
    const targetProduct = products.find((p) => p.id === productId);
    if (!targetProduct) return;

    if (cartCategory && cartCategory !== targetProduct.category) {
      hapticNotification('warning');
      const getCategoryShortName = (c: string) => {
        switch (c) {
          case 'WATER':
            return 'Agua';
          case 'GAS':
            return 'Gas GLP';
          case 'BAKERY':
            return 'Panadería';
          case 'CLEANING':
            return 'Limpieza';
          default:
            return 'otro rubro';
        }
      };

      const currentName = getCategoryShortName(cartCategory);
      const newName = getCategoryShortName(targetProduct.category);

      Alert.alert(
        'Reparto en camión separado 🚚',
        `Ya tienes productos de ${currentName} en tu carrito. Los productos de ${newName} se entregan en otro vehículo especializado.\n\n¿Deseas cambiar tu carrito a este producto?`,
        [
          { text: 'Mantener actual', style: 'cancel' },
          {
            text: 'Sí, cambiar',
            style: 'destructive',
            onPress: () => {
              hapticImpact('medium');
              setCart({ [productId]: 1 });
            },
          },
        ]
      );
      return;
    }

    hapticImpact('light');
    setCart((prev) => ({
      ...prev,
      [productId]: (prev[productId] || 0) + 1,
    }));
  };

  const handleUpdateCartQuantity = (productId: string, delta: number) => {
    hapticSelection();
    setCart((prev) => {
      const current = prev[productId] || 0;
      const next = current + delta;
      if (next <= 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return { ...prev, [productId]: next };
    });
  };

  // Enviar pedido consolidado multi-producto
  const handleConfirmCartOrder = () => {
    if (cartItemsList.length === 0 || !user) return;

    // Validación OBLIGATORIA: El cliente debe tener su PIN fijado en el mapa de Tacna
    if (!user.latitude || !user.longitude) {
      hapticNotification('warning');
      Alert.alert(
        'Fija tu Ubicación en el Mapa 📍',
        'Para que el camión repartidor llegue directo a tu puerta, es obligatorio marcar tu punto de entrega con el PIN en el mapa.',
        [
          {
            text: 'Fijar en Mapa Ahora',
            onPress: () => {
              setIsCartModalVisible(false);
              setIsMapModalVisible(true);
            },
          },
        ]
      );
      return;
    }

    hapticImpact('heavy');
    const newCode = `PED-${Math.floor(1000 + Math.random() * 9000)}`;

    const orderItems: OrderItem[] = cartItemsList.map(({ product, quantity }) => ({
      id: `item-${Date.now()}-${product!.id}`,
      name: product!.name,
      quantity,
      unitPrice: product!.price,
      unit: product!.unit,
    }));

    // Asignar al Distribuidor Especializado y Vehículo según el rubro único del carrito
    const detectedCategory: ProductCategory = cartCategory || 'WATER';
    let assignedDistributor = 'Carlos Mendoza (Camión 02 - Agua)';

    if (detectedCategory === 'GAS') {
      assignedDistributor = 'Manuel Choque (Camión 05 - Gas GLP)';
    } else if (detectedCategory === 'BAKERY') {
      assignedDistributor = 'Rosa Quispe (Furgón 01 - Panadería)';
    } else if (detectedCategory === 'CLEANING') {
      assignedDistributor = 'Roberto Flores (Camioneta 03 - Limpieza)';
    }

    const consolidatedOrder: Order = {
      id: `ord-${Date.now()}`,
      orderCode: newCode,
      customerId: user.customerId,
      customerName: user.name,
      customerPhone: user.phone,
      deliveryAddress: user.deliveryAddress || 'Dirección registrada',
      district: user.district || 'Tacna',
      addressReference: user.addressReference,
      latitude: user.latitude || -18.0139,
      longitude: user.longitude || -70.2519,
      category: detectedCategory,
      items: orderItems,
      totalAmount: totalCartAmount,
      paymentMethod: cartPaymentMethod,
      paymentStatus: 'PENDING',
      amountPaid:
        cartPaymentMethod === 'CASH'
          ? cartCashGiven === 'EXACT'
            ? totalCartAmount
            : cartCashGiven && parseFloat(cartCashGiven) >= totalCartAmount
            ? parseFloat(cartCashGiven)
            : undefined
          : undefined,
      changeDue:
        cartPaymentMethod === 'CASH'
          ? cartCashGiven === 'EXACT'
            ? 0
            : cartCashGiven && parseFloat(cartCashGiven) > totalCartAmount
            ? parseFloat(cartCashGiven) - totalCartAmount
            : undefined
          : undefined,
      priority: 'HIGH',
      status: 'PENDING',
      driverAssigned: assignedDistributor,
      notes: orderNotes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    addOrder(consolidatedOrder);
    hapticNotification('success');

    // Limpiar carrito y cerrar modal
    setCart({});
    setIsCartModalVisible(false);
    setOrderNotes('');
    setCartCashGiven('');

    // Conmutar a la vista de seguimiento
    setCurrentTab('ORDER');

    Alert.alert(
      '¡Pedido Consolidado Enviado! 🚀',
      `Recibimos tu solicitud ${newCode} con ${totalCartItems} productos por ${formatCurrency(
        totalCartAmount
      )}. El distribuidor especializado ya lo tiene en su hoja de ruta.`
    );
  };

  // Guardar ubicación GPS seleccionada en el mapa
  const handleSelectGpsLocation = async (coords: { latitude: number; longitude: number }) => {
    setIsMapModalVisible(false);
    hapticImpact('medium');

    const res = await updateProfile({
      latitude: coords.latitude,
      longitude: coords.longitude,
    });

    if (user?.customerId) {
      const existing = getCustomerById(user.customerId);
      if (existing) {
        updateCustomer({
          ...existing,
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
      }
    }

    if (res.success) {
      Alert.alert(
        'Ubicación Guardada 🎉',
        'Tu PIN GPS ha sido fijado en el mapa de Tacna. Tus pedidos llegarán con precisión exacta.'
      );
    }
  };

  // Repetir pedido anterior
  const handleRepeatPastOrder = (pastOrder: Order) => {
    if (!user) return;
    hapticImpact('medium');

    const newCode = `PED-${Math.floor(1000 + Math.random() * 9000)}`;

    const repeatedOrder: Order = {
      ...pastOrder,
      id: `ord-${Date.now()}`,
      orderCode: newCode,
      status: 'PENDING',
      paymentStatus: 'PENDING',
      createdAt: new Date().toISOString(),
      deliveredAt: undefined,
    };

    addOrder(repeatedOrder);
    hapticNotification('success');
    setCurrentTab('ORDER');

    Alert.alert(
      '¡Pedido Repetido! 🔁',
      `Tu pedido habitual ${newCode} fue generado con éxito.`
    );
  };

  const handleCallDriver = (phone: string = '987111222') => {
    Linking.openURL(`tel:${phone}`).catch(() => {});
  };

  const handleWhatsAppDriver = () => {
    const text = encodeURIComponent(
      `Hola, le saludo de ${user?.name}. Estoy esperando mi pedido ${activeOrder?.orderCode}.`
    );
    Linking.openURL(`https://wa.me/51987111222?text=${text}`).catch(() => {});
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

      {/* CABECERA PRINCIPAL: IDENTIDAD Y ACCESO A FIJAR PIN */}
      <View style={styles.topHeader}>
        <View style={styles.headerInfoCol}>
          <Text style={styles.welcomeGreeting}>¡Hola, {user?.name}! 👋</Text>
          <TouchableOpacity
            style={styles.addressClickRow}
            onPress={() => setIsMapModalVisible(true)}
            activeOpacity={0.75}
          >
            <Ionicons name="location-sharp" size={14} color={COLORS.primary} />
            <Text style={styles.addressLine} numberOfLines={1}>
              {user?.deliveryAddress || 'Tacna Centro'}
            </Text>
            <View style={styles.gpsPillTag}>
              <Text style={styles.gpsPillTagText}>
                {user?.latitude ? '📍 PIN Listo' : '⚪ Fijar PIN'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* VISTA 1: CATÁLOGO EN CUADRÍCULA 2X2 CON CARRITO MULTI-PRODUCTO */}
      {currentTab === 'CATALOG' && (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Banner compacto si hay entrega en curso (Soporte Multi-Despacho) */}
          {activeOrders.length > 0 && (
            <TouchableOpacity
              style={styles.activeOrderBannerCompact}
              onPress={() => {
                hapticSelection();
                setCurrentTab('ORDER');
              }}
              activeOpacity={0.85}
            >
              <View style={styles.pulseDot} />
              <View style={{ flex: 1 }}>
                <Text style={styles.activeOrderBannerCompactTitle}>
                  {activeOrders.length > 1
                    ? `¡Tienes ${activeOrders.length} despachos activos en camino!`
                    : activeOrder?.status === 'IN_TRANSIT'
                    ? '¡Tu carga viene en camino!'
                    : 'Pedido en preparación en almacén'}
                </Text>
                <Text style={styles.activeOrderBannerCompactSub}>
                  {activeOrders.length > 1
                    ? `${activeOrders.map((o) => o.orderCode).join(', ')} • Toca para rastrear camiones`
                    : `${activeOrder?.orderCode} • Toca para ver el distribuidor y radar`}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
            </TouchableOpacity>
          )}

          {/* Filtro Combobox Compacto de Categorías */}
          <View style={styles.categoryFilterRow}>
            <TouchableOpacity
              style={styles.categoryFilterPill}
              onPress={() => {
                hapticImpact('light');
                setIsCategoryModalOpen(true);
              }}
              activeOpacity={0.8}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="funnel" size={14} color={COLORS.primary} />
                <Text style={styles.categoryFilterLabel}>Rubro:</Text>
                <Text style={styles.categoryFilterValue}>
                  {categories.find((c) => c.key === selectedCategory)?.label || '✨ Todos'}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={15} color="#64748B" />
            </TouchableOpacity>

            {selectedCategory !== 'ALL' && (
              <TouchableOpacity
                style={styles.categoryResetBtn}
                onPress={() => {
                  hapticSelection();
                  setSelectedCategory('ALL');
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          {/* Cuadrícula 2 Columnas de Productos */}
          <View style={styles.gridContainer}>
            {filteredProducts.map((product) => {
              const emoji =
                product.category === 'WATER'
                  ? '💧'
                  : product.category === 'GAS'
                  ? '🔥'
                  : product.category === 'BAKERY'
                  ? '🥖'
                  : '🧴';

              const qtyInCart = cart[product.id] || 0;

              return (
                <View key={product.id} style={styles.gridCard}>
                  <View style={styles.cardEmojiHeader}>
                    <Text style={{ fontSize: 26 }}>{emoji}</Text>
                    <View style={styles.unitPill}>
                      <Text style={styles.unitPillText}>{product.unit || 'Unidad'}</Text>
                    </View>
                  </View>

                  <Text style={styles.gridProductName} numberOfLines={2}>
                    {product.name}
                  </Text>

                  <View style={styles.gridBottomRow}>
                    <Text style={styles.gridPriceText}>{formatCurrency(product.price)}</Text>

                    {/* Selector de cantidad o botón de agregar */}
                    {qtyInCart === 0 ? (
                      <TouchableOpacity
                        style={styles.gridAddBtn}
                        onPress={() => handleAddToCart(product.id)}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="add" size={18} color="#FFFFFF" />
                        <Text style={styles.gridAddBtnText}>Pedir</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.gridStepperGroup}>
                        <TouchableOpacity
                          style={styles.gridStepperBtn}
                          onPress={() => handleUpdateCartQuantity(product.id, -1)}
                        >
                          <Ionicons name="remove" size={14} color={COLORS.primary} />
                        </TouchableOpacity>
                        <Text style={styles.gridStepperValue}>{qtyInCart}</Text>
                        <TouchableOpacity
                          style={styles.gridStepperBtn}
                          onPress={() => handleUpdateCartQuantity(product.id, 1)}
                        >
                          <Ionicons name="add" size={14} color={COLORS.primary} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* VISTA 2: RASTREADOR EN VIVO DE MI PEDIDO */}
      {currentTab === 'ORDER' && (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Selector de Despachos en Curso (Multi-Camión) */}
          {activeOrders.length > 1 && (
            <View style={styles.multiDispatchCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Ionicons name="layers" size={15} color={COLORS.primary} />
                <Text style={styles.multiDispatchTitle}>
                  Despachos en Curso ({activeOrders.length} camiones en camino)
                </Text>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
              >
                {activeOrders.map((ord) => {
                  const isSel = ord.id === activeOrder?.id;
                  const catEmoji =
                    ord.category === 'GAS'
                      ? '🔥'
                      : ord.category === 'WATER'
                      ? '💧'
                      : ord.category === 'BAKERY'
                      ? '🥖'
                      : '🧴';
                  const catLabel =
                    ord.category === 'GAS'
                      ? 'Gas GLP'
                      : ord.category === 'WATER'
                      ? 'Agua'
                      : ord.category === 'BAKERY'
                      ? 'Panadería'
                      : 'Limpieza';

                  return (
                    <TouchableOpacity
                      key={ord.id}
                      style={[styles.multiDispatchTab, isSel && styles.multiDispatchTabActive]}
                      onPress={() => {
                        hapticSelection();
                        setSelectedActiveOrderId(ord.id);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={{ fontSize: 16 }}>{catEmoji}</Text>
                      <View>
                        <Text
                          style={[
                            styles.multiDispatchTabText,
                            isSel && styles.multiDispatchTabTextActive,
                          ]}
                        >
                          {catLabel} • {ord.orderCode}
                        </Text>
                        <Text
                          style={[
                            styles.multiDispatchTabSub,
                            isSel && styles.multiDispatchTabSubActive,
                          ]}
                        >
                          {ord.status === 'IN_TRANSIT' ? 'En Ruta 🚚' : 'Preparando 📦'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {activeOrder ? (
            <View style={styles.trackerCard}>
              <View style={styles.trackerHeaderRow}>
                <View
                  style={[
                    styles.statusBadge,
                    activeOrder.status === 'IN_TRANSIT' && styles.statusBadgeInTransit,
                  ]}
                >
                  <View
                    style={[
                      styles.pulseDot,
                      activeOrder.status === 'IN_TRANSIT' && styles.pulseDotInTransit,
                    ]}
                  />
                  <Text style={styles.statusBadgeText}>
                    {activeOrder.status === 'IN_TRANSIT'
                      ? 'EN RUTA A TU LOCAL'
                      : 'ORDEN RECIBIDA'}
                  </Text>
                </View>
                <Text style={styles.trackerOrderCode}>{activeOrder.orderCode}</Text>
              </View>

              {/* Stepper Visual de Progreso */}
              <View style={styles.stepperContainer}>
                <View style={styles.stepCol}>
                  <View style={[styles.stepCircle, styles.stepCircleCompleted]}>
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  </View>
                  <Text style={styles.stepLabelActive}>Recibido</Text>
                </View>

                <View
                  style={[
                    styles.stepLine,
                    activeOrder.status === 'IN_TRANSIT' && styles.stepLineActive,
                  ]}
                />

                <View style={styles.stepCol}>
                  <View
                    style={[
                      styles.stepCircle,
                      activeOrder.status === 'IN_TRANSIT'
                        ? styles.stepCircleActive
                        : styles.stepCirclePending,
                    ]}
                  >
                    <Ionicons
                      name="bicycle"
                      size={14}
                      color={activeOrder.status === 'IN_TRANSIT' ? '#FFFFFF' : '#94A3B8'}
                    />
                  </View>
                  <Text
                    style={
                      activeOrder.status === 'IN_TRANSIT'
                        ? styles.stepLabelActive
                        : styles.stepLabelMuted
                    }
                  >
                    En Ruta
                  </Text>
                </View>

                <View style={styles.stepLine} />

                <View style={styles.stepCol}>
                  <View style={[styles.stepCircle, styles.stepCirclePending]}>
                    <Ionicons name="storefront" size={14} color="#94A3B8" />
                  </View>
                  <Text style={styles.stepLabelMuted}>Entrega</Text>
                </View>
              </View>

              {/* Ficha del Conductor con Contacto Rápido */}
              <View style={styles.driverBox}>
                <View style={styles.driverAvatar}>
                  <Ionicons name="person" size={20} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.driverNameTitle}>
                    {activeOrder.driverAssigned || 'Carlos Mendoza (Camión 02)'}
                  </Text>
                  <Text style={styles.driverSubText}>Distribuidor oficial en camino</Text>
                </View>
                <View style={styles.driverActionsRow}>
                  <TouchableOpacity
                    style={styles.driverActionBtn}
                    onPress={() => handleCallDriver()}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="call" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.driverActionBtn, { backgroundColor: '#16A34A' }]}
                    onPress={handleWhatsAppDriver}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="logo-whatsapp" size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Desglose de Artículos Consolidados */}
              <View style={styles.orderSummaryCard}>
                <Text style={styles.orderSummaryTitle}>Artículos del Despacho</Text>
                {activeOrder.items.map((item, idx) => (
                  <View key={idx} style={styles.summaryItemRow}>
                    <Text style={styles.summaryItemName}>
                      {item.quantity}x {item.name}
                    </Text>
                    <Text style={styles.summaryItemPrice}>
                      {formatCurrency(item.quantity * item.unitPrice)}
                    </Text>
                  </View>
                ))}
                <View style={styles.divider} />
                <View style={styles.totalRowSummary}>
                  <Text style={styles.totalRowSummaryLabel}>Total a Pagar:</Text>
                  <Text style={styles.totalRowSummaryValue}>
                    {formatCurrency(activeOrder.totalAmount)}
                  </Text>
                </View>
                <Text style={styles.paymentMethodNotice}>
                  Pago: {activeOrder.paymentMethod === 'CASH' ? 'Efectivo al recibir' : 'Yape / Plin Digital'}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.emptyStateCard}>
              <View style={styles.emptyStateIconCircle}>
                <Ionicons name="cube-outline" size={36} color={COLORS.primary} />
              </View>
              <Text style={styles.emptyStateTitle}>Sin Pedidos en Curso</Text>
              <Text style={styles.emptyStateSub}>
                En este momento no tienes despachos en camino. Agrega productos de tu preferencia al carrito.
              </Text>
              <TouchableOpacity
                style={styles.goToCatalogBtn}
                onPress={() => {
                  hapticSelection();
                  setCurrentTab('CATALOG');
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="cart" size={16} color="#FFFFFF" />
                <Text style={styles.goToCatalogBtnText}>Ir al Catálogo de Productos</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      {/* VISTA 3: HISTORIAL CON RE-PEDIDO EN 1 CLIC */}
      {currentTab === 'HISTORY' && (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {pastOrders.length > 0 ? (
            <View style={{ gap: 12 }}>
              {pastOrders.map((past) => (
                <View key={past.id} style={styles.historyCard}>
                  <View style={styles.historyCardTop}>
                    <View>
                      <Text style={styles.historyOrderCode}>{past.orderCode}</Text>
                      <Text style={styles.historyDate}>{formatDateTime(past.createdAt)}</Text>
                    </View>
                    <View style={styles.deliveredPill}>
                      <Ionicons name="checkmark-circle" size={13} color="#059669" />
                      <Text style={styles.deliveredPillText}>Entregado</Text>
                    </View>
                  </View>

                  <Text style={styles.historyItemsSummary} numberOfLines={2}>
                    {past.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                  </Text>

                  <View style={styles.historyCardBottom}>
                    <Text style={styles.historyTotalText}>
                      {formatCurrency(past.totalAmount)}
                    </Text>

                    <TouchableOpacity
                      style={styles.repeatOrderBtn}
                      onPress={() => handleRepeatPastOrder(past)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="refresh" size={14} color={COLORS.primary} />
                      <Text style={styles.repeatOrderBtnText}>Repetir Pedido</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyStateCard}>
              <View style={styles.emptyStateIconCircle}>
                <Ionicons name="receipt-outline" size={36} color={COLORS.textMuted} />
              </View>
              <Text style={styles.emptyStateTitle}>Sin Compras Anteriores</Text>
              <Text style={styles.emptyStateSub}>
                Tus pedidos completados quedarán registrados aquí para que puedas repetirlos en 1 solo clic.
              </Text>
              <TouchableOpacity
                style={styles.goToCatalogBtn}
                onPress={() => {
                  hapticSelection();
                  setCurrentTab('CATALOG');
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="cart" size={16} color="#FFFFFF" />
                <Text style={styles.goToCatalogBtnText}>Hacer mi Primer Pedido</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      {/* BARRA FLOTANTE DE CARRITO ACTIVO (APARECE CUANDO HAY ARTÍCULOS) */}
      {totalCartItems > 0 && currentTab === 'CATALOG' && (
        <View style={styles.floatingCartContainer} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.floatingCartBar}
            onPress={() => {
              hapticImpact('medium');
              setIsCartModalVisible(true);
            }}
            activeOpacity={0.88}
          >
            <View style={styles.floatingCartLeft}>
              <View style={styles.floatingCartBadge}>
                <Text style={styles.floatingCartBadgeText}>{totalCartItems}</Text>
              </View>
              <View>
                <Text style={styles.floatingCartTitle}>
                  {totalCartItems === 1 ? '1 producto seleccionado' : `${totalCartItems} productos seleccionados`}
                </Text>
                <Text style={styles.floatingCartAmount}>
                  Total: {formatCurrency(totalCartAmount)}
                </Text>
              </View>
            </View>

            <View style={styles.floatingCartRightBtn}>
              <Text style={styles.floatingCartRightBtnText}>Ver Pedido</Text>
              <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* FOOTER EN BURBUJAS FLOTANTES CON MÁSCARA DE PROTECCIÓN INFERIOR */}
      <View style={styles.dockOuterContainer} pointerEvents="box-none">
        {/* Máscara inferior suave para evitar que el texto choque al hacer scroll */}
        <View style={styles.dockBackdropBlur} />

        <View style={styles.dockCapsule}>
          {/* Burbuja 1: Catálogo */}
          <TouchableOpacity
            style={[styles.dockItem, currentTab === 'CATALOG' && styles.dockItemActive]}
            onPress={() => {
              hapticSelection();
              setCurrentTab('CATALOG');
            }}
            activeOpacity={0.78}
          >
            <Ionicons
              name={currentTab === 'CATALOG' ? 'cube' : 'cube-outline'}
              size={20}
              color={currentTab === 'CATALOG' ? COLORS.primary : '#64748B'}
            />
            <Text
              style={[
                styles.dockLabel,
                currentTab === 'CATALOG' ? styles.dockLabelActive : styles.dockLabelInactive,
              ]}
            >
              Catálogo
            </Text>
          </TouchableOpacity>

          {/* Burbuja 2: Mi Pedido */}
          <TouchableOpacity
            style={[styles.dockItem, currentTab === 'ORDER' && styles.dockItemActive]}
            onPress={() => {
              hapticSelection();
              setCurrentTab('ORDER');
            }}
            activeOpacity={0.78}
          >
            <View style={styles.dockIconWrapper}>
              <Ionicons
                name={currentTab === 'ORDER' ? 'bicycle' : 'bicycle-outline'}
                size={20}
                color={currentTab === 'ORDER' ? COLORS.primary : '#64748B'}
              />
              {activeOrders.length > 0 && (
                <View style={styles.dockBadgeRed}>
                  <Text style={styles.dockBadgeText}>{activeOrders.length}</Text>
                </View>
              )}
            </View>
            <Text
              style={[
                styles.dockLabel,
                currentTab === 'ORDER' ? styles.dockLabelActive : styles.dockLabelInactive,
              ]}
            >
              Mi Pedido
            </Text>
          </TouchableOpacity>

          {/* Burbuja 3: Historial */}
          <TouchableOpacity
            style={[styles.dockItem, currentTab === 'HISTORY' && styles.dockItemActive]}
            onPress={() => {
              hapticSelection();
              setCurrentTab('HISTORY');
            }}
            activeOpacity={0.78}
          >
            <Ionicons
              name={currentTab === 'HISTORY' ? 'receipt' : 'receipt-outline'}
              size={18}
              color={currentTab === 'HISTORY' ? COLORS.primary : '#64748B'}
            />
            <Text
              style={[
                styles.dockLabel,
                currentTab === 'HISTORY' ? styles.dockLabelActive : styles.dockLabelInactive,
              ]}
            >
              Historial
            </Text>
          </TouchableOpacity>

          {/* Burbuja 4: Mi Perfil */}
          <TouchableOpacity
            style={styles.dockItem}
            onPress={() => {
              hapticSelection();
              navigation.navigate('ProfileScreen');
            }}
            activeOpacity={0.78}
          >
            <Ionicons
              name="person-outline"
              size={18}
              color="#64748B"
            />
            <Text style={[styles.dockLabel, styles.dockLabelInactive]}>
              Mi Perfil
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* MODAL DE REVISIÓN Y DESPACHO DEL CARRITO CONSOLIDADO */}
      <Modal
        visible={isCartModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsCartModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.cartModalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTitle}>Tu Carrito de Pedido</Text>
                <Text style={styles.modalSubtitle}>
                  {totalCartItems} {totalCartItems === 1 ? 'artículo consolidado' : 'artículos consolidados'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsCartModalVisible(false)}>
                <Ionicons name="close-circle" size={24} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 360 }}>
              {/* Lista de Artículos en el Carrito */}
              <View style={{ gap: 8 }}>
                {cartItemsList.map(({ product, quantity, subtotal }) => (
                  <View key={product!.id} style={styles.cartItemRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cartItemName}>{product!.name}</Text>
                      <Text style={styles.cartItemUnit}>
                        {formatCurrency(product!.price)} x {product!.unit || 'und'}
                      </Text>
                    </View>

                    {/* Stepper de cantidad */}
                    <View style={styles.cartItemStepper}>
                      <TouchableOpacity
                        style={styles.cartStepperBtn}
                        onPress={() => handleUpdateCartQuantity(product!.id, -1)}
                      >
                        <Ionicons name="remove" size={14} color={COLORS.textPrimary} />
                      </TouchableOpacity>
                      <Text style={styles.cartStepperValue}>{quantity}</Text>
                      <TouchableOpacity
                        style={styles.cartStepperBtn}
                        onPress={() => handleUpdateCartQuantity(product!.id, 1)}
                      >
                        <Ionicons name="add" size={14} color={COLORS.textPrimary} />
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.cartItemSubtotal}>{formatCurrency(subtotal)}</Text>
                  </View>
                ))}
              </View>

              {/* Confirmación de Dirección y GPS */}
              <View style={styles.cartAddressCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={styles.cartAddressTitle}>Punto de Entrega</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setIsCartModalVisible(false);
                      setIsMapModalVisible(true);
                    }}
                  >
                    <Text style={styles.cartChangeGpsLink}>
                      {user?.latitude ? 'Cambiar PIN GPS' : 'Fijar en Mapa'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.cartAddressText}>
                  📍 {user?.deliveryAddress || 'Tacna Centro'}
                </Text>
                {user?.addressReference ? (
                  <Text style={styles.cartAddressRef}>Ref: {user.addressReference}</Text>
                ) : null}

                {!user?.latitude && (
                  <TouchableOpacity
                    style={styles.missingGpsPillAlert}
                    onPress={() => {
                      setIsCartModalVisible(false);
                      setIsMapModalVisible(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="location" size={14} color="#DC2626" />
                    <Text style={styles.missingGpsPillAlertText}>
                      Obligatorio: Toca aquí para fijar tu PIN en el mapa
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Método de Pago */}
              <View style={styles.paymentSection}>
                <Text style={styles.paymentLabel}>Forma de Pago:</Text>
                <View style={styles.paymentOptionsRow}>
                  <TouchableOpacity
                    style={[
                      styles.paymentOptionBtn,
                      cartPaymentMethod === 'CASH' && styles.paymentOptionActive,
                    ]}
                    onPress={() => setCartPaymentMethod('CASH')}
                  >
                    <Text style={{ fontSize: 16 }}>💵</Text>
                    <Text
                      style={[
                        styles.paymentOptionText,
                        cartPaymentMethod === 'CASH' && styles.paymentOptionTextActive,
                      ]}
                    >
                      Efectivo
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.paymentOptionBtn,
                      cartPaymentMethod === 'YAPE_PLIN' && styles.paymentOptionActive,
                    ]}
                    onPress={() => setCartPaymentMethod('YAPE_PLIN')}
                  >
                    <Text style={{ fontSize: 16 }}>📱</Text>
                    <Text
                      style={[
                        styles.paymentOptionText,
                        cartPaymentMethod === 'YAPE_PLIN' && styles.paymentOptionTextActive,
                      ]}
                    >
                      Yape / Plin
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Selección de Billete si es Efectivo */}
                {cartPaymentMethod === 'CASH' && (
                  <View style={{ marginTop: 10 }}>
                    <Text style={styles.paymentSubLabel}>
                      ¿Con cuánto pagarás? (Para que el repartidor lleve vuelto):
                    </Text>
                    <View style={styles.cashQuickChipsRow}>
                      <TouchableOpacity
                        style={[
                          styles.cashQuickChip,
                          cartCashGiven === 'EXACT' && styles.cashQuickChipActive,
                        ]}
                        onPress={() => {
                          hapticSelection();
                          setCartCashGiven(cartCashGiven === 'EXACT' ? '' : 'EXACT');
                        }}
                      >
                        <Text
                          style={[
                            styles.cashQuickChipText,
                            cartCashGiven === 'EXACT' && styles.cashQuickChipTextActive,
                          ]}
                        >
                          Exacto ({formatCurrency(totalCartAmount)})
                        </Text>
                      </TouchableOpacity>

                      {[50, 100].map((denomination) => (
                        <TouchableOpacity
                          key={denomination}
                          style={[
                            styles.cashQuickChip,
                            cartCashGiven === String(denomination) && styles.cashQuickChipActive,
                          ]}
                          onPress={() => {
                            hapticSelection();
                            setCartCashGiven(cartCashGiven === String(denomination) ? '' : String(denomination));
                          }}
                        >
                          <Text
                            style={[
                              styles.cashQuickChipText,
                              cartCashGiven === String(denomination) && styles.cashQuickChipTextActive,
                            ]}
                          >
                            Billete S/ {denomination}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>

              {/* Instrucción o Nota Especial */}
              <View style={{ marginVertical: 8 }}>
                <Text style={styles.paymentLabel}>Instrucciones para el Distribuidor:</Text>
                <TextInput
                  style={styles.notesInput}
                  value={orderNotes}
                  onChangeText={setOrderNotes}
                  placeholder="Ej. Tocar timbre o portón negro"
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>
            </ScrollView>

            {/* Total y Botón de Despacho */}
            <View style={styles.totalRow}>
              <Text style={styles.totalRowLabel}>Total a Pagar:</Text>
              <Text style={styles.totalRowValue}>{formatCurrency(totalCartAmount)}</Text>
            </View>

            <TouchableOpacity
              style={styles.confirmOrderFinalBtn}
              onPress={handleConfirmCartOrder}
              activeOpacity={0.88}
            >
              <Ionicons name="flash" size={18} color="#FFFFFF" />
              <Text style={styles.confirmOrderFinalBtnText}>
                Confirmar y Despachar Pedido
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal para fijar ubicación GPS en el mapa */}
      <LocationPickerModal
        visible={isMapModalVisible}
        onClose={() => setIsMapModalVisible(false)}
        onSelectLocation={handleSelectGpsLocation}
        initialLatitude={user?.latitude || -18.0139}
        initialLongitude={user?.longitude || -70.2519}
        title="Fijar tu PIN de Entrega"
        subtitle="Mueve el mapa para que el distribuidor llegue a tu puerta exacta"
        addressHint={user?.deliveryAddress || 'Tacna Centro'}
      />

      {/* MODAL BOTTOM-SHEET PARA SELECCIONAR CATEGORÍA/RUBRO DEL CATÁLOGO */}
      <Modal
        visible={isCategoryModalOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsCategoryModalOpen(false)}
      >
        <TouchableOpacity
          style={styles.categoryModalBackdrop}
          activeOpacity={1}
          onPress={() => setIsCategoryModalOpen(false)}
        >
          <View
            style={styles.categoryModalSheet}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.categoryModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="funnel" size={18} color={COLORS.primary} />
                <Text style={styles.categoryModalTitle}>Filtrar Catálogo por Rubro</Text>
              </View>
              <TouchableOpacity onPress={() => setIsCategoryModalOpen(false)}>
                <Ionicons name="close-circle" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 320 }}>
              {categories.map((cat) => {
                const isSelected = selectedCategory === cat.key;
                return (
                  <TouchableOpacity
                    key={cat.key}
                    style={[
                      styles.categoryOptionItem,
                      isSelected && styles.categoryOptionItemActive,
                    ]}
                    onPress={() => {
                      hapticSelection();
                      setSelectedCategory(cat.key);
                      setIsCategoryModalOpen(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                      size={18}
                      color={isSelected ? COLORS.primary : '#94A3B8'}
                    />
                    <Text
                      style={[
                        styles.categoryOptionText,
                        isSelected && styles.categoryOptionTextActive,
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerInfoCol: {
    flex: 1,
    marginRight: 10,
  },
  welcomeGreeting: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  addressClickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  addressLine: {
    fontSize: 12,
    color: COLORS.textSecondary,
    maxWidth: 160,
  },
  gpsPillTag: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginLeft: 4,
  },
  gpsPillTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primary,
  },
  headerProfileBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#6EE7B7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarEmoji: {
    fontSize: 20,
  },
  headerProfileText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: 130, // Amplio espacio para que el contenido no quede oculto detrás del navbar flotante
  },
  /* Banner Compacto de Pedido Activo en Catálogo */
  activeOrderBannerCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    gap: 10,
  },
  activeOrderBannerCompactTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
  },
  activeOrderBannerCompactSub: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  /* Filtro Combobox de Categorías (Píldora Única) */
  categoryFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: SPACING.md,
  },
  categoryFilterPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  categoryFilterLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  categoryFilterValue: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  categoryResetBtn: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  /* Cuadrícula 2x2 */
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridCard: {
    width: CARD_WIDTH,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    justifyContent: 'space-between',
  },
  cardEmojiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  unitPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  unitPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  gridProductName: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
    minHeight: 38,
  },
  gridBottomRow: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gridPriceText: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.primary,
  },
  gridAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    gap: 2,
  },
  gridAddBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  gridStepperGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  gridStepperBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  gridStepperValue: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
    minWidth: 16,
    textAlign: 'center',
  },
  /* Multi-Despacho Simultáneo */
  multiDispatchCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.sm + 2,
    marginBottom: SPACING.md,
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    elevation: 2,
  },
  multiDispatchTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primary,
  },
  multiDispatchTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  multiDispatchTabActive: {
    backgroundColor: '#EFF6FF',
    borderColor: COLORS.primary,
  },
  multiDispatchTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  multiDispatchTabTextActive: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  multiDispatchTabSub: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  multiDispatchTabSubActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  /* Rastreador */
  trackerCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    elevation: 3,
  },
  trackerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    gap: 6,
  },
  statusBadgeInTransit: {
    backgroundColor: '#EFF6FF',
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D97706',
  },
  pulseDotInTransit: {
    backgroundColor: COLORS.primary,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400E',
    letterSpacing: 0.5,
  },
  trackerOrderCode: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: SPACING.md,
  },
  stepCol: {
    alignItems: 'center',
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleCompleted: {
    backgroundColor: COLORS.success,
  },
  stepCircleActive: {
    backgroundColor: COLORS.primary,
  },
  stepCirclePending: {
    backgroundColor: '#E2E8F0',
  },
  stepLabelActive: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 4,
  },
  stepLabelMuted: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginTop: 4,
  },
  stepLine: {
    flex: 1,
    height: 3,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 8,
    marginTop: -14,
  },
  stepLineActive: {
    backgroundColor: COLORS.primary,
  },
  driverBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  driverAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  driverNameTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  driverSubText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  driverActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  driverActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderSummaryCard: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  orderSummaryTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  summaryItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  summaryItemName: {
    fontSize: 12,
    color: COLORS.textSecondary,
    flex: 1,
  },
  summaryItemPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 6,
  },
  totalRowSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalRowSummaryLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  totalRowSummaryValue: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.primary,
  },
  paymentMethodNotice: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  emptyStateCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyStateIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  emptyStateSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: SPACING.lg,
  },
  goToCatalogBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    height: 42,
    borderRadius: RADIUS.md,
    gap: 8,
  },
  goToCatalogBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  /* Historial */
  historyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  historyCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  historyOrderCode: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  historyDate: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  deliveredPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  deliveredPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
  },
  historyItemsSummary: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  historyCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
    paddingTop: 8,
  },
  historyTotalText: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  repeatOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  repeatOrderBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  /* Barra Flotante de Carrito Activo */
  floatingCartContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: Platform.OS === 'ios' ? 84 : 74,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
    zIndex: 9998,
  },
  floatingCartBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 390,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: 10,
    paddingHorizontal: 14,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  floatingCartLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  floatingCartBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingCartBadgeText: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.primary,
  },
  floatingCartTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E0E7FF',
  },
  floatingCartAmount: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  floatingCartRightBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    gap: 4,
  },
  floatingCartRightBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  /* Floating Dock */
  dockOuterContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingBottom: Platform.OS === 'ios' ? 14 : 4,
    paddingTop: 4,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
    zIndex: 9999,
  },
  dockBackdropBlur: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: Platform.OS === 'ios' ? 76 : 60,
    backgroundColor: 'rgba(248, 250, 252, 0.94)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(226, 232, 240, 0.7)',
  },
  dockCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    maxWidth: 360,
    height: 52,
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 6,
  },
  dockItem: {
    flex: 1,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    paddingHorizontal: 2,
  },
  dockItemActive: {
    backgroundColor: '#EFF6FF',
  },
  dockIconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 20,
  },
  dockLabel: {
    fontSize: 9,
    marginTop: 1,
  },
  dockLabelActive: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  dockLabelInactive: {
    color: '#64748B',
    fontWeight: '600',
  },
  dockBadgeRed: {
    position: 'absolute',
    top: -5,
    right: -8,
    backgroundColor: COLORS.danger,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  dockBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
  /* Modal Carrito */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  cartModalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    width: '100%',
    maxWidth: 380,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  modalSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  cartItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.md,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cartItemName: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  cartItemUnit: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  cartItemStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginHorizontal: 8,
  },
  cartStepperBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  cartStepperValue: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
    minWidth: 18,
    textAlign: 'center',
  },
  cartItemSubtotal: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.primary,
    minWidth: 54,
    textAlign: 'right',
  },
  cartAddressCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: RADIUS.md,
    padding: 10,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  cartAddressTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#166534',
  },
  cartChangeGpsLink: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  cartAddressText: {
    fontSize: 12,
    color: '#14532D',
    marginTop: 2,
    fontWeight: '600',
  },
  cartAddressRef: {
    fontSize: 11,
    color: '#15803D',
    marginTop: 1,
  },
  missingGpsPillAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    marginTop: 8,
  },
  missingGpsPillAlertText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DC2626',
    flex: 1,
  },
  paymentSection: {
    marginVertical: 6,
  },
  paymentLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  paymentOptionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  paymentOptionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  paymentOptionActive: {
    backgroundColor: '#EFF6FF',
    borderColor: COLORS.primary,
  },
  paymentOptionText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  paymentOptionTextActive: {
    color: COLORS.primary,
  },
  paymentSubLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 6,
  },
  cashQuickChipsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  cashQuickChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cashQuickChipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: COLORS.primary,
  },
  cashQuickChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  cashQuickChipTextActive: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  notesInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: RADIUS.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  totalRowLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  totalRowValue: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.primary,
  },
  confirmOrderFinalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    height: TOUCH_TARGET.buttonHeight,
    marginTop: SPACING.md,
    gap: 8,
  },
  confirmOrderFinalBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  /* Modal Combobox de Categorías */
  categoryModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  categoryModalSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    maxHeight: '65%',
  },
  categoryModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 8,
  },
  categoryModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.secondary,
  },
  categoryOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: RADIUS.md,
  },
  categoryOptionItemActive: {
    backgroundColor: '#EFF6FF',
  },
  categoryOptionText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  categoryOptionTextActive: {
    color: COLORS.primary,
    fontWeight: '800',
  },
});
