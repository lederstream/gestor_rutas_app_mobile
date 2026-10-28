/**
 * ============================================================================
 * CONTEXT: AuthContext.tsx
 * Gestión global de Autenticación Segura y Control de Roles (RBAC)
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
import { User, UserRole, UserAccount, REGISTERED_ACCOUNTS } from '../models/User';
import { hapticImpact, hapticNotification } from '../utils/haptics';

const AUTH_STORAGE_KEY = '@gestor_rutas_auth_user_v2';
const ACCOUNTS_STORAGE_KEY = '@gestor_rutas_accounts_v2';

export interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  accounts: UserAccount[];
  login: (identifier: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  registerUser: (newAccount: UserAccount) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [accounts, setAccounts] = useState<UserAccount[]>(REGISTERED_ACCOUNTS);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Cargar sesión de usuario y registro de cuentas al iniciar la app
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Cargar cuentas registradas
        const storedAccounts = await AsyncStorage.getItem(ACCOUNTS_STORAGE_KEY);
        let currentAccounts = REGISTERED_ACCOUNTS;
        if (storedAccounts) {
          try {
            currentAccounts = JSON.parse(storedAccounts);
            setAccounts(currentAccounts);
          } catch {
            setAccounts(REGISTERED_ACCOUNTS);
          }
        } else {
          await AsyncStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(REGISTERED_ACCOUNTS));
        }

        // Cargar sesión activa si existe
        const storedUser = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
        if (storedUser) {
          const parsedUser: User = JSON.parse(storedUser);
          setUser(parsedUser);
        } else {
          // Si no hay sesión guardada, se mantiene en null para exigir Login
          setUser(null);
        }
      } catch (err) {
        console.warn('Error al inicializar sesión de autenticación:', err);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // 2. Autenticación estándar con Usuario/Email y Contraseña
  const login = useCallback(
    async (
      identifier: string,
      password: string
    ): Promise<{ success: boolean; error?: string }> => {
      const cleanId = identifier.trim().toLowerCase();
      const cleanPass = password.trim();

      if (!cleanId || !cleanPass) {
        hapticNotification('error');
        return {
          success: false,
          error: 'Por favor ingresa tu usuario o correo y tu contraseña.',
        };
      }

      // Buscar cuenta por username o por email
      const matchedAccount = accounts.find(
        (acc) =>
          acc.username.toLowerCase() === cleanId ||
          (acc.email && acc.email.toLowerCase() === cleanId)
      );

      if (!matchedAccount) {
        hapticNotification('error');
        return {
          success: false,
          error: 'Usuario o correo no registrado en el sistema.',
        };
      }

      // Validar contraseña
      if (matchedAccount.password !== cleanPass) {
        hapticNotification('error');
        return {
          success: false,
          error: 'Contraseña incorrecta. Por favor intenta de nuevo.',
        };
      }

      // Autenticación exitosa: extraer perfil de usuario omitiendo el password por seguridad
      const { password: _, ...userProfile } = matchedAccount;

      setUser(userProfile);
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userProfile));
      hapticNotification('success');

      return { success: true };
    },
    [accounts]
  );

  // 3. Cerrar sesión de forma segura
  const logout = useCallback(async () => {
    hapticImpact('medium');
    setUser(null);
    try {
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (err) {
      console.warn('Error al remover sesión:', err);
    }
  }, []);

  // 4. Registro de nuevo usuario (para cuando el Administrador cree clientes o distribuidores)
  const registerUser = useCallback(
    async (newAccount: UserAccount): Promise<boolean> => {
      try {
        const updatedAccounts = [...accounts, newAccount];
        setAccounts(updatedAccounts);
        await AsyncStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(updatedAccounts));
        hapticNotification('success');
        return true;
      } catch (err) {
        console.warn('Error al registrar nuevo usuario:', err);
        hapticNotification('error');
        return false;
      }
    },
    [accounts]
  );

  const value = useMemo(
    () => ({
      user,
      role: user?.role || null,
      isAuthenticated: Boolean(user),
      isLoading,
      accounts,
      login,
      logout,
      registerUser,
    }),
    [user, isLoading, accounts, login, logout, registerUser]
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
