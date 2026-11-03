/**
 * ============================================================================
 * DOMAIN MODEL: User.ts
 * Entidad Usuario y Sistema de Roles (Distribuidor / Conductor vs Cliente Final)
 * ============================================================================
 */

export type UserRole = 'ADMIN' | 'DISTRIBUTOR' | 'CLIENT';

export interface User {
  id: string;
  username: string;
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
 * Cuenta registrada en el sistema de autenticación (Credenciales + Perfil)
 * En una infraestructura real con backend, el password se valida hasheado en el servidor
 */
export interface UserAccount extends User {
  password: string;
}

/**
 * Cuentas iniciales registradas en el sistema para RBAC
 */
export const REGISTERED_ACCOUNTS: UserAccount[] = [
  {
    id: 'user-dist-1',
    username: 'distribuidor',
    email: 'carlos@distribucion.com',
    password: '123',
    name: 'Carlos Mendoza',
    phone: '987111222',
    role: 'DISTRIBUTOR',
    vehicleInfo: 'Camión 02 (Placa BZ-492)',
    driverCode: 'CHO-02',
  },
  {
    id: 'user-cust-1',
    username: 'cliente',
    email: 'donpepe@bodega.com',
    password: '123',
    name: 'Bodega Don Pepe',
    phone: '987654321',
    role: 'CLIENT',
    customerId: 'cust-1',
    deliveryAddress: 'Av. Bolognesi 845',
    district: 'Tacna (Cercado)',
    addressReference: 'Frente al Mercado Central, reja negra',
    latitude: -18.0125,
    longitude: -70.2498,
  },
  {
    id: 'user-cust-2',
    username: 'restaurante',
    email: 'buensabor@restaurante.com',
    password: '123',
    name: 'Restaurante El Buen Sabor',
    phone: '991234567',
    role: 'CLIENT',
    customerId: 'cust-2',
    deliveryAddress: 'Av. San Martín 420',
    district: 'Tacna (Cercado)',
    addressReference: 'A media cuadra de la Plaza de Armas',
    latitude: -18.0142,
    longitude: -70.2525,
  },
  {
    id: 'user-admin-1',
    username: 'admin',
    email: 'admin@gestor.com',
    password: 'admin',
    name: 'Administrador General',
    phone: '900000000',
    role: 'ADMIN',
  },
];
