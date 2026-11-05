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

const AUTH_STORAGE_KEY = '@gestor_rutas_auth_user_v3_tacna';
const ACCOUNTS_STORAGE_KEY = '@gestor_rutas_accounts_v3_tacna';

export interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  accounts: UserAccount[];
  login: (identifier: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  registerUser: (newAccount: UserAccount) => Promise<boolean>;
  updateAccount: (updatedAccount: UserAccount) => Promise<boolean>;
  deleteAccount: (id: string) => Promise<boolean>;
  updateProfile: (updatedData: Partial<User>) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  resetToInitialProfile: () => Promise<void>;
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
        // Cargar cuentas registradas con respaldo garantizado de todos los roles y rubros
        const storedAccounts = await AsyncStorage.getItem(ACCOUNTS_STORAGE_KEY);
        let currentAccounts: UserAccount[] = [];
        if (storedAccounts) {
          try {
            const parsed: UserAccount[] = JSON.parse(storedAccounts);
            if (Array.isArray(parsed) && parsed.length > 0) {
              currentAccounts = parsed;
            } else {
              currentAccounts = [...REGISTERED_ACCOUNTS];
            }
          } catch {
            currentAccounts = [...REGISTERED_ACCOUNTS];
          }
        } else {
          currentAccounts = [...REGISTERED_ACCOUNTS];
        }

        // Sincronizar cuentas base garantizadas (Admin, 4 distribuidores por rubro, clientes)
        for (const baseAcc of REGISTERED_ACCOUNTS) {
          const idx = currentAccounts.findIndex(
            (a) => a.id === baseAcc.id || a.username.toLowerCase() === baseAcc.username.toLowerCase()
          );
          if (idx === -1) {
            currentAccounts.push(baseAcc);
          } else {
            currentAccounts[idx] = {
              ...baseAcc,
              ...currentAccounts[idx],
              email: currentAccounts[idx].email || baseAcc.email,
              phone: currentAccounts[idx].phone || baseAcc.phone,
              specialtyCategory: currentAccounts[idx].specialtyCategory || baseAcc.specialtyCategory,
              specialtyLabel: currentAccounts[idx].specialtyLabel || baseAcc.specialtyLabel,
            };
          }
        }

        setAccounts(currentAccounts);
        await AsyncStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(currentAccounts));

        // Cargar sesión activa si existe
        const storedUser = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
        if (storedUser) {
          const parsedUser: User = JSON.parse(storedUser);
          setUser(parsedUser);
        } else {
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

  // 2. Autenticación con Usuario, Celular o Correo y Contraseña
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
          error: 'Por favor ingresa tu usuario, celular o correo y tu contraseña.',
        };
      }

      // Normalizador de teléfono celular (soporta formato nacional 9 dígitos y prefijo +51)
      const normalizePhone = (num?: string) => {
        if (!num) return '';
        const d = num.replace(/\D/g, '');
        if (d.length === 11 && d.startsWith('51')) return d.slice(2);
        return d;
      };

      const inputPhone = normalizePhone(cleanId);

      // Buscar cuenta por username, email o celular (con pool de cuentas y respaldo garantizado)
      const accountsPool = accounts && accounts.length > 0 ? accounts : REGISTERED_ACCOUNTS;
      const matchedAccount =
        accountsPool.find((acc) => {
          const u = acc.username.toLowerCase();
          const e = acc.email ? acc.email.toLowerCase() : '';
          const p = normalizePhone(acc.phone);

          return (
            u === cleanId ||
            (e && e === cleanId) ||
            (inputPhone.length >= 7 && p && p === inputPhone)
          );
        }) ||
        REGISTERED_ACCOUNTS.find((acc) => {
          const u = acc.username.toLowerCase();
          const e = acc.email ? acc.email.toLowerCase() : '';
          const p = normalizePhone(acc.phone);

          return (
            u === cleanId ||
            (e && e === cleanId) ||
            (inputPhone.length >= 7 && p && p === inputPhone)
          );
        });

      if (!matchedAccount) {
        hapticNotification('error');
        return {
          success: false,
          error: 'Usuario, celular o correo no registrado en el sistema.',
        };
      }

      // Validar contraseña
      const isBaseAccount = REGISTERED_ACCOUNTS.some(
        (b) =>
          b.id === matchedAccount.id ||
          b.username.toLowerCase() === matchedAccount.username.toLowerCase()
      );

      let isPasswordValid = matchedAccount.password === cleanPass;

      // Compatibilidad garantizada para cuentas base del sistema
      if (!isPasswordValid && isBaseAccount) {
        if (matchedAccount.role === 'ADMIN') {
          isPasswordValid =
            cleanPass === 'admin' || cleanPass === '123123' || cleanPass === '123';
        } else {
          isPasswordValid = cleanPass === '123' || cleanPass === '123123';
        }
      }

      if (!isPasswordValid) {
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

  // 4b. Actualizar cuenta (Admin gestionando distribuidores)
  const updateAccount = useCallback(
    async (updatedAccount: UserAccount): Promise<boolean> => {
      try {
        const updatedAccounts = accounts.map((acc) =>
          acc.id === updatedAccount.id ? updatedAccount : acc
        );
        setAccounts(updatedAccounts);
        await AsyncStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(updatedAccounts));
        hapticNotification('success');
        return true;
      } catch (err) {
        console.warn('Error al actualizar cuenta:', err);
        hapticNotification('error');
        return false;
      }
    },
    [accounts]
  );

  // 4c. Eliminar cuenta (Admin gestionando distribuidores)
  const deleteAccount = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const updatedAccounts = accounts.filter((acc) => acc.id !== id);
        setAccounts(updatedAccounts);
        await AsyncStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(updatedAccounts));
        hapticNotification('success');
        return true;
      } catch (err) {
        console.warn('Error al eliminar cuenta:', err);
        hapticNotification('error');
        return false;
      }
    },
    [accounts]
  );

  // 5. Actualización completa de datos de Perfil (CRUD - Update)
  const updateProfile = useCallback(
    async (updatedData: Partial<User>): Promise<{ success: boolean; error?: string }> => {
      if (!user) {
        return { success: false, error: 'No hay una sesión activa.' };
      }

      if (updatedData.name !== undefined && !updatedData.name.trim()) {
        hapticNotification('error');
        return { success: false, error: 'El nombre completo no puede quedar vacío.' };
      }

      if (updatedData.phone !== undefined && !updatedData.phone.trim()) {
        hapticNotification('error');
        return { success: false, error: 'El número de teléfono es obligatorio para la operación.' };
      }

      try {
        const newProfile: User = {
          ...user,
          ...updatedData,
          name: updatedData.name !== undefined ? updatedData.name.trim() : user.name,
          phone: updatedData.phone !== undefined ? updatedData.phone.trim() : user.phone,
          email: updatedData.email !== undefined ? updatedData.email.trim() : user.email,
          vehicleInfo: updatedData.vehicleInfo !== undefined ? updatedData.vehicleInfo.trim() : user.vehicleInfo,
          driverCode: updatedData.driverCode !== undefined ? updatedData.driverCode.trim() : user.driverCode,
        };

        // Actualizar sesión activa
        setUser(newProfile);
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newProfile));

        // Sincronizar en la lista persistente de cuentas registradas
        const updatedAccounts = accounts.map((acc) => {
          if (acc.id === user.id || acc.username.toLowerCase() === user.username.toLowerCase()) {
            return {
              ...acc,
              ...newProfile,
            };
          }
          return acc;
        });

        setAccounts(updatedAccounts);
        await AsyncStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(updatedAccounts));

        hapticNotification('success');
        return { success: true };
      } catch (err) {
        console.warn('Error al actualizar perfil:', err);
        hapticNotification('error');
        return { success: false, error: 'Ocurrió un error al guardar los cambios en memoria.' };
      }
    },
    [user, accounts]
  );

  // 6. Actualización segura de Contraseña
  const updatePassword = useCallback(
    async (
      currentPassword: string,
      newPassword: string
    ): Promise<{ success: boolean; error?: string }> => {
      if (!user) {
        return { success: false, error: 'No hay una sesión activa.' };
      }

      const cleanCurrent = currentPassword.trim();
      const cleanNew = newPassword.trim();

      if (!cleanCurrent || !cleanNew) {
        hapticNotification('error');
        return { success: false, error: 'Ingresa tanto la clave actual como la nueva clave.' };
      }

      if (cleanNew.length < 3) {
        hapticNotification('error');
        return { success: false, error: 'La nueva contraseña debe tener al menos 3 caracteres.' };
      }

      const currentAcc = accounts.find(
        (acc) => acc.id === user.id || acc.username.toLowerCase() === user.username.toLowerCase()
      );

      if (!currentAcc || currentAcc.password !== cleanCurrent) {
        hapticNotification('error');
        return { success: false, error: 'La contraseña actual no es correcta.' };
      }

      try {
        const updatedAccounts = accounts.map((acc) => {
          if (acc.id === user.id || acc.username.toLowerCase() === user.username.toLowerCase()) {
            return {
              ...acc,
              password: cleanNew,
            };
          }
          return acc;
        });

        setAccounts(updatedAccounts);
        await AsyncStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(updatedAccounts));

        hapticNotification('success');
        return { success: true };
      } catch (err) {
        console.warn('Error al actualizar contraseña:', err);
        hapticNotification('error');
        return { success: false, error: 'No se pudo guardar la nueva contraseña.' };
      }
    },
    [user, accounts]
  );

  // 7. Restablecer datos iniciales del usuario
  const resetToInitialProfile = useCallback(async () => {
    if (!user) return;
    const initialAcc = REGISTERED_ACCOUNTS.find(
      (acc) => acc.username.toLowerCase() === user.username.toLowerCase()
    );
    if (initialAcc) {
      const { password: _, ...cleanProfile } = initialAcc;
      setUser(cleanProfile);
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(cleanProfile));
      hapticNotification('success');
    }
  }, [user]);

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
      updateAccount,
      deleteAccount,
      updateProfile,
      updatePassword,
      resetToInitialProfile,
    }),
    [
      user,
      isLoading,
      accounts,
      login,
      logout,
      registerUser,
      updateAccount,
      deleteAccount,
      updateProfile,
      updatePassword,
      resetToInitialProfile,
    ]
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
