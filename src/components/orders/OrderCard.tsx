/**
 * ============================================================================
 * ORDER COMPONENT: OrderCard.tsx
 * Tarjeta Ergonómica de Despacho con Alto Contraste y Acciones Rápidas de 48dp+
 * ============================================================================
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Order, OrderStatus } from '../../models/Order';
import {
  COLORS,
  CATEGORY_CONFIG,
  PAYMENT_METHOD_CONFIG,
  SPACING,
  RADIUS,
  TOUCH_TARGET,
} from '../../utils/constants';
import { formatCurrency } from '../../utils/formatters';
import { hapticImpact, hapticSelection } from '../../utils/haptics';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';

export interface OrderCardProps {
  order: Order;
  onPress: () => void;
  onQuickStatusChange?: (id: string, newStatus: OrderStatus) => void;
}

export const OrderCard: React.FC<OrderCardProps> = ({
  order,
  onPress,
  onQuickStatusChange,
}) => {
  const paymentConfig = PAYMENT_METHOD_CONFIG[order.paymentMethod] || {
    label: 'Pago',
    icon: 'cash-outline',
  };

  // Resumen de artículos
  const itemsSummary = order.items
    .map((item) => `${item.quantity}x ${item.name}`)
    .join(', ');

  const handleStartRoute = (e: any) => {
    e.stopPropagation?.();
    hapticImpact('medium');
    if (onQuickStatusChange) {
      onQuickStatusChange(order.id, 'IN_TRANSIT');
    }
  };

  const handleMarkDelivered = (e: any) => {
    e.stopPropagation?.();
    hapticImpact('heavy');
    if (onQuickStatusChange) {
      onQuickStatusChange(order.id, 'DELIVERED');
    }
  };

  const handleOpenGps = (e: any) => {
    e.stopPropagation?.();
    hapticSelection();
    const fullAddress = `${order.deliveryAddress}, ${order.district}, Lima, Perú`;
    const encoded = encodeURIComponent(fullAddress);
    const url = Platform.select({
      ios: `maps://?daddr=${encoded}&dirflg=d`,
      android: `google.navigation:q=${encoded}&mode=d`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${encoded}`,
    });

    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) return Linking.openURL(url);
        return Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${encoded}`);
      })
      .catch(() => {
        Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${encoded}`);
      });
  };

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      style={styles.card}
      onPress={onPress}
    >
      {/* 1. Cabecera: Código, Prioridad y Estado */}
      <View style={styles.headerRow}>
        <View style={styles.codeRow}>
          <Text style={styles.orderCode}>{order.orderCode}</Text>
          <PriorityBadge priority={order.priority} size="sm" />
        </View>
        <StatusBadge status={order.status} size="sm" />
      </View>

      {/* 2. Cliente y Distrito */}
      <View style={styles.customerRow}>
        <Text style={styles.customerName} numberOfLines={1}>
          {order.customerName}
        </Text>
        <View style={styles.districtBadge}>
          <Text style={styles.districtText}>{order.district}</Text>
        </View>
      </View>

      {/* 3. Dirección y Botón Directo GPS */}
      <View style={styles.addressContainer}>
        <View style={styles.addressLeft}>
          <Ionicons name="location" size={16} color={COLORS.primary} style={{ marginTop: 2 }} />
          <Text style={styles.addressText} numberOfLines={2}>
            {order.deliveryAddress}
            {order.addressReference ? ` • ${order.addressReference}` : ''}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.gpsRoundButton}
          onPress={handleOpenGps}
          activeOpacity={0.8}
        >
          <Ionicons name="navigate" size={16} color="#FFFFFF" />
          <Text style={styles.gpsRoundText}>GPS</Text>
        </TouchableOpacity>
      </View>

      {/* 4. Resumen de Productos */}
      <View style={styles.itemsBox}>
        <Ionicons name="cube-outline" size={14} color={COLORS.textSecondary} />
        <Text style={styles.itemsText} numberOfLines={1}>
          {itemsSummary}
        </Text>
      </View>

      {/* 5. Vuelto / Efectivo si corresponde */}
      {order.paymentMethod === 'CASH' && order.changeDue !== undefined && order.changeDue > 0 ? (
        <View style={styles.changeNoticeBox}>
          <Ionicons name="cash" size={14} color="#92400E" />
          <Text style={styles.changeNoticeText}>
            Paga con {formatCurrency(order.amountPaid || 0)} • Entregar Vuelto: {formatCurrency(order.changeDue)}
          </Text>
        </View>
      ) : null}

      {/* 6. Fila de Total y Método de Pago */}
      <View style={styles.footerRow}>
        <View style={styles.amountBox}>
          <Text style={styles.amountTotal}>{formatCurrency(order.totalAmount)}</Text>
          <View style={styles.paymentMethodPill}>
            <Ionicons name={paymentConfig.icon as any} size={13} color={COLORS.textSecondary} />
            <Text style={styles.paymentMethodText}>{paymentConfig.label}</Text>
          </View>
        </View>

        {order.scheduledTime ? (
          <View style={styles.scheduleBadge}>
            <Ionicons name="time-outline" size={12} color={COLORS.textMuted} />
            <Text style={styles.scheduleText}>{order.scheduledTime}</Text>
          </View>
        ) : null}
      </View>

      {/* 7. Botón Primario de Acción Táctil (48dp+ para conductor) */}
      {order.status === 'PENDING' && onQuickStatusChange && (
        <TouchableOpacity
          style={styles.primaryActionButtonTransit}
          onPress={handleStartRoute}
          activeOpacity={0.85}
        >
          <Ionicons name="bicycle" size={18} color="#FFFFFF" />
          <Text style={styles.primaryActionTextWhite}>Despachar a Ruta</Text>
        </TouchableOpacity>
      )}

      {order.status === 'IN_TRANSIT' && onQuickStatusChange && (
        <TouchableOpacity
          style={styles.primaryActionButtonDeliver}
          onPress={handleMarkDelivered}
          activeOpacity={0.85}
        >
          <Ionicons name="checkmark-done" size={18} color="#FFFFFF" />
          <Text style={styles.primaryActionTextWhite}>Confirmar Entrega Conforme</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 2,
    shadowColor: COLORS.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderCode: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.secondary,
    letterSpacing: 0.5,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    gap: 8,
  },
  customerName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  districtBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  districtText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  addressLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  addressText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  gpsRoundButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    minHeight: TOUCH_TARGET.compactHeight,
    paddingHorizontal: 12,
    borderRadius: RADIUS.md,
    gap: 4,
    elevation: 2,
  },
  gpsRoundText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  itemsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
    marginBottom: 8,
  },
  itemsText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  changeNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 6,
    marginBottom: 8,
  },
  changeNoticeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  amountTotal: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  paymentMethodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    gap: 4,
  },
  paymentMethodText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  scheduleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scheduleText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  primaryActionButtonTransit: {
    marginTop: 12,
    backgroundColor: COLORS.primary,
    height: TOUCH_TARGET.min,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 2,
  },
  primaryActionButtonDeliver: {
    marginTop: 12,
    backgroundColor: COLORS.success,
    height: TOUCH_TARGET.min,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 2,
  },
  primaryActionTextWhite: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
