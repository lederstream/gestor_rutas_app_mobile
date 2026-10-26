/**
 * ============================================================================
 * ORDER COMPONENT: OrderCard.tsx
 * High-density logistics card with category badges, items summary & quick actions
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
import { COLORS, CATEGORY_CONFIG, PAYMENT_METHOD_CONFIG } from '../../utils/constants';
import { formatCurrency } from '../../utils/formatters';
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
  const categoryConfig = CATEGORY_CONFIG[order.category];
  const paymentConfig = PAYMENT_METHOD_CONFIG[order.paymentMethod];

  // Aggregate items summary
  const itemsSummary = order.items
    .map((item) => `${item.quantity}x ${item.name}`)
    .join(', ');

  const handleStartRoute = (e: any) => {
    e.stopPropagation?.();
    if (onQuickStatusChange) {
      onQuickStatusChange(order.id, 'IN_TRANSIT');
    }
  };

  const handleMarkDelivered = (e: any) => {
    e.stopPropagation?.();
    if (onQuickStatusChange) {
      onQuickStatusChange(order.id, 'DELIVERED');
    }
  };

  const handleOpenGps = (e: any) => {
    e.stopPropagation?.();
    const fullAddress = `${order.deliveryAddress}, ${order.district}, Lima, Perú`;
    const encoded = encodeURIComponent(fullAddress);
    const url = Platform.select({
      ios: `maps://?daddr=${encoded}&dirflg=d`,
      android: `google.navigation:q=${encoded}&mode=d`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${encoded}`,
    });
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(url);
        } else {
          return Linking.openURL(
            `https://www.google.com/maps/dir/?api=1&destination=${encoded}`
          );
        }
      })
      .catch(() => {
        Linking.openURL(
          `https://www.google.com/maps/dir/?api=1&destination=${encoded}`
        );
      });
  };

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      style={styles.card}
      onPress={onPress}
    >
      {/* Top Header: Code, Category, Priority */}
      <View style={styles.headerRow}>
        <View style={styles.codeAndCat}>
          <Text style={styles.orderCode}>{order.orderCode}</Text>
          <View
            style={[
              styles.categoryTag,
              { backgroundColor: categoryConfig?.bg || '#F1F5F9' },
            ]}
          >
            <Ionicons
              name={categoryConfig?.icon as any}
              size={12}
              color={categoryConfig?.color || COLORS.textSecondary}
              style={styles.catIcon}
            />
            <Text
              style={[
                styles.categoryLabel,
                { color: categoryConfig?.color || COLORS.textSecondary },
              ]}
              numberOfLines={1}
            >
              {categoryConfig?.label.split(' ')[0]}
            </Text>
          </View>
        </View>

        <PriorityBadge priority={order.priority} size="sm" />
      </View>

      {/* Customer Name */}
      <Text style={styles.customerName} numberOfLines={1}>
        {order.customerName}
      </Text>

      {/* Address & District with Quick GPS */}
      <View style={styles.addressRow}>
        <Ionicons
          name="location"
          size={15}
          color={COLORS.primary}
          style={styles.locationIcon}
        />
        <Text style={styles.addressText} numberOfLines={2}>
          {order.deliveryAddress}{' '}
          <Text style={styles.districtText}>({order.district})</Text>
        </Text>
        <TouchableOpacity
          style={styles.quickGpsBtn}
          onPress={handleOpenGps}
          activeOpacity={0.7}
        >
          <Ionicons name="navigate" size={11} color="#FFFFFF" />
          <Text style={styles.quickGpsText}>GPS</Text>
        </TouchableOpacity>
      </View>

      {/* Items Summary Pill */}
      <View style={styles.itemsBox}>
        <Ionicons name="cube-outline" size={14} color={COLORS.textSecondary} />
        <Text style={styles.itemsText} numberOfLines={2}>
          {itemsSummary}
        </Text>
      </View>

      {/* Delivery Schedule if present */}
      {order.scheduledTime && (
        <View style={styles.scheduleRow}>
          <Ionicons name="alarm-outline" size={13} color={COLORS.textMuted} />
          <Text style={styles.scheduleText}>
            Horario programado: {order.scheduledTime}
          </Text>
        </View>
      )}

      {/* Card Divider */}
      <View style={styles.divider} />

      {/* Footer: Price, Payment Method, Status Badge */}
      <View style={styles.footerRow}>
        <View>
          <Text style={styles.totalLabel}>Total a Cobrar</Text>
          <View style={styles.amountContainer}>
            <Text style={styles.totalAmount}>
              {formatCurrency(order.totalAmount)}
            </Text>
            <View style={styles.paymentMethodPill}>
              <Ionicons
                name={paymentConfig.icon as any}
                size={11}
                color={COLORS.textSecondary}
              />
              <Text style={styles.paymentMethodText}>
                {paymentConfig.label.split(' ')[0]}
              </Text>
            </View>
          </View>
        </View>

        <StatusBadge status={order.status} size="sm" />
      </View>

      {/* Quick Action Buttons per status */}
      {order.status === 'PENDING' && onQuickStatusChange && (
        <TouchableOpacity
          style={styles.quickActionButtonTransit}
          onPress={handleStartRoute}
          activeOpacity={0.8}
        >
          <Ionicons name="bicycle" size={15} color={COLORS.primary} />
          <Text style={styles.quickActionTextTransit}>
            Despachar a Ruta
          </Text>
        </TouchableOpacity>
      )}

      {order.status === 'IN_TRANSIT' && onQuickStatusChange && (
        <TouchableOpacity
          style={styles.quickActionButtonDeliver}
          onPress={handleMarkDelivered}
          activeOpacity={0.8}
        >
          <Ionicons name="checkmark-done" size={15} color={COLORS.success} />
          <Text style={styles.quickActionTextDeliver}>
            Confirmar Entrega Conforme
          </Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    // Soft Elevation Shadow
    elevation: 2,
    shadowColor: COLORS.cardShadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  codeAndCat: {
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
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  catIcon: {
    marginRight: 4,
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  customerName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  locationIcon: {
    marginRight: 6,
    marginTop: 2,
  },
  addressText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  districtText: {
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  quickGpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 3,
    marginLeft: 6,
    alignSelf: 'center',
  },
  quickGpsText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  itemsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
    marginBottom: 6,
  },
  itemsText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  scheduleText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  paymentMethodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  paymentMethodText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  quickActionButtonTransit: {
    marginTop: 12,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  quickActionTextTransit: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  quickActionButtonDeliver: {
    marginTop: 12,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  quickActionTextDeliver: {
    color: COLORS.success,
    fontSize: 12,
    fontWeight: '700',
  },
});
