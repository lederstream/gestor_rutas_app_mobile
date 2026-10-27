/**
 * ============================================================================
 * DOMAIN MODEL: Product.ts
 * Entidad Producto / Servicio para catálogo de ventas y armado rápido de pedidos
 * ============================================================================
 */

import { ProductCategory } from './Order';

export interface Product {
  id: string;
  name: string;              // Nombre del producto o servicio
  description?: string;      // Detalle, marca o características
  price: number;             // Precio unitario estándar
  unit: string;              // Unidad (e.g. "Bidón 20L", "Balón 10kg", "Caja", "Unidad", "Kg", etc.)
  category: ProductCategory; // Categoría logística
  code?: string;             // Código SKU o identificador corto
  createdAt: string;         // Fecha de creación ISO
}

/**
 * Catálogo inicial de productos para demostración y uso inmediato
 */
export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    name: 'Bidón de Agua Purificada 20L',
    description: 'Agua de mesa tratada con ozono y minerales',
    price: 16.0,
    unit: 'Bidón 20L',
    category: 'WATER',
    code: 'AGU-20L',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod-2',
    name: 'Bidón de Agua 7L Descartable',
    description: 'Envase no retornable ideal para departamentos',
    price: 9.5,
    unit: 'Bidón 7L',
    category: 'WATER',
    code: 'AGU-7L',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod-3',
    name: 'Balón de Gas GLP Doméstico 10kg',
    description: 'Válvula premium con precinto de seguridad',
    price: 52.0,
    unit: 'Balón 10kg',
    category: 'GAS',
    code: 'GAS-10K',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod-4',
    name: 'Balón de Gas Comercial 45kg',
    description: 'Uso industrial para restaurantes y panaderías',
    price: 210.0,
    unit: 'Balón 45kg',
    category: 'GAS',
    code: 'GAS-45K',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod-5',
    name: 'Harina Especial Panadera 50kg',
    description: 'Saco de harina fortificada con gluten medio',
    price: 145.0,
    unit: 'Saco 50kg',
    category: 'BAKERY',
    code: 'HAR-50K',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod-6',
    name: 'Galonera de Lejía Concentrada 4L',
    description: 'Desinfectante multiusos para negocios',
    price: 24.0,
    unit: 'Galonera 4L',
    category: 'CLEANING',
    code: 'LEJ-4L',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod-7',
    name: 'Detergente Industrial 15kg',
    description: 'Bolsa sellada de alto rendimiento',
    price: 68.0,
    unit: 'Bolsa 15kg',
    category: 'CLEANING',
    code: 'DET-15K',
    createdAt: new Date().toISOString(),
  },
];
