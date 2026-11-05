export type CustomerType = 'B2B' | 'B2C';

export interface Customer {
  id: string;
  name: string;              // Nombre completo o Razón Social
  phone: string;             // Teléfono de contacto / WhatsApp
  deliveryAddress: string;   // Dirección principal de entrega
  district: string;          // Ciudad, Distrito o Zona
  customerType?: CustomerType; // B2B: Negocio / B2C: Hogar o Persona
  addressReference?: string; // Referencia (esquina, color de fachada, interior, etc.)
  notes?: string;            // Notas o instrucciones permanentes para el repartidor
  latitude?: number;         // Coordenada Latitud GPS guardada
  longitude?: number;        // Coordenada Longitud GPS guardada
  email?: string;            // Correo electrónico opcional
  createdAt: string;         // Fecha de registro ISO
}

/**
 * Determina si un cliente corresponde al segmento B2B (Negocio/Comercio)
 * o B2C (Hogar / Persona natural).
 */
export const isB2BCustomer = (customer: { name?: string; customerType?: CustomerType }): boolean => {
  if (customer.customerType) {
    return customer.customerType === 'B2B';
  }
  const n = (customer.name || '').toLowerCase();
  return (
    n.includes('bodega') ||
    n.includes('restaurante') ||
    n.includes('panader') ||
    n.includes('minimarket') ||
    n.includes('comercial') ||
    n.includes('tienda') ||
    n.includes('empresa') ||
    n.includes('s.a.c') ||
    n.includes('eirl') ||
    n.includes('lavander')
  );
};

/**
 * Clientes iniciales para demostración con diferenciación B2B y B2C
 */
export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'cust-1',
    name: 'Bodega Don Pepe',
    phone: '987654321',
    deliveryAddress: 'Av. Bolognesi 840',
    district: 'Tacna (Cercado)',
    customerType: 'B2B',
    addressReference: 'Frente al Mercado Central, reja negra',
    notes: 'Recibir pedidos preferentemente por la mañana',
    latitude: -18.0125,
    longitude: -70.2480,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cust-2',
    name: 'Restaurante El Buen Sabor Tacneño',
    phone: '991234567',
    deliveryAddress: 'Av. San Martín 450',
    district: 'Tacna (Cercado)',
    customerType: 'B2B',
    addressReference: 'Cerca al Paseo Cívico, puerta lateral de descarga',
    notes: 'Factura con RUC, solicitar firma de recepción al chef',
    latitude: -18.0145,
    longitude: -70.2530,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cust-3',
    name: 'Panadería La Espiga Dorada',
    phone: '978112233',
    deliveryAddress: 'Av. Municipal 120',
    district: 'Coronel Gregorio Albarracín',
    customerType: 'B2B',
    addressReference: 'Frente a la Plaza Pérez Gamboa',
    notes: 'Descarga en garaje principal',
    latitude: -18.0450,
    longitude: -70.2600,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cust-4',
    name: 'Lavandería Burbujas del Sur',
    phone: '984556677',
    deliveryAddress: 'Av. Celestino Vargas 520',
    district: 'Pocollay',
    customerType: 'B2B',
    addressReference: 'Al costado de la Iglesia de Pocollay',
    notes: 'Pago siempre con Yape',
    latitude: -18.0050,
    longitude: -70.2300,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cust-5',
    name: 'Familia Mendoza (Hogar)',
    phone: '992334455',
    deliveryAddress: 'Calle Arias y Aragüez 312',
    district: 'Tacna (Cercado)',
    customerType: 'B2C',
    addressReference: 'Casa de 2 pisos, timbre blanco',
    notes: 'Dejar bidón de agua en puerta de domicilio',
    latitude: -18.0110,
    longitude: -70.2505,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cust-6',
    name: 'Lucía Fernández (Residencial)',
    phone: '981223344',
    deliveryAddress: 'Av. Los Molles Mz. B Lt. 14',
    district: 'Coronel Gregorio Albarracín',
    customerType: 'B2C',
    addressReference: 'Urbanización Santa Rosa',
    notes: 'Llamar antes de entregar',
    latitude: -18.0480,
    longitude: -70.2630,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cust-7',
    name: 'Minimarket Los Laureles',
    phone: '952667788',
    deliveryAddress: 'Av. Leguía 980',
    district: 'Tacna (Cercado)',
    customerType: 'B2B',
    addressReference: 'Cerca a la rotonda Leguía',
    notes: 'Cliente con 3 envases de cambio listos',
    latitude: -18.0185,
    longitude: -70.2560,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cust-8',
    name: 'Chifa Dragón Dorado',
    phone: '952112299',
    deliveryAddress: 'Av. Pinto 630',
    district: 'Alto de la Alianza',
    customerType: 'B2B',
    addressReference: 'A 2 cuadras de la feria Pinto',
    notes: 'Entregar urgente para el servicio de almuerzo',
    latitude: -17.9980,
    longitude: -70.2520,
    createdAt: new Date().toISOString(),
  },
];
