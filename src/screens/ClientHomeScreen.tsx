/**
 * ============================================================================
 * SCREEN: ClientHomeScreen.tsx
 * Portal Exclusivo del Cliente: Pedidos Rápidos en 1 Toque y Rastreo de Entrega
 * Diseñado para Máxima Sencillez (Cero Curva de Aprendizaje)
 * ============================================================================
 */

import React, { useState, useMemo } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useOrders } from '../context/OrderContext';
import { useProducts } from '../context/ProductContext';
import { Product } from '../models/Product';
import { Order, PaymentMethod } from '../models/Order';
import { COLORS, SPACING, RADIUS, TOUCH_TARGET } from '../utils/constants';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { hapticImpact, hapticNotification, hapticSelection } from '../utils/haptics';

export const ClientHomeScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const { orders, addOrder } = useOrders();
  const { products } = useProducts();

  const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false);

  const handleOpenLogout = () => {
    hapticImpact('light');
    setIsLogoutModalVisible(true);
  };

  const handleConfirmLogout = async () => {
    setIsLogoutModalVisible(false);
    await logout();
  };

  // Modal para confirmar pedido rápido
  const [selectedProductToOrder, setSelectedProductToOrder] = useState<Product | null>(null);
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');

  // Buscar si el cliente tiene un pedido activo en curso (Pendiente o En Ruta)
  const activeOrder = useMemo(() => {
    if (!user) return null;
    return orders.find(
      (o) =>
        (o.customerId === user.customerId ||
          o.customerName.toLowerCase() === user.name.toLowerCase()) &&
        (o.status === 'PENDING' || o.status === 'IN_TRANSIT')
    );
  }, [orders, user]);

  // Historial de pedidos anteriores del cliente
  const pastOrders = useMemo(() => {
    if (!user) return [];
    return orders.filter(
      (o) =>
        (o.customerId === user.customerId ||
          o.customerName.toLowerCase() === user.name.toLowerCase()) &&
        (o.status === 'DELIVERED' || o.status === 'CANCELLED')
    );
  }, [orders, user]);

  const handleOpenOrderModal = (product: Product) => {
    hapticImpact('light');
    setSelectedProductToOrder(product);
    setOrderQuantity(1);
    setPaymentMethod('CASH');
  };

  const handleConfirmOrder = () => {
    if (!selectedProductToOrder || !user) return;

    const total = selectedProductToOrder.price * orderQuantity;
    const newCode = `PED-${Math.floor(1000 + Math.random() * 9000)}`;

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      orderCode: newCode,
      customerId: user.customerId,
      customerName: user.name,
      customerPhone: user.phone,
      deliveryAddress: user.deliveryAddress || 'Dirección registrada',
      district: user.district || 'Lima',
      addressReference: user.addressReference,
      latitude: user.latitude,
      longitude: user.longitude,
      category: selectedProductToOrder.category,
      items: [
        {
          id: `item-${Date.now()}`,
          name: selectedProductToOrder.name,
          quantity: orderQuantity,
          unitPrice: selectedProductToOrder.price,
          unit: selectedProductToOrder.unit,
        },
      ],
      totalAmount: total,
      paymentMethod,
      paymentStatus: 'PENDING',
      priority: 'HIGH',
      status: 'PENDING',
      driverAssigned: 'Carlos Mendoza (Camión 02)',
      createdAt: new Date().toISOString(),
    };

    addOrder(newOrder);
    hapticNotification('success');
    setSelectedProductToOrder(null);

    Alert.alert(
      '¡Pedido Solicitado con Éxito! 🚀',
      `Hemos recibido tu pedido ${newCode} por ${formatCurrency(total)}. El conductor ya lo tiene en su hoja de ruta.`
    );
  };

  const handleCallDriver = (phone: string = '987111222') => {
    Linking.openURL(`tel:${phone}`).catch(() => {});
  };

  const handleWhatsAppDriver = () => {
    const text = encodeURIComponent(
      `Hola, le saludo de ${user?.name}. Estoy esperando el pedido ${activeOrder?.orderCode}.`
    );
    Linking.openURL(`https://wa.me/51987111222?text=${text}`).catch(() => {});
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

      {/* Cabecera del Portal del Cliente */}
      <View style={styles.topHeader}>
        <View style={styles.headerInfoCol}>
          <Text style={styles.welcomeGreeting}>¡Hola, {user?.name}! 👋</Text>
          <Text style={styles.addressLine} numberOfLines={1}>
            📍 {user?.deliveryAddress || 'Mi Negocio'} ({user?.district || 'Lima'})
          </Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerLogoutBtn}
            onPress={handleOpenLogout}
            activeOpacity={0.75}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="log-out-outline" size={16} color={COLORS.danger} />
            <Text style={styles.headerLogoutText}>Salir</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* =================================================================== */}
        {/* ESTADO EN VIVO DEL PEDIDO EN RUTA */}
        {/* =================================================================== */}
        {activeOrder ? (
          <View style={styles.liveOrderCard}>
            <View style={styles.liveOrderHeader}>
              <View style={styles.liveStatusBadge}>
                <View style={styles.pulseDot} />
                <Text style={styles.liveStatusText}>
                  {activeOrder.status === 'IN_TRANSIT' ? 'EN RUTA A TU LOCAL' : 'EN PREPARACIÓN'}
                </Text>
              </View>
              <Text style={styles.liveOrderCode}>{activeOrder.orderCode}</Text>
            </View>

            <Text style={styles.liveOrderTitle}>
              {activeOrder.status === 'IN_TRANSIT'
                ? 'El repartidor está en camino con tus productos'
                : 'Tu pedido ha sido recibido y está programado para despacho'}
            </Text>

            <View style={styles.driverInfoRow}>
              <View style={styles.driverAvatarCircle}>
                <Ionicons name="bicycle" size={20} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.driverName}>
                  {activeOrder.driverAssigned || 'Carlos Mendoza (Camión 02)'}
                </Text>
                <Text style={styles.driverEta}>Conductor asignado a tu zona</Text>
              </View>

              <View style={styles.driverContactBtns}>
                <TouchableOpacity
                  style={styles.driverCallBtn}
                  onPress={() => handleCallDriver()}
                  activeOpacity={0.8}
                >
                  <Ionicons name="call" size={16} color="#FFFFFF" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.driverWspBtn}
                  onPress={handleWhatsAppDriver}
                  activeOpacity={0.8}
                >
                  <Ionicons name="logo-whatsapp" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.orderDetailsBox}>
              <Text style={styles.orderDetailsText}>
                Artículos: {activeOrder.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
              </Text>
              <Text style={styles.orderTotalText}>
                Total a pagar: {formatCurrency(activeOrder.totalAmount)} ({activeOrder.paymentMethod === 'CASH' ? 'Efectivo' : 'Yape / Digital'})
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.noOrderBanner}>
            <View style={styles.noOrderIconCircle}>
              <Ionicons name="cart-outline" size={24} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.noOrderTitle}>¿Necesitas productos hoy?</Text>
              <Text style={styles.noOrderSubtitle}>
                Elige de la lista abajo para solicitar entrega inmediata con 1 solo toque.
              </Text>
            </View>
          </View>
        )}

        {/* =================================================================== */}
        {/* CATÁLOGO RÁPIDO DE PEDIDOS EN 1 TOQUE */}
        {/* =================================================================== */}
        <Text style={styles.sectionHeaderTitle}>Pide en 1 Toque (Entrega Inmediata)</Text>
        <Text style={styles.sectionHeaderSubtitle}>
          El repartidor asignado a tu distrito llevará el pedido a tu puerta
        </Text>

        <View style={styles.catalogGrid}>
          {products.slice(0, 6).map((prod) => (
            <View key={prod.id} style={styles.productCard}>
              <View style={styles.productCardTop}>
                <Text style={styles.productCategoryEmoji}>
                  {prod.category === 'WATER'
                    ? '💧'
                    : prod.category === 'GAS'
                    ? '🔥'
                    : prod.category === 'BAKERY'
                    ? '🥖'
                    : prod.category === 'CLEANING'
                    ? '🧴'
                    : '📦'}
                </Text>
                <Text style={styles.productPriceText}>{formatCurrency(prod.price)}</Text>
              </View>

              <Text style={styles.productName} numberOfLines={2}>
                {prod.name}
              </Text>
              <Text style={styles.productUnit}>{prod.unit}</Text>

              <TouchableOpacity
                style={styles.orderNowButton}
                onPress={() => handleOpenOrderModal(prod)}
                activeOpacity={0.85}
              >
                <Ionicons name="flash" size={14} color="#FFFFFF" />
                <Text style={styles.orderNowButtonText}>Pedir Ahora</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* =================================================================== */}
        {/* ENVASES RETORNABLES EN PRÉSTAMO (GARANTÍAS) */}
        {/* =================================================================== */}
        <View style={styles.returnablesCard}>
          <View style={styles.returnableIconBox}>
            <Ionicons name="repeat" size={22} color="#059669" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.returnableTitle}>Mis Envases Retornables</Text>
            <Text style={styles.returnableDesc}>
              Recuerda tener listos tus bidones o balones vacíos para intercambiarlos con el conductor.
            </Text>
          </View>
        </View>

        {/* =================================================================== */}
        {/* HISTORIAL RECIENTE DEL CLIENTE */}
        {/* =================================================================== */}
        {pastOrders.length > 0 && (
          <View style={styles.pastOrdersSection}>
            <Text style={styles.sectionHeaderTitle}>Historial de Compras</Text>
            <View style={styles.pastOrdersList}>
              {pastOrders.slice(0, 3).map((past) => (
                <View key={past.id} style={styles.pastOrderItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pastOrderCode}>{past.orderCode}</Text>
                    <Text style={styles.pastOrderDate}>{formatDateTime(past.createdAt)}</Text>
                    <Text style={styles.pastOrderSummary} numberOfLines={1}>
                      {past.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.pastOrderTotal}>{formatCurrency(past.totalAmount)}</Text>
                    <View style={styles.deliveredBadge}>
                      <Text style={styles.deliveredBadgeText}>Entregado</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* =================================================================== */}
        {/* TARJETA DE PERFIL Y CIERRE DE SESIÓN AL PIE */}
        {/* =================================================================== */}
        <View style={styles.userSessionCard}>
          <View style={styles.userSessionRow}>
            <View style={styles.userAvatarBox}>
              <Text style={{ fontSize: 24 }}>🏪</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.userSessionName}>{user?.name || 'Cliente'}</Text>
                <View style={styles.rolePillClient}>
                  <Text style={styles.rolePillClientText}>Cliente</Text>
                </View>
              </View>
              <Text style={styles.userSessionContact}>
                {user?.deliveryAddress || 'Dirección registrada'} • Tel: {user?.phone || 'N/A'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.sessionLogoutButton}
            onPress={handleOpenLogout}
            activeOpacity={0.85}
          >
            <Ionicons name="log-out-outline" size={18} color={COLORS.danger} />
            <Text style={styles.sessionLogoutButtonText}>Cerrar Sesión del Portal</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal Seguro de Confirmación de Cierre de Sesión */}
      <Modal
        visible={isLogoutModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsLogoutModalVisible(false)}
      >
        <View style={styles.logoutModalBackdrop}>
          <View style={styles.logoutModalCard}>
            <View style={styles.logoutModalIconBox}>
              <Ionicons name="log-out-outline" size={32} color={COLORS.danger} />
            </View>
            <Text style={styles.logoutModalTitle}>¿Cerrar Sesión?</Text>
            <Text style={styles.logoutModalDesc}>
              Saldrás del portal de pedidos de {user?.name || 'cliente'}. Para volver a acceder deberás ingresar tus credenciales.
            </Text>

            <View style={styles.logoutModalButtonsCol}>
              <TouchableOpacity
                style={styles.confirmLogoutBtn}
                onPress={handleConfirmLogout}
                activeOpacity={0.88}
              >
                <Ionicons name="log-out" size={18} color="#FFFFFF" />
                <Text style={styles.confirmLogoutBtnText}>Sí, Cerrar Sesión</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelLogoutBtn}
                onPress={() => setIsLogoutModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelLogoutBtnText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal para Confirmar Pedido de 1 Toque */}
      {selectedProductToOrder && (
        <Modal
          visible={Boolean(selectedProductToOrder)}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setSelectedProductToOrder(null)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Confirmar Pedido Rápido</Text>
                <TouchableOpacity onPress={() => setSelectedProductToOrder(null)}>
                  <Ionicons name="close" size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalProductName}>{selectedProductToOrder.name}</Text>
              <Text style={styles.modalProductPrice}>
                {formatCurrency(selectedProductToOrder.price)} c/u ({selectedProductToOrder.unit})
              </Text>

              {/* Selector de cantidad */}
              <View style={styles.modalQuantityRow}>
                <Text style={styles.modalQtyLabel}>Cantidad a solicitar:</Text>
                <View style={styles.qtyControlBox}>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => {
                      hapticSelection();
                      setOrderQuantity((q) => Math.max(1, q - 1));
                    }}
                  >
                    <Ionicons name="remove" size={18} color={COLORS.textPrimary} />
                  </TouchableOpacity>
                  <Text style={styles.qtyNum}>{orderQuantity}</Text>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => {
                      hapticSelection();
                      setOrderQuantity((q) => q + 1);
                    }}
                  >
                    <Ionicons name="add" size={18} color={COLORS.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Método de pago */}
              <Text style={styles.modalSectionLabel}>Forma de Pago:</Text>
              <View style={styles.paymentToggleRow}>
                <TouchableOpacity
                  style={[
                    styles.paymentToggleBtn,
                    paymentMethod === 'CASH' && styles.paymentToggleBtnActive,
                  ]}
                  onPress={() => setPaymentMethod('CASH')}
                >
                  <Ionicons
                    name="cash-outline"
                    size={16}
                    color={paymentMethod === 'CASH' ? '#FFFFFF' : COLORS.textPrimary}
                  />
                  <Text
                    style={[
                      styles.paymentToggleText,
                      paymentMethod === 'CASH' && styles.paymentToggleTextActive,
                    ]}
                  >
                    Efectivo
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.paymentToggleBtn,
                    paymentMethod === 'YAPE_PLIN' && styles.paymentToggleBtnActive,
                  ]}
                  onPress={() => setPaymentMethod('YAPE_PLIN')}
                >
                  <Ionicons
                    name="phone-portrait-outline"
                    size={16}
                    color={paymentMethod === 'YAPE_PLIN' ? '#FFFFFF' : COLORS.textPrimary}
                  />
                  <Text
                    style={[
                      styles.paymentToggleText,
                      paymentMethod === 'YAPE_PLIN' && styles.paymentToggleTextActive,
                    ]}
                  >
                    Yape / Plin
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.modalTotalRow}>
                <Text style={styles.modalTotalLabel}>Total a pagar:</Text>
                <Text style={styles.modalTotalAmount}>
                  {formatCurrency(selectedProductToOrder.price * orderQuantity)}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleConfirmOrder}
                activeOpacity={0.88}
              >
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={styles.modalConfirmBtnText}>Enviar Pedido a Mi Dirección</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
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
  },
  welcomeGreeting: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.secondary,
  },
  addressLine: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    gap: 4,
    borderWidth: 1,
    borderColor: '#FECACA',
    minHeight: 38,
  },
  headerLogoutText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.danger,
  },
  /* Tarjeta de Sesión al Pie */
  userSessionCard: {
    backgroundColor: COLORS.surface,
    marginTop: SPACING.xl,
    marginBottom: SPACING.lg,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  userSessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: SPACING.md,
  },
  userAvatarBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  userSessionName: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  userSessionContact: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  rolePillClient: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  rolePillClientText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#065F46',
  },
  sessionLogoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: RADIUS.md,
    height: TOUCH_TARGET.buttonHeight,
    borderWidth: 1,
    borderColor: '#FECACA',
    gap: 8,
  },
  sessionLogoutButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.danger,
  },
  /* Modal de Cierre de Sesión */
  logoutModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  logoutModalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  logoutModalIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  logoutModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  logoutModalDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  logoutModalButtonsCol: {
    width: '100%',
    gap: 10,
  },
  confirmLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.danger,
    borderRadius: RADIUS.md,
    height: TOUCH_TARGET.buttonHeight,
    gap: 8,
  },
  confirmLogoutBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  cancelLogoutBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: RADIUS.md,
  },
  cancelLogoutBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: 40,
  },
  /* Tarjeta de Pedido en Vivo */
  liveOrderCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    marginBottom: SPACING.xl,
    elevation: 3,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  liveOrderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  liveStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    gap: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success,
  },
  liveStatusText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#065F46',
  },
  liveOrderCode: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.secondary,
  },
  liveOrderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
    lineHeight: 20,
    marginBottom: 12,
  },
  driverInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.md,
    padding: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  driverAvatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  driverEta: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  driverContactBtns: {
    flexDirection: 'row',
    gap: 6,
  },
  driverCallBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverWspBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderDetailsBox: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  orderDetailsText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  orderTotalText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 3,
  },
  noOrderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    gap: 12,
    marginBottom: SPACING.xl,
  },
  noOrderIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noOrderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primary,
  },
  noOrderSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  sectionHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionHeaderSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
    marginBottom: SPACING.md,
  },
  catalogGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: SPACING.xl,
  },
  productCard: {
    width: '48%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'space-between',
    elevation: 2,
  },
  productCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  productCategoryEmoji: {
    fontSize: 22,
  },
  productPriceText: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  productName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    lineHeight: 17,
  },
  productUnit: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
    marginBottom: 10,
  },
  orderNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 8,
    gap: 4,
  },
  orderNowButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  returnablesCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: 12,
    marginBottom: SPACING.xl,
  },
  returnableIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  returnableTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065F46',
  },
  returnableDesc: {
    fontSize: 11,
    color: '#047857',
    marginTop: 2,
    lineHeight: 15,
  },
  pastOrdersSection: {
    marginTop: 6,
  },
  pastOrdersList: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  pastOrderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  pastOrderCode: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  pastOrderDate: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  pastOrderSummary: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  pastOrderTotal: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  deliveredBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  deliveredBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.success,
  },
  /* Modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.xl,
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.secondary,
  },
  modalProductName: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  modalProductPrice: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '700',
    marginTop: 2,
    marginBottom: 14,
  },
  modalQuantityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalQtyLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  qtyControlBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
  },
  qtyBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyNum: {
    fontSize: 16,
    fontWeight: '800',
    paddingHorizontal: 14,
    color: COLORS.textPrimary,
  },
  modalSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  paymentToggleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  paymentToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    gap: 6,
  },
  paymentToggleBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  paymentToggleText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  paymentToggleTextActive: {
    color: '#FFFFFF',
  },
  modalTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginBottom: 14,
  },
  modalTotalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  modalTotalAmount: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  modalConfirmBtn: {
    backgroundColor: COLORS.success,
    borderRadius: RADIUS.md,
    height: TOUCH_TARGET.buttonHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 3,
  },
  modalConfirmBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
