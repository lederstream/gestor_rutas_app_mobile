/**
 * ============================================================================
 * SERVICE: geocodingService.ts
 * Servicio centralizado y resiliente de geocodificación con caché y fallback
 * ============================================================================
 */

import { DISTRICT_COORDINATES } from '../utils/constants';

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  isExact: boolean;
  displayName?: string;
}

// Caché en memoria para evitar llamadas redundantes de red
const geocodeCache = new Map<string, GeocodeResult>();

/**
 * Busca coordenadas para una dirección y distrito
 * Implementa timeout de red, caché y fallback a coordenadas de distrito
 */
export async function geocodeAddress(
  address: string,
  district: string
): Promise<GeocodeResult | null> {
  const cleanAddress = address.trim();
  const cleanDistrict = district.trim();
  const cacheKey = `${cleanAddress}|${cleanDistrict}`.toLowerCase();

  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey)!;
  }

  // Si no hay dirección pero sí distrito, fallback inmediato
  if (!cleanAddress && cleanDistrict && DISTRICT_COORDINATES[cleanDistrict]) {
    const coords = DISTRICT_COORDINATES[cleanDistrict];
    const res: GeocodeResult = {
      latitude: coords.latitude,
      longitude: coords.longitude,
      isExact: false,
      displayName: `Centro de ${cleanDistrict}`,
    };
    geocodeCache.set(cacheKey, res);
    return res;
  }

  const query = `${cleanAddress}, ${cleanDistrict}, Lima, Perú`;
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
    query
  )}&limit=1`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s timeout

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'GestorRutasMobile/2.0 (logistics.app)',
      },
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        const result: GeocodeResult = {
          latitude: parseFloat(data[0].lat),
          longitude: parseFloat(data[0].lon),
          isExact: true,
          displayName: data[0].display_name,
        };
        geocodeCache.set(cacheKey, result);
        return result;
      }
    }
  } catch {
    // Timeout o fallo de red: proceder a fallback silencioso
  }

  // Fallback a coordenadas del distrito si existe en la lista
  if (cleanDistrict && DISTRICT_COORDINATES[cleanDistrict]) {
    const coords = DISTRICT_COORDINATES[cleanDistrict];
    const fallbackRes: GeocodeResult = {
      latitude: coords.latitude,
      longitude: coords.longitude,
      isExact: false,
      displayName: `Aproximado por distrito (${cleanDistrict})`,
    };
    geocodeCache.set(cacheKey, fallbackRes);
    return fallbackRes;
  }

  return null;
}
