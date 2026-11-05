import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
  Linking,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/RootNavigator';
import { useAuth } from '../context/AuthContext';
import { useOrders } from '../context/OrderContext';
import { OrderStatus, OrderPriority } from '../models/Order';
import { isB2BCustomer } from '../models/Customer';
import { hapticImpact, hapticNotification, hapticSelection } from '../utils/haptics';
import {
  COLORS,
  CATEGORY_CONFIG,
  PAYMENT_METHOD_CONFIG,
  PRIORITY_CONFIG,
  getCategoryConfig,
  RADIUS,
  SPACING,
} from '../utils/constants';
import { CustomInput } from '../components/common/CustomInput';
import {
  formatCurrency,
  formatDateTime,
  formatPhone,
} from '../utils/formatters';
import { Header } from '../components/common/Header';
import { StatusBadge } from '../components/orders/StatusBadge';
import { PriorityBadge } from '../components/orders/PriorityBadge';
import { CustomButton } from '../components/common/CustomButton';

type Props = NativeStackScreenProps<RootStackParamList, 'OrderDetailScreen'>;

export const OrderDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { orderId } = route.params;
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const { getOrderById, updateOrderStatus, updateOrder, deleteOrder } = useOrders();

  const order = getOrderById(orderId);

  // Estados para modal de edición de pedido
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editPriority, setEditPriority] = useState<OrderPriority>(order?.priority || 'NORMAL');
  const [editAddress, setEditAddress] = useState(order?.deliveryAddress || '');
  const [editReference, setEditReference] = useState(order?.addressReference || '');
  const [editScheduledTime, setEditScheduledTime] = useState(order?.scheduledTime || '');
  const [editNotes, setEditNotes] = useState(order?.notes || '');
  const [editAmountPaid, setEditAmountPaid] = useState<string>('');

  const handleOpenEditModal = () => {
    if (!order) return;
    setEditPriority(order.priority);
    setEditAddress(order.deliveryAddress);
    setEditReference(order.addressReference || '');
    setEditScheduledTime(order.scheduledTime || '');
    setEditNotes(order.notes || '');
    setEditAmountPaid(order.amountPaid ? String(order.amountPaid) : '');
    hapticImpact('light');
    setIsEditModalVisible(true);
  };

  const handleSaveEdit = () => {
    if (!order) return;
    if (!editAddress.trim()) {
      hapticNotification('error');
      Alert.alert('Dirección Requerida', 'La dirección de entrega no puede quedar vacía.');
      return;
    }

    hapticImpact('medium');

    const parsedCash = parseFloat(editAmountPaid);
    const validCash = !isNaN(parsedCash) && parsedCash >= order.totalAmount ? parsedCash : undefined;
    const computedChange = validCash && validCash > order.totalAmount ? validCash - order.totalAmount : undefined;

    updateOrder({
      ...order,
      priority: editPriority,
      deliveryAddress: editAddress.trim(),
      addressReference: editReference.trim() || undefined,
      scheduledTime: editScheduledTime.trim() || undefined,
      notes: editNotes.trim() || undefined,
      amountPaid: order.paymentMethod === 'CASH' ? validCash : undefined,
      changeDue: order.paymentMethod === 'CASH' ? computedChange : undefined,
    });

    hapticNotification('success');
    setIsEditModalVisible(false);
    Alert.alert(
      'Solicitud Actualizada 🎉',
      'La prioridad y los datos del despacho fueron guardados correctamente en memoria.'
    );
  };

  const handleUpdateReturnedContainers = (delta: number) => {
    if (!order) return;
    hapticSelection();
    const current = order.returnedContainers || 0;
    const next = Math.max(0, current + delta);
    updateOrder({
      ...order,
      returnedContainers: next,
    });
  };

  if (!order) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header
          title="Detalle del Pedido"
          showBackButton={true}
          onBackPress={() => navigation.goBack()}
        />
        <View style={styles.notFoundContainer}>
          <Ionicons name="alert-circle-outline" size={56} color={COLORS.danger} />
          <Text style={styles.notFoundTitle}>Pedido no encontrado</Text>
          <Text style={styles.notFoundText}>
            El código de pedido solicitado no existe o fue eliminado de la memoria.
          </Text>
          <CustomButton
            title="Volver a la lista"
            onPress={() => navigation.goBack()}
            style={{ marginTop: 16 }}
          />
        </View>
      </SafeAreaView>
    );
  }

  const categoryConfig = getCategoryConfig(order.category);
  const paymentConfig = PAYMENT_METHOD_CONFIG[order.paymentMethod] || {
    label: 'Pago',
    icon: 'cash-outline',
  };

  // Call customer
  const handleCallCustomer = () => {
    Linking.openURL(`tel:${order.customerPhone}`).catch(() => {
      Alert.alert(
        'Contacto Telefónico',
        `Llamar a ${order.customerName} al número ${order.customerPhone}`
      );
    });
  };

  // WhatsApp simulation
  const handleWhatsApp = () => {
    const text = encodeURIComponent(
      `Hola ${order.customerName}, le saludamos de Gestor de Rutas. Estamos en camino con su pedido ${order.orderCode}.`
    );
    Linking.openURL(`https://wa.me/51${order.customerPhone}?text=${text}`).catch(() => {
      Alert.alert(
        'WhatsApp',
        `Mensaje enviado a ${order.customerPhone}`
      );
    });
  };

  // GPS Navigation Handlers (Google Maps / Waze)
  const handleOpenGoogleMaps = () => {
    hapticSelection();
    let destination = '';
    if (order.latitude !== undefined && order.longitude !== undefined) {
      destination = `${order.latitude},${order.longitude}`;
    } else {
      const fullAddress = `${order.deliveryAddress}, ${order.district}, Tacna, Perú`;
      destination = encodeURIComponent(fullAddress);
    }
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;

    Linking.openURL(googleMapsUrl).catch(() => {
      Alert.alert(
        'Navegación GPS',
        `No se pudo abrir el navegador. Destino: ${order.deliveryAddress}`
      );
    });
  };

  const handleOpenWaze = () => {
    const fullAddress = `${order.deliveryAddress}, ${order.district}, Tacna, Perú`;
    const encoded = encodeURIComponent(fullAddress);
    const wazeUrl = `https://waze.com/ul?q=${encoded}&navigate=yes`;
    Linking.openURL(wazeUrl).catch(() => {
      Alert.alert(
        'Waze no disponible',
        'No se pudo abrir Waze. Puedes usar Google Maps.'
      );
    });
  };

  const handleOpenNavigationModal = () => {
    handleOpenGoogleMaps();
  };

  // Status transitions
  const handleSetStatus = (newStatus: OrderStatus) => {
    if (newStatus === 'DELIVERED') {
      Alert.alert(
        'Confirmar Entrega Conforme 📦',
        `Cliente: ${order.customerName}\n` +
        `Total a cobrar: ${formatCurrency(order.totalAmount)} (${
          order.paymentMethod === 'CASH'
            ? '💵 Efectivo'
            : order.paymentMethod === 'YAPE_PLIN'
            ? '📱 Yape / Plin'
            : '💳 POS / Transferencia'
        })\n\n` +
        `¿Confirmas la recepción satisfactoria de los productos y el cobro conforme?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Sí, Confirmar Entrega',
            style: 'default',
            onPress: () => {
              hapticImpact('heavy');
              updateOrderStatus(order.id, 'DELIVERED');
            },
          },
        ]
      );
    } else if (newStatus === 'CANCELLED') {
      Alert.alert(
        'Cancelar Pedido',
        '¿Estás seguro de anular este despacho? La acción quedará registrada.',
        [
          { text: 'No, Mantener', style: 'cancel' },
          {
            text: 'Sí, Anular',
            style: 'destructive',
            onPress: () => {
              hapticImpact('medium');
              updateOrderStatus(order.id, 'CANCELLED');
            },
          },
        ]
      );
    } else {
      hapticImpact('medium');
      updateOrderStatus(order.id, newStatus);
    }
  };

  // Delete Order
  const handleDeleteOrder = () => {
    Alert.alert(
      'Eliminar Registro',
      `¿Deseas remover definitivamente el pedido ${order.orderCode}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            deleteOrder(order.id);
            navigation.goBack();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      <Header
        title={`Pedido ${order.orderCode}`}
        subtitle={`${categoryConfig?.label.split(' ')[0] || 'Despacho'} • ${formatDateTime(order.createdAt)}`}
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
        rightActionIcon={isAdmin ? "trash-outline" : undefined}
        onRightActionPress={isAdmin ? handleDeleteOrder : undefined}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* TARJETA 1: DESTINATARIO, UBICACIÓN Y CONTACTO RÁPIDO */}
        <View style={styles.card}>
          <View style={styles.clientHeaderRow}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <View style={styles.clientNameAndType}>
                <Text style={styles.customerName} numberOfLines={1}>
                  {order.customerName}
                </Text>
                <View
                  style={[
                    styles.customerTypeBadge,
                    isB2BCustomer({ name: order.customerName })
                      ? styles.customerTypeB2B
                      : styles.customerTypeB2C,
                  ]}
                >
                  <Text
                    style={[
                      styles.customerTypeBadgeText,
                      isB2BCustomer({ name: order.customerName })
                        ? { color: '#1D4ED8' }
                        : { color: '#047857' },
                    ]}
                  >
                    {isB2BCustomer({ name: order.customerName }) ? 'B2B' : 'B2C'}
                  </Text>
                </View>
              </View>
              <Text style={styles.customerAddress} numberOfLines={2}>
                📍 {order.deliveryAddress} ({order.district})
              </Text>
              {order.addressReference ? (
                <Text style={styles.customerRef} numberOfLines={1}>
                  Ref: {order.addressReference}
                </Text>
              ) : null}
            </View>

            <View style={styles.statusBadgesCol}>
              <StatusBadge status={order.status} size="sm" />
              <PriorityBadge priority={order.priority} size="sm" />
            </View>
          </View>

          {/* Fila de 3 Acciones Rápidas Ergonómicas */}
          <View style={styles.quickActionsRow}>
            <TouchableOpacity
              style={styles.quickGpsBtn}
              onPress={handleOpenGoogleMaps}
              activeOpacity={0.8}
            >
              <Ionicons name="navigate" size={15} color="#FFFFFF" />
              <Text style={styles.quickGpsBtnText}>GPS</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickContactBtn}
              onPress={handleCallCustomer}
              activeOpacity={0.8}
            >
              <Ionicons name="call" size={15} color={COLORS.primary} />
              <Text style={styles.quickContactBtnText}>Llamar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickContactBtn, styles.quickWhatsappBtn]}
              onPress={handleWhatsApp}
              activeOpacity={0.8}
            >
              <Ionicons name="logo-whatsapp" size={16} color="#16A34A" />
              <Text style={[styles.quickContactBtnText, { color: '#16A34A' }]}>
                WhatsApp
              </Text>
            </TouchableOpacity>
          </View>

          {/* Si ya fue entregado */}
          {order.deliveredAt && (
            <View style={styles.deliveredAtRow}>
              <Ionicons name="checkmark-done-circle" size={16} color={COLORS.success} />
              <Text style={styles.deliveredAtText}>
                Entregado el {formatDateTime(order.deliveredAt)}
              </Text>
            </View>
          )}

          {/* Botón de Edición (Admin) */}
          {isAdmin && (
            <TouchableOpacity
              style={styles.editOrderBannerBtn}
              onPress={handleOpenEditModal}
              activeOpacity={0.8}
            >
              <Ionicons name="create-outline" size={15} color={COLORS.primary} />
              <Text style={styles.editOrderBannerText}>Editar Datos del Despacho</Text>
              <Ionicons name="chevron-forward" size={14} color={COLORS.primary} />
            </TouchableOpacity>
          )}
        </View>

        {/* TARJETA 2: MANIFIESTO DE CARGA, RETORNABLES Y COBRO */}
        <View style={styles.card}>
          <View style={styles.cardHeaderWithTotal}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="cube-outline" size={17} color={COLORS.secondary} />
              <Text style={styles.cardHeaderTitle}>Carga y Cobro</Text>
            </View>
            <Text style={styles.grandTotalText}>
              {formatCurrency(order.totalAmount)}
            </Text>
          </View>

          {/* Lista de Productos */}
          <View style={styles.itemsListContainer}>
            {order.items.map((item, index) => (
              <View key={item.id || index} style={styles.itemRowCompact}>
                <View style={styles.itemQtyBadge}>
                  <Text style={styles.itemQtyText}>{item.quantity}x</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemNameCompact}>{item.name}</Text>
                  <Text style={styles.itemUnitCompact}>
                    {item.unit ? `${item.unit} • ` : ''}{formatCurrency(item.unitPrice)} c/u
                  </Text>
                </View>
                <Text style={styles.itemTotalCompact}>
                  {formatCurrency(item.quantity * item.unitPrice)}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.infoDivider} />

          {/* Envases Retornables a Recuperar */}
          <View style={styles.returnContainersCompactRow}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Ionicons name="repeat" size={15} color="#D97706" />
                <Text style={styles.returnContainersTitle}>Envases Retornables</Text>
              </View>
              <Text style={styles.returnContainersSub}>
                Vacíos a recuperar del cliente
              </Text>
            </View>

            <View style={styles.counterControlGroup}>
              <TouchableOpacity
                style={styles.counterBtnSmall}
                onPress={() => handleUpdateReturnedContainers(-1)}
              >
                <Ionicons name="remove" size={16} color={COLORS.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.counterQtyTextLarge}>{order.returnedContainers || 0}</Text>
              <TouchableOpacity
                style={styles.counterBtnSmall}
                onPress={() => handleUpdateReturnedContainers(1)}
              >
                <Ionicons name="add" size={16} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.infoDivider} />

          {/* Método de Pago y Arqueo Rápido de Efectivo */}
          <View style={styles.paymentMethodRowCompact}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons
                name={paymentConfig.icon as any}
                size={16}
                color={COLORS.textSecondary}
              />
              <Text style={styles.paymentMethodLabel}>
                {paymentConfig.label}
              </Text>
            </View>
            <View
              style={[
                styles.paymentStatusPill,
                order.paymentStatus === 'PAID'
                  ? styles.paymentPaid
                  : styles.paymentPending,
              ]}
            >
              <Text
                style={[
                  styles.paymentStatusText,
                  order.paymentStatus === 'PAID'
                    ? { color: COLORS.success }
                    : { color: COLORS.warning },
                ]}
              >
                {order.paymentStatus === 'PAID' ? 'PAGADO' : 'POR COBRAR'}
              </Text>
            </View>
          </View>

          {/* Instrucciones de Cobro y Vuelto si es Efectivo (Solo Lectura Instructivo para Repartidor) */}
          {order.paymentMethod === 'CASH' && (
            <View style={styles.cashDetailBoxCompact}>
              {order.amountPaid && order.amountPaid > order.totalAmount ? (
                <>
                  <View style={styles.cashInstructionRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="cash-outline" size={16} color="#059669" />
                      <Text style={styles.cashInstructionLabel}>Cliente paga con billete:</Text>
                    </View>
                    <Text style={styles.cashInstructionAmount}>{formatCurrency(order.amountPaid)}</Text>
                  </View>
                  <View style={styles.changeInstructionRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="swap-horizontal-outline" size={16} color="#2563EB" />
                      <Text style={styles.changeInstructionLabel}>Entregar vuelto:</Text>
                    </View>
                    <Text style={styles.changeInstructionAmount}>
                      {formatCurrency(order.changeDue || (order.amountPaid - order.totalAmount))}
                    </Text>
                  </View>
                </>
              ) : order.amountPaid && order.amountPaid === order.totalAmount ? (
                <View style={styles.cashInstructionRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="checkmark-done-circle-outline" size={16} color="#059669" />
                    <Text style={styles.cashInstructionLabel}>Pago en efectivo:</Text>
                  </View>
                  <Text style={styles.cashExactPill}>Importe exacto ({formatCurrency(order.totalAmount)})</Text>
                </View>
              ) : (
                <View style={styles.cashInstructionRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="cash-outline" size={16} color="#D97706" />
                    <Text style={styles.cashInstructionLabel}>Cobro al entregar:</Text>
                  </View>
                  <Text style={styles.cashInstructionAmount}>{formatCurrency(order.totalAmount)}</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* TARJETA 3: INSTRUCCIONES ESPECIALES Y VENTANA (SI EXISTEN) */}
        {(order.scheduledTime || order.notes) && (
          <View style={styles.notesCardCompact}>
            {order.scheduledTime ? (
              <View style={styles.noteItemRow}>
                <Ionicons name="time-outline" size={15} color="#475569" />
                <Text style={styles.noteItemText}>
                  Ventana de entrega: <Text style={{ fontWeight: '700' }}>{order.scheduledTime}</Text>
                </Text>
              </View>
            ) : null}

            {order.notes ? (
              <View style={[styles.noteItemRow, order.scheduledTime ? { marginTop: 4 } : undefined]}>
                <Ionicons name="document-text-outline" size={15} color="#475569" />
                <Text style={styles.noteItemText}>
                  Nota: <Text style={{ fontStyle: 'italic' }}>{order.notes}</Text>
                </Text>
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>

      {/* BARRA DE ACCIÓN FIJA INFERIOR (STICKY FOOTER - CERO SCROLL) */}
      <View style={styles.stickyFooter}>
        {order.status === 'PENDING' && (
          <View style={styles.footerRowTwoBtns}>
            <TouchableOpacity
              style={styles.footerOutlineBtn}
              onPress={() => handleSetStatus('CANCELLED')}
              activeOpacity={0.8}
            >
              <Ionicons name="close-circle-outline" size={16} color={COLORS.danger} />
              <Text style={styles.footerOutlineBtnText}>Anular</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.footerPrimaryBtn}
              onPress={() => handleSetStatus('IN_TRANSIT')}
              activeOpacity={0.85}
            >
              <Ionicons name="bicycle" size={18} color="#FFFFFF" />
              <Text style={styles.footerPrimaryBtnText}>Despachar a Ruta</Text>
            </TouchableOpacity>
          </View>
        )}

        {order.status === 'IN_TRANSIT' && (
          <View style={styles.footerRowTwoBtns}>
            <TouchableOpacity
              style={styles.footerOutlineBtn}
              onPress={() => handleSetStatus('PENDING')}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-undo-outline" size={16} color={COLORS.textSecondary} />
              <Text style={[styles.footerOutlineBtnText, { color: COLORS.textSecondary }]}>
                Atrás
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.footerSuccessBtn}
              onPress={() => handleSetStatus('DELIVERED')}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark-done" size={20} color="#FFFFFF" />
              <Text style={styles.footerSuccessBtnText}>
                Confirmar Entrega ({formatCurrency(order.totalAmount)})
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {order.status === 'DELIVERED' && (
          <View style={styles.completedBannerCompact}>
            <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
            <View style={{ flex: 1 }}>
              <Text style={styles.completedTitleCompact}>¡Entrega Concluida y Cobrada!</Text>
              <Text style={styles.completedSubtitleCompact}>
                Liquidación conforme de {formatCurrency(order.totalAmount)}.
              </Text>
            </View>
            {isAdmin && (
              <TouchableOpacity
                onPress={() => handleSetStatus('IN_TRANSIT')}
                style={styles.reopenSmallBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.reopenSmallBtnText}>Reabrir</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {order.status === 'CANCELLED' && (
          <View style={styles.cancelledBannerCompact}>
            <Ionicons name="alert-circle" size={24} color={COLORS.danger} />
            <View style={{ flex: 1 }}>
              <Text style={styles.cancelledTitleCompact}>Pedido Anulado</Text>
              <Text style={styles.cancelledSubtitleCompact}>
                Despacho fuera del balance activo.
              </Text>
            </View>
            {isAdmin && (
              <TouchableOpacity
                onPress={() => handleSetStatus('PENDING')}
                style={styles.reopenSmallBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.reopenSmallBtnText}>Reactivar</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Modal de edición de pedido */}
      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="create" size={20} color={COLORS.primary} />
                <Text style={styles.modalTitle}>Editar Solicitud / Pedido</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsEditModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Prioridad */}
              <Text style={styles.editSectionLabel}>Nivel de Prioridad:</Text>
              <View style={styles.priorityEditRow}>
                {(['NORMAL', 'HIGH', 'URGENT'] as OrderPriority[]).map((p) => {
                  const cfg = PRIORITY_CONFIG[p];
                  const isSel = editPriority === p;
                  return (
                    <TouchableOpacity
                      key={p}
                      style={[
                        styles.priorityEditPill,
                        isSel && { backgroundColor: cfg.color, borderColor: cfg.color },
                      ]}
                      onPress={() => {
                        hapticSelection();
                        setEditPriority(p);
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={cfg.icon as any}
                        size={14}
                        color={isSel ? '#FFFFFF' : cfg.color}
                      />
                      <Text
                        style={[
                          styles.priorityEditPillText,
                          isSel && { color: '#FFFFFF', fontWeight: '800' },
                        ]}
                      >
                        {cfg.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Dirección */}
              <CustomInput
                label="Dirección de Entrega"
                value={editAddress}
                onChangeText={setEditAddress}
                placeholder="Av. Principal 123"
                icon="location-outline"
                required
              />

              {/* Referencia */}
              <CustomInput
                label="Referencia de Llegada"
                value={editReference}
                onChangeText={setEditReference}
                placeholder="Frente al parque, portón verde"
                icon="navigate-outline"
              />

              {/* Horario Programado */}
              <CustomInput
                label="Ventana de Horario (Ej: 11:30 AM)"
                value={editScheduledTime}
                onChangeText={setEditScheduledTime}
                placeholder="Ej. 10:30 AM - 12:00 PM"
                icon="time-outline"
              />

              {/* Notas / Descripción */}
              <CustomInput
                label="Instrucciones / Descripción Especial"
                value={editNotes}
                onChangeText={setEditNotes}
                placeholder="Indicaciones para el distribuidor..."
                icon="document-text-outline"
                multiline
                numberOfLines={3}
              />

              {/* Billete en Efectivo (Configurable solo por Admin) */}
              {order.paymentMethod === 'CASH' && (
                <CustomInput
                  label="Billete con el que paga el cliente (Para cálculo de vuelto)"
                  value={editAmountPaid}
                  onChangeText={setEditAmountPaid}
                  placeholder={`Ej. 50 o 100 (Total a cobrar: ${formatCurrency(order.totalAmount)})`}
                  icon="cash-outline"
                  keyboardType="decimal-pad"
                />
              )}

              {/* Botones de Acción */}
              <View style={styles.modalButtonsRow}>
                <TouchableOpacity
                  style={styles.cancelModalBtn}
                  onPress={() => setIsEditModalVisible(false)}
                >
                  <Text style={styles.cancelModalBtnText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.saveModalBtn}
                  onPress={handleSaveEdit}
                >
                  <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                  <Text style={styles.saveModalBtnText}>Guardar Cambios</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 24,
  },
  notFoundContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  notFoundTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 12,
  },
  notFoundText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 6,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
    elevation: 2,
    shadowColor: COLORS.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  clientHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  clientNameAndType: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  customerTypeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  customerTypeB2B: {
    backgroundColor: '#EFF6FF',
  },
  customerTypeB2C: {
    backgroundColor: '#ECFDF5',
  },
  customerTypeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  customerAddress: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  customerRef: {
    fontSize: 11.5,
    color: COLORS.textMuted,
    fontStyle: 'italic',
    marginTop: 2,
  },
  statusBadgesCol: {
    alignItems: 'flex-end',
    gap: 5,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickGpsBtn: {
    flex: 1.1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: 12,
    elevation: 2,
  },
  quickGpsBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  quickContactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingVertical: 10,
    borderRadius: 12,
  },
  quickContactBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  quickWhatsappBtn: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  deliveredAtRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 6,
  },
  deliveredAtText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.success,
  },
  cardHeaderWithTotal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardHeaderTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: COLORS.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  grandTotalText: {
    fontSize: 19,
    fontWeight: '900',
    color: COLORS.primary,
  },
  itemsListContainer: {
    gap: 6,
  },
  itemRowCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  itemQtyBadge: {
    backgroundColor: '#EFF6FF',
    minWidth: 28,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  itemQtyText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0284C7',
  },
  itemNameCompact: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  itemUnitCompact: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  itemTotalCompact: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
  returnContainersCompactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  returnContainersTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#B45309',
  },
  returnContainersSub: {
    fontSize: 11,
    color: '#92400E',
    marginTop: 1,
  },
  counterControlGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  counterBtnSmall: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterQtyTextLarge: {
    fontSize: 14,
    fontWeight: '800',
    paddingHorizontal: 8,
    color: COLORS.textPrimary,
  },
  paymentMethodRowCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  paymentMethodLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  paymentStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  paymentPaid: {
    backgroundColor: '#ECFDF5',
  },
  paymentPending: {
    backgroundColor: '#FEF3C7',
  },
  paymentStatusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  cashDetailBoxCompact: {
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 6,
  },
  cashInstructionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cashInstructionLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#92400E',
  },
  cashInstructionAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#78350F',
  },
  cashExactPill: {
    fontSize: 12,
    fontWeight: '800',
    color: '#065F46',
  },
  changeInstructionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#FDE68A',
  },
  changeInstructionLabel: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#1E40AF',
  },
  changeInstructionAmount: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1D4ED8',
  },
  notesCardCompact: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  noteItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  noteItemText: {
    fontSize: 12,
    color: '#475569',
    flex: 1,
  },
  stickyFooter: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 16 : 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  footerRowTwoBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  footerOutlineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  footerOutlineBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.danger,
  },
  footerPrimaryBtn: {
    flex: 2.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    elevation: 2,
  },
  footerPrimaryBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  footerSuccessBtn: {
    flex: 2.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.success,
    elevation: 3,
  },
  footerSuccessBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  completedBannerCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    padding: 10,
    gap: 10,
  },
  completedTitleCompact: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065F46',
  },
  completedSubtitleCompact: {
    fontSize: 11,
    color: '#047857',
  },
  cancelledBannerCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 10,
    gap: 10,
  },
  cancelledTitleCompact: {
    fontSize: 13,
    fontWeight: '800',
    color: '#991B1B',
  },
  cancelledSubtitleCompact: {
    fontSize: 11,
    color: '#B91C1C',
  },
  reopenSmallBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  reopenSmallBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  /* Edit Button & Modal */
  editOrderBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 14,
    gap: 8,
  },
  editOrderBannerText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: 20,
    maxHeight: '88%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  editSectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  priorityEditRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  priorityEditPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: '#F8FAFC',
    gap: 6,
  },
  priorityEditPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    paddingBottom: 20,
  },
  cancelModalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  cancelModalBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  saveModalBtn: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    elevation: 3,
  },
  saveModalBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});

