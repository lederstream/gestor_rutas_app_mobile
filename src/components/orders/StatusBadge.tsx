/**
 * ============================================================================
 * ORDER COMPONENT: StatusBadge.tsx
 * Visual pill badge representing order distribution state with icons
 * ============================================================================
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OrderStatus } from '../../models/Order';
import { STATUS_CONFIG } from '../../utils/constants';

export interface StatusBadgeProps {
  status: OrderStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
}) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: config.bg, borderColor: config.color },
        isSmall && styles.badgeSmall,
      ]}
    >
      <Ionicons
        name={config.icon as any}
        size={isSmall ? 12 : 14}
        color={config.color}
        style={styles.icon}
      />
      <Text
        style={[
          styles.label,
          { color: config.color },
          isSmall && styles.labelSmall,
        ]}
      >
        {config.label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 14,
  },
  icon: {
    marginRight: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
  },
  labelSmall: {
    fontSize: 10,
    fontWeight: '700',
  },
});
