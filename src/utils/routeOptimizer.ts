/**
 * ============================================================================
 * UTILITY: routeOptimizer.ts
 * Algoritmo de optimización de paradas y cálculo de distancias geodésicas (Haversine)
 * ============================================================================
 */

import { Order } from '../models/Order';

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

/**
 * Calcula la distancia en kilómetros entre dos coordenadas usando la fórmula de Haversine
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radio medio de la Tierra en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Optimiza el orden de paradas utilizando el algoritmo del vecino más cercano (Nearest Neighbor TSP)
 * Reduce el tiempo de viaje y kilometraje del repartidor.
 */
export function optimizeRouteOrder(
  orders: Order[],
  startPoint?: GeoPoint
): {
  optimizedOrders: (Order & { stopNumber: number; distanceToNextKm?: number })[];
  totalDistanceKm: number;
} {
  // Solo consideramos órdenes que tengan coordenadas válidas
  const validOrders = orders.filter(
    (o) => typeof o.latitude === 'number' && typeof o.longitude === 'number'
  );

  const unassigned = [...validOrders];
  const sorted: (Order & { stopNumber: number; distanceToNextKm?: number })[] = [];

  if (unassigned.length === 0) {
    return {
      optimizedOrders: orders.map((o, idx) => ({ ...o, stopNumber: idx + 1 })),
      totalDistanceKm: 0,
    };
  }

  // Punto de partida inicial: ubicación actual del conductor o primer punto
  let currentLat = startPoint?.latitude ?? unassigned[0].latitude!;
  let currentLng = startPoint?.longitude ?? unassigned[0].longitude!;
  let totalDistanceKm = 0;

  while (unassigned.length > 0) {
    let nearestIndex = 0;
    let minDistance = Infinity;

    for (let i = 0; i < unassigned.length; i++) {
      const dist = calculateDistanceKm(
        currentLat,
        currentLng,
        unassigned[i].latitude!,
        unassigned[i].longitude!
      );

      // Priorizar órdenes urgentes con un peso preferente
      const priorityWeight =
        unassigned[i].priority === 'URGENT'
          ? 0.5
          : unassigned[i].priority === 'HIGH'
          ? 0.8
          : 1.0;
      const weightedDist = dist * priorityWeight;

      if (weightedDist < minDistance) {
        minDistance = weightedDist;
        nearestIndex = i;
      }
    }

    const nextOrder = unassigned.splice(nearestIndex, 1)[0];
    const actualDist = calculateDistanceKm(
      currentLat,
      currentLng,
      nextOrder.latitude!,
      nextOrder.longitude!
    );

    totalDistanceKm += actualDist;
    currentLat = nextOrder.latitude!;
    currentLng = nextOrder.longitude!;

    sorted.push({
      ...nextOrder,
      stopNumber: sorted.length + 1,
      distanceToNextKm: Number(actualDist.toFixed(1)),
    });
  }

  // Agregar al final las órdenes que no tenían coordenadas fijadas
  const withoutCoords = orders
    .filter((o) => typeof o.latitude !== 'number' || typeof o.longitude !== 'number')
    .map((o) => ({ ...o, stopNumber: sorted.length + 1 }));

  return {
    optimizedOrders: [...sorted, ...withoutCoords],
    totalDistanceKm: Number(totalDistanceKm.toFixed(1)),
  };
}
