/**
 * ============================================================================
 * UTILITY: priorityHelper.ts
 * Cálculo inteligente y automático de prioridad y urgencia basado en tiempo de espera
 * ============================================================================
 */

import { Order, OrderPriority } from '../models/Order';

export interface DynamicPriorityInfo {
  priority: OrderPriority;
  waitMinutes: number;
  timeLabel: string;
  urgencyReason: string;
  badgeColor: string;
  badgeBg: string;
}

/**
 * Calcula dinámicamente la prioridad de un pedido en base al tiempo transcurrido
 * desde su creación o horario programado.
 *
 * Reglas de negocio automáticas:
 * - Menos de 30 minutos: NORMAL (A tiempo)
 * - De 30 a 60 minutos: HIGH (Atención prioritaria - en espera)
 * - Más de 60 minutos: URGENT (¡Demorado! Atención inmediata requerida)
 */
export function getDynamicPriority(order: Order): DynamicPriorityInfo {
  // Si el pedido ya fue entregado o cancelado, mantenemos prioridad normal
  if (order.status === 'DELIVERED') {
    return {
      priority: 'NORMAL',
      waitMinutes: 0,
      timeLabel: 'Entregado',
      urgencyReason: 'Entrega finalizada',
      badgeColor: '#10B981',
      badgeBg: '#ECFDF5',
    };
  }

  if (order.status === 'CANCELLED') {
    return {
      priority: 'NORMAL',
      waitMinutes: 0,
      timeLabel: 'Cancelado',
      urgencyReason: 'Pedido anulado',
      badgeColor: '#94A3B8',
      badgeBg: '#F1F5F9',
    };
  }

  const createdTime = new Date(order.createdAt).getTime();
  const now = Date.now();
  const diffMs = Math.max(0, now - createdTime);
  const waitMinutes = Math.floor(diffMs / (1000 * 60));

  let timeLabel = '';
  if (waitMinutes < 1) {
    timeLabel = 'Hace un momento';
  } else if (waitMinutes < 60) {
    timeLabel = `Hace ${waitMinutes} min`;
  } else {
    const hours = Math.floor(waitMinutes / 60);
    const mins = waitMinutes % 60;
    timeLabel = `Hace ${hours}h ${mins > 0 ? `${mins}m` : ''}`;
  }

  // Escalado automático de prioridad según tiempo de espera
  if (waitMinutes >= 60) {
    return {
      priority: 'URGENT',
      waitMinutes,
      timeLabel,
      urgencyReason: `¡Demorado! Esperando más de ${Math.floor(waitMinutes / 60)}h`,
      badgeColor: '#DC2626',
      badgeBg: '#FEE2E2',
    };
  } else if (waitMinutes >= 30) {
    return {
      priority: 'HIGH',
      waitMinutes,
      timeLabel,
      urgencyReason: 'En espera prolongada (+30 min)',
      badgeColor: '#D97706',
      badgeBg: '#FEF3C7',
    };
  } else {
    return {
      priority: 'NORMAL',
      waitMinutes,
      timeLabel,
      urgencyReason: 'A tiempo (<30 min)',
      badgeColor: '#0284C7',
      badgeBg: '#E0F2FE',
    };
  }
}
