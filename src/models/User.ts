import { ProductCategory } from './Order';

export type UserRole = 'ADMIN' | 'DISTRIBUTOR' | 'CLIENT';

export interface User {
  id: string;
  username: string;
  name: string;
  phone: string;
  role: UserRole;
  email?: string;
  avatar?: string;
  // Atributos del Distribuidor Independiente
  vehicleInfo?: string;
  driverCode?: string; // Código único de Distribuidor 
  specialtyCategory?: ProductCategory; // Rubro especializado
  specialtyLabel?: string; // "Distribuidor de Agua Purificada"
  // Atributos de Cliente Final
  customerId?: string;
  deliveryAddress?: string;
  district?: string;
  addressReference?: string;
  latitude?: number;
  longitude?: number;
}

/**
 * Cuenta registrada en el sistema de autenticación (Credenciales + Perfil)*/
export interface UserAccount extends User {
  password: string;
}

export const REGISTERED_ACCOUNTS: UserAccount[] = [
  {
    id: 'user-dist-1',
    username: 'distribuidor',
    email: 'carlos@distribucion.com',
    password: '123123',
    name: 'Carlos Mendoza',
    phone: '987111222',
    role: 'DISTRIBUTOR',
    vehicleInfo: 'Camión 02 (Placa BZ-492)',
    driverCode: 'DIST-01',
    specialtyCategory: 'WATER',
    specialtyLabel: 'Distribuidor de Agua Purificada',
  },
  {
    id: 'user-dist-2',
    username: 'dist_gas',
    email: 'manuel@gasdistribucion.com',
    password: '123123',
    name: 'Manuel Choque',
    phone: '952334455',
    role: 'DISTRIBUTOR',
    vehicleInfo: 'Camión 05 (Placa Z1B-890)',
    driverCode: 'DIST-02',
    specialtyCategory: 'GAS',
    specialtyLabel: 'Distribuidor de Gas GLP',
  },
  {
    id: 'user-dist-3',
    username: 'dist_pan',
    email: 'rosa@panaderiadist.com',
    password: '123123',
    name: 'Rosa Quispe',
    phone: '952889900',
    role: 'DISTRIBUTOR',
    vehicleInfo: 'Furgón 01 (Placa V3A-120)',
    driverCode: 'DIST-03',
    specialtyCategory: 'BAKERY',
    specialtyLabel: 'Distribuidora de Panadería',
  },
  {
    id: 'user-dist-4',
    username: 'dist_limpieza',
    email: 'roberto@limpiezadist.com',
    password: '123123',
    name: 'Roberto Flores',
    phone: '952778899',
    role: 'DISTRIBUTOR',
    vehicleInfo: 'Camioneta 03 (Placa T2X-450)',
    driverCode: 'DIST-04',
    specialtyCategory: 'CLEANING',
    specialtyLabel: 'Distribuidor de Productos de Limpieza',
  },
  {
    id: 'user-cust-1',
    username: 'cliente',
    email: 'donpepe@bodega.com',
    password: '123123',
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
    password: '123123',
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
    password: '123123',
    name: 'Administrador General',
    phone: '900000000',
    role: 'ADMIN',
  },
];
