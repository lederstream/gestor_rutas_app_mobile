/**
 * ============================================================================
 * CONTEXT: AuthContext.tsx
 * Gestión global de Autenticación, Sesión y Control de Roles (RBAC)
 * ============================================================================
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, UserRole, DEMO_PROFILES } from '../models/User';
import { hapticImpact, hapticNotification } from '../utils/haptics';

const AUTH_STORAGE_KEY = '@gestor_rutas_auth_user_v1';

export interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithDemoProfile: (profileId: string) => void;
  login: (data: {
    name: string;
    phone: string;
    role: UserRole;
    deliveryAddress?: string;
    district?: string;
  }) => void;
  logout: () => void;
  switchRole: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Cargar usuario guardado en AsyncStorage al iniciar
  useEffect(() => {
    const loadSavedUser = async () => {
      try {
        const stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
        if (stored) {
          const parsed: User = JSON.parse(stored);
          setUser(parsed);
        } else {
          // Iniciar por defecto con el perfil de Distribuidor Carlos Mendoza para agilidad
          setUser(DEMO_PROFILES[0]);
        }
      } catch (err) {
        console.warn('Error loading auth user', err);
        setUser(DEMO_PROFILES[0]);
      } finally {
        setIsLoading(false);
      }
    };

    loadSavedUser();
  }, []);

  // Iniciar sesión con perfil demo en 1 toque
  const loginWithDemoProfile = useCallback((profileId: string) => {
    const profile = DEMO_PROFILES.find((p) => p.id === profileId);
    if (profile) {
      hapticNotification('success');
      setUser(profile);
      AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(profile)).catch(() => {});
    }
  }, []);

  // Iniciar sesión manual con formulario
  const login = useCallback(
    (data: {
      name: string;
      phone: string;
      role: UserRole;
      deliveryAddress?: string;
      district?: string;
    }) => {
      hapticNotification('success');
      const newUser: User = {
        id: `user-${Date.now()}`,
        name: data.name.trim(),
        phone: data.phone.trim(),
        role: data.role,
        deliveryAddress: data.deliveryAddress?.trim(),
        district: data.district?.trim(),
        vehicleInfo: data.role === 'DISTRIBUTOR' ? 'Unidad Asignada' : undefined,
      };
      setUser(newUser);
      AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newUser)).catch(() => {});
    },
    []
  );

  // Cerrar sesión
  const logout = useCallback(() => {
    hapticImpact('medium');
    setUser(null);
    AsyncStorage.removeItem(AUTH_STORAGE_KEY).catch(() => {});
  }, []);

  // Alternar rápidamente entre rol Distribuidor y rol Cliente para pruebas
  const switchRole = useCallback(() => {
    hapticImpact('medium');
    if (!user || user.role === 'DISTRIBUTOR') {
      const clientProfile = DEMO_PROFILES[1]; // Bodega Don Pepe
      setUser(clientProfile);
      AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(clientProfile)).catch(() => {});
    } else {
      const distProfile = DEMO_PROFILES[0]; // Carlos Mendoza
      setUser(distProfile);
      AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(distProfile)).catch(() => {});
    }
  }, [user]);

  const value = useMemo(
    () => ({
      user,
      role: user?.role || null,
      isAuthenticated: Boolean(user),
      isLoading,
      loginWithDemoProfile,
      login,
      logout,
      switchRole,
    }),
    [user, isLoading, loginWithDemoProfile, login, logout, switchRole]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
