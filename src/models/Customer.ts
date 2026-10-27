/**
 * ============================================================================
 * DOMAIN MODEL: Customer.ts
 * Entidad Cliente para gestión de libreta de direcciones y pedidos recurrentes
 * ============================================================================
 */

export interface Customer {
  id: string;
  name: string;              // Nombre completo o Razón Social
  phone: string;             // Teléfono de contacto / WhatsApp
  deliveryAddress: string;   // Dirección principal de entrega
  district: string;          // Ciudad, Distrito o Zona
  addressReference?: string; // Referencia (esquina, color de fachada, interior, etc.)
  notes?: string;            // Notas o instrucciones permanentes para el repartidor
  latitude?: number;         // Coordenada Latitud GPS guardada
  longitude?: number;        // Coordenada Longitud GPS guardada
  email?: string;            // Correo electrónico opcional
  createdAt: string;         // Fecha de registro ISO
}

/**
 * Clientes iniciales para demostración y puesta en marcha rápida
 */
export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'cust-1',
    name: 'Bodega Don Pepe',
    phone: '987654321',
    deliveryAddress: 'Av. Javier Prado Este 2450',
    district: 'San Borja',
    addressReference: 'Frente al parque, reja negra',
    notes: 'Recibir pedidos preferentemente por la mañana',
    latitude: -12.0984,
    longitude: -77.0016,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cust-2',
    name: 'Restaurante El Buen Sabor',
    phone: '991234567',
    deliveryAddress: 'Av. Benavides 1820',
    district: 'Miraflores',
    addressReference: 'Puerta lateral de descarga',
    notes: 'Factura con RUC, solicitar firma de recepción al chef',
    latitude: -12.1192,
    longitude: -77.0298,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cust-3',
    name: 'Panadería La Espiga Dorada',
    phone: '978112233',
    deliveryAddress: 'Av. Primavera 650',
    district: 'Santiago de Surco',
    addressReference: 'Al costado de la farmacia',
    notes: 'Descarga en garaje principal',
    latitude: -12.1355,
    longitude: -76.9961,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cust-4',
    name: 'Lavandería Burbujas',
    phone: '984556677',
    deliveryAddress: 'Av. Las Begonias 440',
    district: 'San Isidro',
    addressReference: 'Piso 1, local comercial',
    notes: 'Pago siempre con Yape',
    latitude: -12.0969,
    longitude: -77.0347,
    createdAt: new Date().toISOString(),
  },
];
