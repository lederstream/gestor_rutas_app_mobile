/**
 * ============================================================================
 * DOMAIN MODELS: Gestor de Rutas Móvil
 * Sistema de Logística y Distribución Inmediata
 * ============================================================================
 */

export type OrderStatus = 'PENDING' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';

export type OrderPriority = 'URGENT' | 'HIGH' | 'NORMAL';

export type ProductCategory = 'WATER' | 'GAS' | 'BAKERY' | 'CLEANING';

export type PaymentMethod = 'CASH' | 'YAPE_PLIN' | 'CARD_POS' | 'TRANSFER';

export type PaymentStatus = 'PAID' | 'PENDING';

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  unit: string; // 'bidón 20L', 'balón 10kg', 'saco 50kg', 'galonera 4L', etc.
}

export interface Order {
  id: string;
  orderCode: string; // e.g. "GR-1001"
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  district: string;
  addressReference?: string;
  category: ProductCategory;
  items: OrderItem[];
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  priority: OrderPriority;
  status: OrderStatus;
  scheduledTime?: string;
  notes?: string;
  driverAssigned?: string;
  createdAt: string; // ISO 8601 string
  deliveredAt?: string;
}

export interface OrderFilter {
  status: OrderStatus | 'ALL';
  category: ProductCategory | 'ALL';
  priority: OrderPriority | 'ALL';
  district: string | 'ALL';
  searchQuery: string;
}

export interface OrderStatistics {
  totalOrders: number;
  pendingOrders: number;
  inTransitOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  totalRevenue: number;       // Dinero total recaudado (entregados o pagados)
  pendingCollection: number;  // Dinero pendiente de cobro en ruta
  completedDeliveriesRate: number; // Porcentaje de efectividad
}

export interface RouteLoadItem {
  category: ProductCategory;
  label: string;
  totalQuantity: number;
  unit: string;
}
