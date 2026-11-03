/**
 * ============================================================================
 * SCREEN: OrderDetailScreen.tsx
 * Complete logistics audit, customer contact actions, items breakdown & state transitions
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

  // Estados para Modal de Edición de Solicitud (Rúbrica: Detalle / Editar Solicitud)
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editPriority, setEditPriority] = useState<OrderPriority>(order?.priority || 'NORMAL');
  const [editAddress, setEditAddress] = useState(order?.deliveryAddress || '');
  const [editReference, setEditReference] = useState(order?.addressReference || '');
  const [editScheduledTime, setEditScheduledTime] = useState(order?.scheduledTime || '');
  const [editNotes, setEditNotes] = useState(order?.notes || '');

  const handleOpenEditModal = () => {
    if (!order) return;
    setEditPriority(order.priority);
    setEditAddress(order.deliveryAddress);
    setEditReference(order.addressReference || '');
    setEditScheduledTime(order.scheduledTime || '');
    setEditNotes(order.notes || '');
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
    updateOrder({
      ...order,
      priority: editPriority,
      deliveryAddress: editAddress.trim(),
      addressReference: editReference.trim() || undefined,
      scheduledTime: editScheduledTime.trim() || undefined,
      notes: editNotes.trim() || undefined,
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

  const handleUpdateCashPaid = (text: string) => {
    if (!order) return;
    const num = parseFloat(text);
    const paid = isNaN(num) ? undefined : num;
    const change = paid && paid > order.totalAmount ? paid - order.totalAmount : undefined;
    updateOrder({
      ...order,
      amountPaid: paid,
      changeDue: change,
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
        'Confirmar Entrega Conforme',
        `¿Confirmas la recepción satisfactoria de ${formatCurrency(order.totalAmount)} y entrega de productos?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Sí, Confirmar Entrega',
            onPress: () => updateOrderStatus(order.id, 'DELIVERED'),
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
            onPress: () => updateOrderStatus(order.id, 'CANCELLED'),
          },
        ]
      );
    } else {
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
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      <Header
        title={`Pedido ${order.orderCode}`}
        subtitle={`Creado el ${formatDateTime(order.createdAt)}`}
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
        rightActionIcon={isAdmin ? "trash-outline" : undefined}
        onRightActionPress={isAdmin ? handleDeleteOrder : undefined}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Status & Urgency Header Card */}
        <View style={styles.statusBannerCard}>
          <View style={styles.statusRow}>
            <View>
              <Text style={styles.statusBannerCaption}>Estado de Entrega</Text>
              <View style={styles.badgesWrapper}>
                <StatusBadge status={order.status} size="md" />
                <PriorityBadge priority={order.priority} size="md" />
              </View>
            </View>

            <View style={styles.categoryBadgeRight}>
              <View
                style={[
                  styles.categoryCircle,
                  { backgroundColor: categoryConfig?.bg || '#F1F5F9' },
                ]}
              >
                <Ionicons
                  name={categoryConfig?.icon as any}
                  size={20}
                  color={categoryConfig?.color || COLORS.primary}
                />
              </View>
              <Text style={styles.categoryLabelText}>
                {categoryConfig?.label.split(' ')[0]}
              </Text>
            </View>
          </View>

          {order.deliveredAt && (
            <View style={styles.deliveredAtRow}>
              <Ionicons name="checkmark-done-circle" size={16} color={COLORS.success} />
              <Text style={styles.deliveredAtText}>
                Entregado con éxito el {formatDateTime(order.deliveredAt)}
              </Text>
            </View>
          )}

          {/* Botón Destacado de Edición (Solo Administrador) */}
          {isAdmin && (
            <TouchableOpacity
              style={styles.editOrderBannerBtn}
              onPress={handleOpenEditModal}
              activeOpacity={0.8}
            >
              <Ionicons name="create-outline" size={16} color={COLORS.primary} />
              <Text style={styles.editOrderBannerText}>Editar Solicitud</Text>
              <Ionicons name="chevron-forward" size={14} color={COLORS.primary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Customer Information Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeaderTitle}>Destinatario / Cliente</Text>

          <View style={styles.customerInfoBlock}>
            <View
              style={[
                styles.customerAvatarMini,
                isB2BCustomer({ name: order.customerName })
                  ? styles.customerAvatarB2B
                  : styles.customerAvatarB2C,
              ]}
            >
              <Ionicons
                name={isB2BCustomer({ name: order.customerName }) ? 'storefront' : 'person'}
                size={18}
                color={isB2BCustomer({ name: order.customerName }) ? '#2563EB' : '#059669'}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.customerName}>{order.customerName}</Text>
              <Text style={styles.customerSegmentSub}>
                {isB2BCustomer({ name: order.customerName }) ? 'Negocio (B2B)' : 'Hogar / Persona (B2C)'}
              </Text>
            </View>
          </View>

          <View style={styles.contactActionsRow}>
            <TouchableOpacity
              style={styles.contactBtn}
              onPress={handleCallCustomer}
              activeOpacity={0.75}
            >
              <Ionicons name="call" size={16} color={COLORS.primary} />
              <Text style={styles.contactBtnText}>
                {formatPhone(order.customerPhone)}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.contactBtn, styles.whatsappBtn]}
              onPress={handleWhatsApp}
              activeOpacity={0.75}
            >
              <Ionicons name="logo-whatsapp" size={16} color="#16A34A" />
              <Text style={[styles.contactBtnText, { color: '#16A34A' }]}>
                WhatsApp
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoDivider} />

          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={18} color={COLORS.primary} />
            <View style={styles.infoTextCol}>
              <Text style={styles.infoLabel}>Dirección de Despacho</Text>
              <Text style={styles.infoValue}>{order.deliveryAddress}</Text>
              <Text style={styles.districtBadge}>{order.district}</Text>
            </View>
          </View>

          {order.addressReference && (
            <View style={[styles.infoRow, { marginTop: 10 }]}>
              <Ionicons name="compass-outline" size={18} color={COLORS.textSecondary} />
              <View style={styles.infoTextCol}>
                <Text style={styles.infoLabel}>Referencia de Llegada</Text>
                <Text style={styles.infoValueMuted}>
                  {order.addressReference}
                </Text>
              </View>
            </View>
          )}

          {/* Direct Google Maps Navigation Button */}
          <TouchableOpacity
            style={styles.gpsNavigationButton}
            onPress={handleOpenGoogleMaps}
            activeOpacity={0.85}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={styles.gpsIconCircle}>
                <Ionicons name="navigate" size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.gpsButtonTitle}>Abrir en Google Maps</Text>
            </View>
            <Ionicons name="open-outline" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Product Items & Billing Breakdown */}
        <View style={styles.card}>
          <Text style={styles.cardHeaderTitle}>Detalle de Carga y Facturación</Text>

          {order.items.map((item, index) => (
            <View key={item.id || index} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemQuantity}>
                  {item.quantity} {item.unit} x {formatCurrency(item.unitPrice)}
                </Text>
              </View>
              <Text style={styles.itemTotal}>
                {formatCurrency(item.quantity * item.unitPrice)}
              </Text>
            </View>
          ))}

          <View style={styles.infoDivider} />

          <View style={styles.totalRow}>
            <View>
              <Text style={styles.totalRowLabel}>Monto Total Liquidado</Text>
              <View style={styles.paymentMethodRow}>
                <Ionicons
                  name={paymentConfig.icon as any}
                  size={14}
                  color={COLORS.textSecondary}
                />
                <Text style={styles.paymentMethodLabel}>
                  {paymentConfig.label}
                </Text>
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
            </View>

            <Text style={styles.grandTotalText}>
              {formatCurrency(order.totalAmount)}
            </Text>
          </View>

          {/* Arqueo de vuelto para pagos en efectivo */}
          {order.paymentMethod === 'CASH' && (
            <View style={styles.cashDetailBox}>
              <View style={styles.cashDetailHeader}>
                <Ionicons name="cash-outline" size={16} color="#92400E" />
                <Text style={styles.cashDetailTitle}>Arqueo de Pago en Efectivo</Text>
              </View>
              <View style={styles.cashInputRow}>
                <Text style={styles.cashInputLabel}>Cliente paga con:</Text>
                <TextInput
                  style={styles.cashInputSmall}
                  placeholder="Ej. 100"
                  defaultValue={order.amountPaid ? String(order.amountPaid) : ''}
                  onChangeText={handleUpdateCashPaid}
                  keyboardType="decimal-pad"
                />
              </View>
              {order.changeDue !== undefined && order.changeDue > 0 ? (
                <View style={styles.changeRow}>
                  <Text style={styles.changeLabel}>Vuelto a Devolver:</Text>
                  <Text style={styles.changeValue}>{formatCurrency(order.changeDue)}</Text>
                </View>
              ) : null}
            </View>
          )}
        </View>

        {/* Control de Envases Retornables (Bidones / Balones) */}
        <View style={styles.card}>
          <Text style={styles.cardHeaderTitle}>Control de Envases Retornables</Text>
          <Text style={styles.containerDesc}>
            Control de envases vacíos recuperados del cliente (garantías y préstamos):
          </Text>
          <View style={styles.containerCounterRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.containerLabel}>Envases Recuperados:</Text>
              <Text style={styles.containerSub}>Balones o bidones vacíos que suben al vehículo</Text>
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
        </View>

        {/* Driver & Delivery Notes */}
        <View style={styles.card}>
          <Text style={styles.cardHeaderTitle}>Operaciones y Transporte</Text>

          {order.driverAssigned && (
            <View style={styles.infoRow}>
              <Ionicons name="car-outline" size={18} color={COLORS.primary} />
              <View style={styles.infoTextCol}>
                <Text style={styles.infoLabel}>Unidad / Conductor Asignado</Text>
                <Text style={styles.infoValue}>{order.driverAssigned}</Text>
              </View>
            </View>
          )}

          {order.scheduledTime && (
            <View style={[styles.infoRow, { marginTop: 10 }]}>
              <Ionicons name="time-outline" size={18} color={COLORS.textSecondary} />
              <View style={styles.infoTextCol}>
                <Text style={styles.infoLabel}>Ventana de Entrega</Text>
                <Text style={styles.infoValue}>{order.scheduledTime}</Text>
              </View>
            </View>
          )}

          {order.notes && (
            <View style={[styles.infoRow, { marginTop: 10 }]}>
              <Ionicons name="document-text-outline" size={18} color={COLORS.textSecondary} />
              <View style={styles.infoTextCol}>
                <Text style={styles.infoLabel}>Instrucciones Especiales</Text>
                <Text style={styles.infoValueMuted}>{order.notes}</Text>
              </View>
            </View>
          )}
        </View>

        {/* State Transition Action Buttons */}
        <View style={styles.actionsBlock}>
          {order.status === 'PENDING' && (
            <>
              <CustomButton
                title="Despachar a Ruta"
                icon="bicycle-outline"
                size="lg"
                variant="primary"
                onPress={() => handleSetStatus('IN_TRANSIT')}
                fullWidth
              />
              <CustomButton
                title="Cancelar Pedido"
                icon="close-circle-outline"
                size="md"
                variant="outline"
                onPress={() => handleSetStatus('CANCELLED')}
                textStyle={{ color: COLORS.danger }}
                style={{ borderColor: COLORS.danger, marginTop: 10 }}
                fullWidth
              />
            </>
          )}

          {order.status === 'IN_TRANSIT' && (
            <>
              <CustomButton
                title="Abrir en Google Maps"
                icon="navigate-circle-outline"
                size="lg"
                variant="primary"
                onPress={handleOpenNavigationModal}
                style={{ marginBottom: 10 }}
                fullWidth
              />
              <CustomButton
                title="Confirmar Entrega"
                icon="checkmark-done-outline"
                size="lg"
                variant="success"
                onPress={() => handleSetStatus('DELIVERED')}
                fullWidth
              />
              <CustomButton
                title="Volver a Pendiente"
                icon="arrow-undo-outline"
                size="md"
                variant="outline"
                onPress={() => handleSetStatus('PENDING')}
                style={{ marginTop: 10 }}
                fullWidth
              />
            </>
          )}

          {order.status === 'DELIVERED' && (
            <View style={styles.completedBanner}>
              <Ionicons name="checkmark-circle" size={28} color={COLORS.success} />
              <View style={{ flex: 1 }}>
                <Text style={styles.completedTitle}>¡Entrega Concluida!</Text>
                <Text style={styles.completedSubtitle}>
                  El cliente recibió conforme los productos y la liquidación está asentada.
                </Text>
              </View>
            </View>
          )}

          {order.status === 'CANCELLED' && (
            <View style={styles.cancelledBanner}>
              <Ionicons name="alert-circle" size={28} color={COLORS.danger} />
              <View style={{ flex: 1 }}>
                <Text style={styles.cancelledTitle}>Pedido Anulado</Text>
                <Text style={styles.cancelledSubtitle}>
                  Este despacho no será computado en el balance activo de ruta.
                </Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modal de Edición de Solicitud (Rúbrica: Detalle / Editar Solicitud) */}
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
                placeholder="Indicaciones para el repartidor..."
                icon="document-text-outline"
                multiline
                numberOfLines={3}
              />

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
    padding: 16,
    paddingBottom: 40,
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
  statusBannerCard: {
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
    shadowRadius: 6,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBannerCaption: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  badgesWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryBadgeRight: {
    alignItems: 'center',
  },
  categoryCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  categoryLabelText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  deliveredAtRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 6,
  },
  deliveredAtText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.success,
  },
  card: {
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
  cardHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  customerInfoBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  customerAvatarMini: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  customerAvatarB2B: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  customerAvatarB2C: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  customerName: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  customerSegmentSub: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  contactActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  contactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 10,
    paddingVertical: 9,
    gap: 6,
  },
  whatsappBtn: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  contactBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  infoTextCol: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginTop: 2,
  },
  infoValueMuted: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  districtBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 2,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  itemQuantity: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginLeft: 12,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalRowLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  paymentMethodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  paymentMethodLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  paymentStatusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  paymentPaid: {
    backgroundColor: '#ECFDF5',
  },
  paymentPending: {
    backgroundColor: '#FEF3C7',
  },
  paymentStatusText: {
    fontSize: 9,
    fontWeight: '800',
  },
  grandTotalText: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  actionsBlock: {
    marginTop: 8,
  },
  completedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  completedTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#065F46',
  },
  completedSubtitle: {
    fontSize: 12,
    color: '#047857',
    marginTop: 2,
  },
  cancelledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  cancelledTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#991B1B',
  },
  cancelledSubtitle: {
    fontSize: 12,
    color: '#B91C1C',
    marginTop: 2,
  },
  gpsNavigationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0284C7',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 16,
    elevation: 3,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
  gpsButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  gpsIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gpsButtonTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  gpsButtonSubtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 1,
  },
  gpsButtonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 2,
  },
  gpsButtonBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  cashDetailBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  cashDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  cashDetailTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400E',
    textTransform: 'uppercase',
  },
  cashInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  cashInputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#92400E',
  },
  cashInputSmall: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 14,
    fontWeight: '800',
    color: '#78350F',
    width: 100,
    textAlign: 'center',
  },
  changeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#FDE68A',
  },
  changeLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
  },
  changeValue: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.success,
  },
  containerDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 12,
    lineHeight: 16,
  },
  containerCounterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  containerLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  containerSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
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
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterQtyTextLarge: {
    fontSize: 15,
    fontWeight: '800',
    paddingHorizontal: 10,
    color: COLORS.textPrimary,
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

