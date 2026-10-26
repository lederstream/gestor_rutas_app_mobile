/**
 * ============================================================================
 * ORDER COMPONENT: OrderFilterBar.tsx
 * Horizontal scrollable filter bar with real-time status count badges
 * ============================================================================
 */

import React from 'react';
import {
  ScrollView,
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
} from 'react-native';
import { OrderStatus } from '../../models/Order';
import { COLORS } from '../../utils/constants';

export interface OrderFilterBarProps {
  activeStatus: OrderStatus | 'ALL';
  onSelectStatus: (status: OrderStatus | 'ALL') => void;
  counts: {
    all: number;
    pending: number;
    inTransit: number;
    delivered: number;
    cancelled: number;
  };
}

interface FilterTab {
  id: OrderStatus | 'ALL';
  label: string;
  count: number;
}

export const OrderFilterBar: React.FC<OrderFilterBarProps> = ({
  activeStatus,
  onSelectStatus,
  counts,
}) => {
  const tabs: FilterTab[] = [
    { id: 'ALL', label: 'Todos', count: counts.all },
    { id: 'PENDING', label: 'Pendientes', count: counts.pending },
    { id: 'IN_TRANSIT', label: 'En Ruta', count: counts.inTransit },
    { id: 'DELIVERED', label: 'Entregados', count: counts.delivered },
    { id: 'CANCELLED', label: 'Cancelados', count: counts.cancelled },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {tabs.map((tab) => {
          const isActive = activeStatus === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              activeOpacity={0.75}
              style={[styles.pill, isActive && styles.pillActive]}
              onPress={() => onSelectStatus(tab.id)}
            >
              <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
                {tab.label}
              </Text>
              <View
                style={[
                  styles.countBadge,
                  isActive && styles.countBadgeActive,
                ]}
              >
                <Text
                  style={[
                    styles.countText,
                    isActive && styles.countTextActive,
                  ]}
                >
                  {tab.count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  scrollContent: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  pillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    elevation: 2,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginRight: 6,
  },
  pillTextActive: {
    color: COLORS.textInverse,
    fontWeight: '700',
  },
  countBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  countTextActive: {
    color: COLORS.textInverse,
  },
});
