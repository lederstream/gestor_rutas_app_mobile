/**
 * ============================================================================
 * FORMATTERS & LOGISTICS HELPERS
 * Clean formatting utilities for currency, dates, quantities and phones
 * ============================================================================
 */

import { Order, OrderStatistics, RouteLoadItem } from '../models/Order';
import { CATEGORY_CONFIG } from './constants';

/**
 * Format numerical amount to Peruvian Soles (S/.)
 */
export const formatCurrency = (amount: number): string => {
  if (isNaN(amount)) return 'S/. 0.00';
  return `S/. ${amount.toFixed(2)}`;
};

/**
 * Format ISO Date string to readable Peruvian format: DD/MM/YYYY, HH:mm
 */
export const formatDateTime = (isoDateString: string): string => {
  if (!isoDateString) return '-';
  try {
    const date = new Date(isoDateString);
    if (isNaN(date.getTime())) return isoDateString;

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return isoDateString;
  }
};

/**
 * Format Peruvian mobile phone number: e.g. "987 654 321"
 */
export const formatPhone = (phone: string): string => {
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 9) {
    return `${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6)}`;
  }
  return phone;
};

/**
 * Compute real-time dashboard statistics from a list of orders
 */
export const calculateOrderStatistics = (orders: Order[]): OrderStatistics => {
  const totalOrders = orders.length;
  let pendingOrders = 0;
  let inTransitOrders = 0;
  let deliveredOrders = 0;
  let cancelledOrders = 0;
  let totalRevenue = 0;
  let pendingCollection = 0;

  orders.forEach((order) => {
    switch (order.status) {
      case 'PENDING':
        pendingOrders += 1;
        pendingCollection += order.totalAmount;
        break;
      case 'IN_TRANSIT':
        inTransitOrders += 1;
        pendingCollection += order.totalAmount;
        break;
      case 'DELIVERED':
        deliveredOrders += 1;
        totalRevenue += order.totalAmount;
        break;
      case 'CANCELLED':
        cancelledOrders += 1;
        break;
    }
  });

  const validOrders = totalOrders - cancelledOrders;
  const completedDeliveriesRate =
    validOrders > 0 ? Math.round((deliveredOrders / validOrders) * 100) : 0;

  return {
    totalOrders,
    pendingOrders,
    inTransitOrders,
    deliveredOrders,
    cancelledOrders,
    totalRevenue,
    pendingCollection,
    completedDeliveriesRate,
  };
};

/**
 * Compute total physical load by category for the delivery truck / dispatch manifest
 */
export const calculateRouteLoad = (orders: Order[]): RouteLoadItem[] => {
  // Filter active orders (Pending and In Transit)
  const activeOrders = orders.filter(
    (o) => o.status === 'PENDING' || o.status === 'IN_TRANSIT'
  );

  const loadMap: Record<string, { count: number; unit: string; label: string }> = {
    WATER: { count: 0, unit: 'Bidones', label: CATEGORY_CONFIG.WATER.label },
    GAS: { count: 0, unit: 'Balones', label: CATEGORY_CONFIG.GAS.label },
    BAKERY: { count: 0, unit: 'Sacos/Cajas', label: CATEGORY_CONFIG.BAKERY.label },
    CLEANING: { count: 0, unit: 'Galoneras', label: CATEGORY_CONFIG.CLEANING.label },
  };

  activeOrders.forEach((order) => {
    const cat = order.category;
    if (loadMap[cat]) {
      const itemsQty = order.items.reduce((sum, item) => sum + item.quantity, 0);
      loadMap[cat].count += itemsQty;
    }
  });

  return Object.entries(loadMap).map(([catKey, value]) => ({
    category: catKey as any,
    label: value.label,
    totalQuantity: value.count,
    unit: value.unit,
  }));
};
