/**
 * ============================================================================
 * ORDER COMPONENT: PriorityBadge.tsx
 * Visual pill badge representing dispatch urgency (Urgente, Alta, Normal)
 * ============================================================================
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OrderPriority } from '../../models/Order';
import { PRIORITY_CONFIG } from '../../utils/constants';

export interface PriorityBadgeProps {
  priority: OrderPriority;
  size?: 'sm' | 'md';
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({
  priority,
  size = 'md',
}) => {
  const config = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.NORMAL;
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
        size={isSmall ? 11 : 13}
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
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 16,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
  },
  icon: {
    marginRight: 3,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  labelSmall: {
    fontSize: 9,
    fontWeight: '700',
  },
});
