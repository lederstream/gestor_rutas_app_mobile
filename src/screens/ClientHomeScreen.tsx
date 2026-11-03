/**
 * ============================================================================
 * SCREEN: ClientHomeScreen.tsx
 * Portal Exclusivo del Cliente: Pedidos Rápidos en 1 Toque y Rastreo de Entrega
 * Diseñado con Neuromarketing, Armonía Visual y Ergonomía Móvil
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

interface Props {
  navigation: any;
}

export const ClientHomeScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const { orders, addOrder } = useOrders();
  const { products } = useProducts();

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

  // Historial de compras anteriores del cliente
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
      district: user.district || 'Tacna',
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

      {/* =================================================================== */}
      {/* CABECERA CON IDENTIDAD Y ACCESO A MI PERFIL */}
      {/* =================================================================== */}
      <View style={styles.topHeader}>
        <View style={styles.headerInfoCol}>
          <Text style={styles.welcomeGreeting}>¡Hola, {user?.name}! 👋</Text>
          <Text style={styles.addressLine} numberOfLines={1}>
            📍 {user?.deliveryAddress || 'Tacna Centro'}
          </Text>
        </View>

        {/* Acceso unificado a Mi Perfil */}
        <TouchableOpacity
          style={styles.headerProfileBtn}
          onPress={() => {
            hapticSelection();
            navigation.navigate('ProfileScreen');
          }}
          activeOpacity={0.8}
        >
          <View style={styles.headerAvatarCircle}>
            <Text style={styles.headerAvatarEmoji}>🏪</Text>
          </View>
          <Text style={styles.headerProfileText}>Mi Perfil</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* =================================================================== */}
        {/* NEUROMARKETING: RASTREADOR DE PEDIDO EN VIVO (BARRA DE PROGRESO) */}
        {/* =================================================================== */}
        {activeOrder ? (
          <View style={styles.liveOrderCard}>
            <View style={styles.liveOrderHeader}>
              <View
                style={[
                  styles.liveStatusBadge,
                  activeOrder.status === 'IN_TRANSIT' && styles.liveStatusBadgeInTransit,
                ]}
              >
                <View
                  style={[
                    styles.pulseDot,
                    activeOrder.status === 'IN_TRANSIT' && styles.pulseDotInTransit,
                  ]}
                />
                <Text style={styles.liveStatusText}>
                  {activeOrder.status === 'IN_TRANSIT' ? 'EN RUTA A TU LOCAL' : 'ORDEN RECIBIDA'}
                </Text>
              </View>
              <Text style={styles.liveOrderCode}>{activeOrder.orderCode}</Text>
            </View>

            {/* Stepper Visual de Neuromarketing */}
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

            {/* Ficha del Chofer */}
            <View style={styles.driverInfoRow}>
              <View style={styles.driverAvatarCircle}>
                <Ionicons name="person" size={18} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.driverName}>
                  {activeOrder.driverAssigned || 'Carlos Mendoza (Camión 02)'}
                </Text>
                <Text style={styles.driverEta}>Repartidor oficial en camino</Text>
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
                {activeOrder.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
              </Text>
              <Text style={styles.orderTotalText}>
                Total: {formatCurrency(activeOrder.totalAmount)} ({activeOrder.paymentMethod === 'CASH' ? 'Efectivo' : 'Digital'})
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.noOrderBanner}>
            <View style={styles.noOrderIconCircle}>
              <Ionicons name="flash" size={24} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.noOrderTitle}>Despacho Inmediato en Tacna</Text>
              <Text style={styles.noOrderSubtitle}>
                Elige tus productos abajo para solicitar entrega a tu local con 1 solo toque.
              </Text>
            </View>
          </View>
        )}

        {/* =================================================================== */}
        {/* CATÁLOGO EN 1 TOQUE (NEUROMARKETING: DECISIÓN RÁPIDA) */}
        {/* =================================================================== */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderTitle}>Pide en 1 Toque</Text>
          <Text style={styles.sectionHeaderSub}>Entrega garantizada hoy</Text>
        </View>

        <View style={styles.productsGrid}>
          {products.map((product) => {
            const emoji =
              product.category === 'WATER'
                ? '💧'
                : product.category === 'GAS'
                ? '🔥'
                : product.category === 'BAKERY'
                ? '🥖'
                : '🧴';

            return (
              <View key={product.id} style={styles.productCard}>
                <View style={styles.productTopRow}>
                  <View style={styles.productEmojiBox}>
                    <Text style={{ fontSize: 26 }}>{emoji}</Text>
                  </View>
                  <View style={styles.pricePill}>
                    <Text style={styles.pricePillText}>{formatCurrency(product.price)}</Text>
                  </View>
                </View>

                <Text style={styles.productName} numberOfLines={2}>
                  {product.name}
                </Text>
                <Text style={styles.productUnit}>Presentación: {product.unit || 'Unidad'}</Text>

                <TouchableOpacity
                  style={styles.oneTouchOrderBtn}
                  onPress={() => handleOpenOrderModal(product)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="add-circle" size={18} color="#FFFFFF" />
                  <Text style={styles.oneTouchOrderBtnText}>Pedir Ahora</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        {/* =================================================================== */}
        {/* HISTORIAL RECIENTE CON RE-PEDIDO RÁPIDO */}
        {/* =================================================================== */}
        {pastOrders.length > 0 && (
          <View style={styles.pastOrdersSection}>
            <Text style={styles.sectionHeaderTitle}>Tus Pedidos Anteriores</Text>
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
      </ScrollView>

      {/* =================================================================== */}
      {/* MODAL PARA CONFIRMAR PEDIDO RÁPIDO */}
      {/* =================================================================== */}
      {selectedProductToOrder && (
        <Modal
          visible={Boolean(selectedProductToOrder)}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setSelectedProductToOrder(null)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.orderModalCard}>
              <View style={styles.modalHeaderRow}>
                <View>
                  <Text style={styles.modalTitle}>Confirmar Solicitud</Text>
                  <Text style={styles.modalSubtitle}>Entrega directa a tu dirección</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedProductToOrder(null)}>
                  <Ionicons name="close-circle" size={24} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={styles.productModalDetail}>
                <Text style={styles.modalProductName}>{selectedProductToOrder.name}</Text>
                <Text style={styles.modalProductPrice}>
                  Precio unitario: {formatCurrency(selectedProductToOrder.price)}
                </Text>
              </View>

              {/* Selector de Cantidad */}
              <View style={styles.quantitySection}>
                <Text style={styles.quantityLabel}>Cantidad a solicitar:</Text>
                <View style={styles.quantityControls}>
                  <TouchableOpacity
                    style={styles.quantityBtn}
                    onPress={() => setOrderQuantity(Math.max(1, orderQuantity - 1))}
                  >
                    <Ionicons name="remove" size={18} color={COLORS.textPrimary} />
                  </TouchableOpacity>
                  <Text style={styles.quantityValue}>{orderQuantity}</Text>
                  <TouchableOpacity
                    style={styles.quantityBtn}
                    onPress={() => setOrderQuantity(orderQuantity + 1)}
                  >
                    <Ionicons name="add" size={18} color={COLORS.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Método de Pago */}
              <View style={styles.paymentSection}>
                <Text style={styles.paymentLabel}>Forma de Pago al Recibir:</Text>
                <View style={styles.paymentOptionsRow}>
                  <TouchableOpacity
                    style={[
                      styles.paymentOptionBtn,
                      paymentMethod === 'CASH' && styles.paymentOptionActive,
                    ]}
                    onPress={() => setPaymentMethod('CASH')}
                  >
                    <Text style={{ fontSize: 16 }}>💵</Text>
                    <Text
                      style={[
                        styles.paymentOptionText,
                        paymentMethod === 'CASH' && styles.paymentOptionTextActive,
                      ]}
                    >
                      Efectivo
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.paymentOptionBtn,
                      paymentMethod === 'YAPE_PLIN' && styles.paymentOptionActive,
                    ]}
                    onPress={() => setPaymentMethod('YAPE_PLIN')}
                  >
                    <Text style={{ fontSize: 16 }}>📱</Text>
                    <Text
                      style={[
                        styles.paymentOptionText,
                        paymentMethod === 'YAPE_PLIN' && styles.paymentOptionTextActive,
                      ]}
                    >
                      Yape / Plin
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Total Final */}
              <View style={styles.totalRow}>
                <Text style={styles.totalRowLabel}>Total a Pagar:</Text>
                <Text style={styles.totalRowValue}>
                  {formatCurrency(selectedProductToOrder.price * orderQuantity)}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.confirmOrderFinalBtn}
                onPress={handleConfirmOrder}
                activeOpacity={0.88}
              >
                <Ionicons name="flash" size={18} color="#FFFFFF" />
                <Text style={styles.confirmOrderFinalBtnText}>Enviar Pedido Ahora</Text>
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
    marginRight: 10,
  },
  welcomeGreeting: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  addressLine: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
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
    padding: SPACING.lg,
    paddingBottom: 40,
  },
  /* Rastreador de Pedido Activo */
  liveOrderCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  liveOrderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  liveStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    gap: 6,
  },
  liveStatusBadgeInTransit: {
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
  liveStatusText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400E',
    letterSpacing: 0.5,
  },
  liveOrderCode: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },
  /* Stepper Visual */
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
  driverInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  driverAvatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  driverName: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  driverEta: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  driverContactBtns: {
    flexDirection: 'row',
    gap: 8,
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
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  orderDetailsText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  orderTotalText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  noOrderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    gap: 12,
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
  /* Catálogo en 1 Toque */
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: SPACING.sm,
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  sectionHeaderSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  productsGrid: {
    gap: 12,
    marginBottom: SPACING.xl,
  },
  productCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  productTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  productEmojiBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pricePill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
  },
  pricePillText: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.primary,
  },
  productName: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  productUnit: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    marginBottom: 10,
  },
  oneTouchOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    height: 42,
    gap: 6,
  },
  oneTouchOrderBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  /* Historial */
  pastOrdersSection: {
    marginTop: SPACING.sm,
  },
  pastOrdersList: {
    gap: 8,
    marginTop: SPACING.sm,
  },
  pastOrderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    marginTop: 4,
  },
  deliveredBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
  },
  /* Modal de Pedido Rápido */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  orderModalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    width: '100%',
    maxWidth: 360,
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
  productModalDetail: {
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalProductName: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  modalProductPrice: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  quantitySection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: SPACING.md,
  },
  quantityLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quantityBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityValue: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    minWidth: 20,
    textAlign: 'center',
  },
  paymentSection: {
    marginVertical: SPACING.sm,
  },
  paymentLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 8,
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
    height: 42,
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
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
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
    marginTop: SPACING.lg,
    gap: 8,
  },
  confirmOrderFinalBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
