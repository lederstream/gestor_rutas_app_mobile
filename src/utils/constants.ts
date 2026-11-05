import { ProductCategory, OrderStatus, OrderPriority, PaymentMethod } from '../models/Order';

export const COLORS = {
  // Brand Palette
  primary: '#2563EB',         // Royal Blue Logistics
  primaryDark: '#1D4ED8',
  primaryLight: '#DBEAFE',
  secondary: '#0F172A',       // Slate 900 (Corporate Dark)
  accent: '#06B6D4',          // Cyan Modern

  // Neutral Canvas & Surface
  background: '#F8FAFC',     // Light slate background
  surface: '#FFFFFF',        // Card background
  surfaceElevated: '#FFFFFF',
  border: '#E2E8F0',         // Subtle border
  borderFocus: '#94A3B8',

  // Typography
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  textInverse: '#FFFFFF',

  // Status Colors
  statusPending: '#F59E0B',     // Amber
  statusPendingBg: '#FEF3C7',
  statusInTransit: '#3B82F6',   // Blue
  statusInTransitBg: '#EFF6FF',
  statusDelivered: '#10B981',   // Emerald
  statusDeliveredBg: '#ECFDF5',
  statusCancelled: '#EF4444',   // Red
  statusCancelledBg: '#FEF2F2',

  // Priority Colors
  priorityUrgent: '#DC2626',    // Bright Red
  priorityUrgentBg: '#FEE2E2',
  priorityHigh: '#D97706',      // Warm Amber
  priorityHighBg: '#FEF3C7',
  priorityNormal: '#0284C7',    // Sky Blue
  priorityNormalBg: '#E0F2FE',

  // Categories
  categoryWater: '#0284C7',
  categoryWaterBg: '#E0F2FE',
  categoryGas: '#EA580C',
  categoryGasBg: '#FFEDD5',
  categoryBakery: '#D97706',
  categoryBakeryBg: '#FEF3C7',
  categoryCleaning: '#059669',
  categoryCleaningBg: '#D1FAE5',

  // Utilities
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
  cardShadow: '#0F172A',
};

export const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; color: string; bg: string; icon: string }
> = {
  PENDING: {
    label: 'Pendiente',
    color: COLORS.statusPending,
    bg: COLORS.statusPendingBg,
    icon: 'time-outline',
  },
  IN_TRANSIT: {
    label: 'En Ruta',
    color: COLORS.statusInTransit,
    bg: COLORS.statusInTransitBg,
    icon: 'bicycle-outline',
  },
  DELIVERED: {
    label: 'Entregado',
    color: COLORS.statusDelivered,
    bg: COLORS.statusDeliveredBg,
    icon: 'checkmark-circle-outline',
  },
  CANCELLED: {
    label: 'Cancelado',
    color: COLORS.statusCancelled,
    bg: COLORS.statusCancelledBg,
    icon: 'close-circle-outline',
  },
};

export const PRIORITY_CONFIG: Record<
  OrderPriority,
  { label: string; color: string; bg: string; icon: string }
> = {
  URGENT: {
    label: 'Urgente',
    color: COLORS.priorityUrgent,
    bg: COLORS.priorityUrgentBg,
    icon: 'flash-outline',
  },
  HIGH: {
    label: 'Alta',
    color: COLORS.priorityHigh,
    bg: COLORS.priorityHighBg,
    icon: 'alert-circle-outline',
  },
  NORMAL: {
    label: 'Normal',
    color: COLORS.priorityNormal,
    bg: COLORS.priorityNormalBg,
    icon: 'flag-outline',
  },
};

export const CATEGORY_CONFIG: Record<
  string,
  { label: string; unitDefault: string; defaultPrice: number; icon: string; color: string; bg: string }
> = {
  WATER: {
    label: 'Agua de Mesa (20L / 7L)',
    unitDefault: 'Bidón 20L',
    defaultPrice: 16.00,
    icon: 'water-outline',
    color: COLORS.categoryWater,
    bg: COLORS.categoryWaterBg,
  },
  GAS: {
    label: 'Gas GLP (10kg / 45kg)',
    unitDefault: 'Balón 10kg',
    defaultPrice: 52.00,
    icon: 'flame-outline',
    color: COLORS.categoryGas,
    bg: COLORS.categoryGasBg,
  },
  BAKERY: {
    label: 'Insumos de Panadería',
    unitDefault: 'Saco 50kg',
    defaultPrice: 145.00,
    icon: 'basket-outline',
    color: COLORS.categoryBakery,
    bg: COLORS.categoryBakeryBg,
  },
  CLEANING: {
    label: 'Productos de Limpieza',
    unitDefault: 'Galonera 4L',
    defaultPrice: 28.00,
    icon: 'sparkles-outline',
    color: COLORS.categoryCleaning,
    bg: COLORS.categoryCleaningBg,
  },
  FOOD: {
    label: 'Alimentos y Bebidas',
    unitDefault: 'Caja',
    defaultPrice: 45.00,
    icon: 'restaurant-outline',
    color: COLORS.categoryBakery,
    bg: COLORS.categoryBakeryBg,
  },
  PARCEL: {
    label: 'Paquetería y Encomienda',
    unitDefault: 'Paquete',
    defaultPrice: 25.00,
    icon: 'cube-outline',
    color: COLORS.info,
    bg: COLORS.statusInTransitBg,
  },
  SERVICES: {
    label: 'Servicios Logísticos',
    unitDefault: 'Servicio',
    defaultPrice: 50.00,
    icon: 'briefcase-outline',
    color: COLORS.primary,
    bg: COLORS.primaryLight,
  },
  GENERAL: {
    label: 'Carga General',
    unitDefault: 'Unidad',
    defaultPrice: 30.00,
    icon: 'cube-outline',
    color: COLORS.secondary,
    bg: '#F1F5F9',
  },
  OTHER: {
    label: 'Varios',
    unitDefault: 'Unidad',
    defaultPrice: 20.00,
    icon: 'ellipsis-horizontal-circle-outline',
    color: COLORS.textSecondary,
    bg: '#F1F5F9',
  },
};

export const getCategoryConfig = (category?: string) => {
  if (category && CATEGORY_CONFIG[category]) {
    return CATEGORY_CONFIG[category];
  }
  return {
    label: category || 'General',
    unitDefault: 'Unidad',
    defaultPrice: 25.0,
    icon: 'cube-outline',
    color: COLORS.primary,
    bg: COLORS.primaryLight,
  };
};

export const PAYMENT_METHOD_CONFIG: Record<
  PaymentMethod,
  { label: string; icon: string }
> = {
  CASH: {
    label: 'Efectivo',
    icon: 'cash-outline',
  },
  YAPE_PLIN: {
    label: 'Yape / Plin',
    icon: 'phone-portrait-outline',
  },
  CARD_POS: {
    label: 'Tarjeta / POS',
    icon: 'card-outline',
  },
  TRANSFER: {
    label: 'Transferencia BCP/BBVA',
    icon: 'business-outline',
  },
};

export const AVAILABLE_DISTRICTS = [
  'Tacna (Cercado)',
  'Coronel Gregorio Albarracín',
  'Pocollay',
  'Alto de la Alianza',
  'Ciudad Nueva',
  'Calana',
  'Pachía',
  'La Yarada - Los Palos',
];

export const DEFAULT_DRIVERS = [
  'Carlos Mendoza (Camión 02 - Tacna)',
  'Jorge Luis Huamán (Furgón 05)',
  'Miguel Flores (Moto 01)',
  'Roberto Quispe (Camión 01)',
];

export const DISTRICT_COORDINATES: Record<string, { latitude: number; longitude: number }> = {
  // Distritos Oficiales con Cobertura de Despacho - Provincia de Tacna
  'Tacna (Cercado)': { latitude: -18.0139, longitude: -70.2519 },
  'Tacna': { latitude: -18.0139, longitude: -70.2519 },
  'Coronel Gregorio Albarracín': { latitude: -18.0450, longitude: -70.2600 },
  'Gregorio Albarracín': { latitude: -18.0450, longitude: -70.2600 },
  'Pocollay': { latitude: -18.0050, longitude: -70.2300 },
  'Alto de la Alianza': { latitude: -17.9980, longitude: -70.2520 },
  'Ciudad Nueva': { latitude: -17.9920, longitude: -70.2450 },
  'Calana': { latitude: -17.9700, longitude: -70.1900 },
  'Pachía': { latitude: -17.8900, longitude: -70.1500 },
  'La Yarada - Los Palos': { latitude: -18.1500, longitude: -70.3800 },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export const TOUCH_TARGET = {
  min: 48,
  buttonHeight: 52,
  compactHeight: 40,
};

