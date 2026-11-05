import AsyncStorage from '@react-native-async-storage/async-storage';
import { AVAILABLE_DISTRICTS } from '../utils/constants';

const DISTRICTS_STORAGE_KEY = '@gestor_rutas_districts_v2';

export const getSavedDistricts = async (): Promise<string[]> => {
  try {
    const raw = await AsyncStorage.getItem(DISTRICTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading districts from storage', e);
  }
  return [...AVAILABLE_DISTRICTS];
};

export const saveDistricts = async (districts: string[]): Promise<boolean> => {
  try {
    await AsyncStorage.setItem(DISTRICTS_STORAGE_KEY, JSON.stringify(districts));
    return true;
  } catch (e) {
    console.warn('Error saving districts to storage', e);
    return false;
  }
};

export const resetDefaultDistricts = async (): Promise<string[]> => {
  await saveDistricts([...AVAILABLE_DISTRICTS]);
  return [...AVAILABLE_DISTRICTS];
};

export const addDistrict = async (
  name: string
): Promise<{ success: boolean; error?: string; districts: string[] }> => {
  const trimmed = name.trim();
  if (!trimmed) {
    return {
      success: false,
      error: 'Ingresa el nombre del distrito o zona de Tacna.',
      districts: await getSavedDistricts(),
    };
  }
  const current = await getSavedDistricts();
  if (current.some((d) => d.toLowerCase() === trimmed.toLowerCase())) {
    return {
      success: false,
      error: 'Este distrito ya existe en la lista de cobertura.',
      districts: current,
    };
  }
  const updated = [...current, trimmed];
  await saveDistricts(updated);
  return { success: true, districts: updated };
};

export const updateDistrict = async (
  oldName: string,
  newName: string
): Promise<{ success: boolean; error?: string; districts: string[] }> => {
  const trimmed = newName.trim();
  if (!trimmed) {
    return {
      success: false,
      error: 'El nombre del distrito no puede quedar vacío.',
      districts: await getSavedDistricts(),
    };
  }
  const current = await getSavedDistricts();
  const duplicate = current.some(
    (d) =>
      d.toLowerCase() === trimmed.toLowerCase() &&
      d.toLowerCase() !== oldName.toLowerCase()
  );
  if (duplicate) {
    return {
      success: false,
      error: 'Ya existe otro distrito con ese mismo nombre.',
      districts: current,
    };
  }
  const updated = current.map((d) => (d === oldName ? trimmed : d));
  await saveDistricts(updated);
  return { success: true, districts: updated };
};

export const deleteDistrict = async (
  name: string
): Promise<{ success: boolean; error?: string; districts: string[] }> => {
  const current = await getSavedDistricts();
  if (current.length <= 1) {
    return {
      success: false,
      error: 'Debe mantenerse al menos un distrito activo con cobertura.',
      districts: current,
    };
  }
  const updated = current.filter((d) => d !== name);
  await saveDistricts(updated);
  return { success: true, districts: updated };
};

