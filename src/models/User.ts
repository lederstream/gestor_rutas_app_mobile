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
    deliveryAddress: 'Av. Javier Prado Este 2450',
    district: 'San Borja',
    addressReference: 'Frente al parque, reja negra',
    latitude: -12.0984,
    longitude: -77.0016,
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
    deliveryAddress: 'Av. Benavides 1820',
    district: 'Miraflores',
    addressReference: 'Puerta lateral de descarga',
    latitude: -12.1192,
    longitude: -77.0298,
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
