/**
 * ============================================================================
 * DATOS INICIALES Y DEMO: Gestor de Rutas Móvil
 * Permite inicializar sin datos o cargar paradas con pines GPS de muestra
 * ============================================================================
 */

import { Order } from '../models/Order';

export const INITIAL_ORDERS: Order[] = [];

export const DEMO_ORDERS: Order[] = [
  {
    id: 'demo-ord-1',
    orderCode: 'PED-101',
    customerName: 'Café & Bistro La Mar',
    customerPhone: '987654321',
    deliveryAddress: 'Av. Mariscal La Mar 770',
    district: 'Miraflores',
    addressReference: 'Frente al parque Manuel Villavicencio',
    category: 'FOOD',
    items: [
      {
        id: 'item-demo-1',
        name: 'Insumos de Café & Repostería',
        quantity: 3,
        unitPrice: 45.0,
        unit: 'caja',
      },
    ],
    totalAmount: 135.0,
    paymentMethod: 'YAPE_PLIN',
    paymentStatus: 'PENDING',
    priority: 'URGENT',
    status: 'IN_TRANSIT',
    scheduledTime: '10:30 AM',
    notes: 'Entregar por puerta posterior de cocina',
    latitude: -12.1185,
    longitude: -77.0385,
    createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
  },
  {
    id: 'demo-ord-2',
    orderCode: 'PED-102',
    customerName: 'Dra. Patricia Valdivia',
    customerPhone: '912345678',
    deliveryAddress: 'Av. Angamos Oeste 401',
    district: 'Miraflores',
    addressReference: 'Torre Médica Delgado, Consultorio 502',
    category: 'PARCEL',
    items: [
      {
        id: 'item-demo-2',
        name: 'Paquete de Documentos Notariales',
        quantity: 1,
        unitPrice: 35.0,
        unit: 'sobre',
      },
    ],
    totalAmount: 35.0,
    paymentMethod: 'CASH',
    paymentStatus: 'PENDING',
    priority: 'HIGH',
    status: 'PENDING',
    scheduledTime: '11:15 AM',
    notes: 'Preguntar en recepción de piso 5',
    latitude: -12.1118,
    longitude: -77.0342,
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: 'demo-ord-3',
    orderCode: 'PED-103',
    customerName: 'Centro Empresarial Real',
    customerPhone: '923456789',
    deliveryAddress: 'Av. Víctor Andrés Belaúnde 147',
    district: 'San Isidro',
    addressReference: 'Torre Real 3, Recepción General',
    category: 'SERVICES',
    items: [
      {
        id: 'item-demo-3',
        name: 'Equipos y Repuestos de Oficina',
        quantity: 2,
        unitPrice: 120.0,
        unit: 'pack',
      },
    ],
    totalAmount: 240.0,
    paymentMethod: 'TRANSFER',
    paymentStatus: 'PENDING',
    priority: 'NORMAL',
    status: 'PENDING',
    scheduledTime: '12:00 PM',
    notes: 'Dejar constancia firmada en seguridad',
    latitude: -12.0965,
    longitude: -77.037,
    createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
  {
    id: 'demo-ord-4',
    orderCode: 'PED-104',
    customerName: 'Boutique Casa Surco',
    customerPhone: '934567890',
    deliveryAddress: 'Av. Javier Prado Este 4200',
    district: 'Santiago de Surco',
    addressReference: 'C.C. Jockey Plaza, Local 142',
    category: 'GENERAL',
    items: [
      {
        id: 'item-demo-4',
        name: 'Prendas y Calzado Exclusivo',
        quantity: 4,
        unitPrice: 75.0,
        unit: 'unidad',
      },
    ],
    totalAmount: 300.0,
    paymentMethod: 'CARD_POS',
    paymentStatus: 'PENDING',
    priority: 'NORMAL',
    status: 'PENDING',
    scheduledTime: '01:30 PM',
    notes: 'Llevar POS para cobro con tarjeta',
    latitude: -12.0865,
    longitude: -76.974,
    createdAt: new Date().toISOString(),
  },
];
