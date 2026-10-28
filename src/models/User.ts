/**
 * ============================================================================
 * DOMAIN MODEL: User.ts
 * Entidad Usuario y Sistema de Roles (Distribuidor / Conductor vs Cliente Final)
 * ============================================================================
 */

export type UserRole = 'DISTRIBUTOR' | 'CLIENT';

export interface User {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  email?: string;
  avatar?: string;
  // Atributos de Distribuidor / Conductor
  vehicleInfo?: string;
  driverCode?: string;
  // Atributos de Cliente Final
  customerId?: string;
  deliveryAddress?: string;
  district?: string;
  addressReference?: string;
  latitude?: number;
  longitude?: number;
}

/**
 * Perfiles preconfigurados para demostraciones y pruebas rápidas en 1 toque
 */
export const DEMO_PROFILES: User[] = [
  {
    id: 'user-dist-1',
    name: 'Carlos Mendoza',
    phone: '987111222',
    role: 'DISTRIBUTOR',
    vehicleInfo: 'Camión 02 (Placa BZ-492)',
    driverCode: 'CHO-02',
  },
  {
    id: 'user-cust-1',
    name: 'Bodega Don Pepe',
    phone: '987654321',
    role: 'CLIENT',
    customerId: 'cust-1',
    deliveryAddress: 'Av. Javier Prado Este 2450',
    district: 'San Borja',
    addressReference: 'Frente al parque, reja negra',
    latitude: -12.0984,
    longitude: -77.0016,
  },
  {
    id: 'user-cust-2',
    name: 'Restaurante El Buen Sabor',
    phone: '991234567',
    role: 'CLIENT',
    customerId: 'cust-2',
    deliveryAddress: 'Av. Benavides 1820',
    district: 'Miraflores',
    addressReference: 'Puerta lateral de descarga',
    latitude: -12.1192,
    longitude: -77.0298,
  },
];
