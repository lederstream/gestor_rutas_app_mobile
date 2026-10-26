/**
 * ============================================================================
 * DESIGN SYSTEM & CONSTANTS: Gestor de Rutas Móvil
 * Tokens de diseño, paleta, configuración de categorías y distritos
 * ============================================================================
 */

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
  ProductCategory,
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
  'San Borja',
  'Santiago de Surco',
  'Miraflores',
  'San Isidro',
  'La Molina',
  'Ate Vitarte',
  'Lince',
  'Magdalena del Mar',
  'Jesús María',
  'Los Olivos',
];

export const DEFAULT_DRIVERS = [
  'Carlos Mendoza (Camión 02)',
  'Jorge Luis Huamán (Furgón 05)',
  'Miguel Flores (Moto 01)',
  'Roberto Quispe (Camión 01)',
];

export const DISTRICT_COORDINATES: Record<string, { latitude: number; longitude: number }> = {
  'San Borja': { latitude: -12.0984, longitude: -77.0016 },
  'Santiago de Surco': { latitude: -12.1355, longitude: -76.9961 },
  'Miraflores': { latitude: -12.1192, longitude: -77.0298 },
  'San Isidro': { latitude: -12.0969, longitude: -77.0347 },
  'La Molina': { latitude: -12.0797, longitude: -76.9458 },
  'Ate Vitarte': { latitude: -12.0450, longitude: -76.9200 },
  'Lince': { latitude: -12.0838, longitude: -77.0346 },
  'Magdalena del Mar': { latitude: -12.0924, longitude: -77.0706 },
  'Jesús María': { latitude: -12.0747, longitude: -77.0483 },
  'Los Olivos': { latitude: -11.9793, longitude: -77.0711 },
};
