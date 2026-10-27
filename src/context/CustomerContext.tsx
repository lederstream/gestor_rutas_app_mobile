/**
 * ============================================================================
 * CONTEXT: CustomerContext.tsx
 * Gestión del estado de Clientes con persistencia en AsyncStorage
 * ============================================================================
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Customer, INITIAL_CUSTOMERS } from '../models/Customer';

const CUSTOMERS_STORAGE_KEY = '@gestor_rutas_customers_v1';

export interface CustomerContextType {
  customers: Customer[];
  isLoading: boolean;
  addCustomer: (data: Omit<Customer, 'id' | 'createdAt'> & { id?: string }) => Customer;
  updateCustomer: (customer: Customer) => void;
  deleteCustomer: (id: string) => void;
  getCustomerById: (id: string) => Customer | undefined;
  resetToInitialCustomers: () => void;
}

const CustomerContext = createContext<CustomerContextType | undefined>(undefined);

export const CustomerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isLoadedRef = useRef(false);

  // 1. Cargar clientes guardados en AsyncStorage
  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const stored = await AsyncStorage.getItem(CUSTOMERS_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setCustomers(parsed);
          } else {
            setCustomers(INITIAL_CUSTOMERS);
          }
        } else {
          setCustomers(INITIAL_CUSTOMERS);
        }
      } catch (err) {
        console.warn('Error loading customers from AsyncStorage', err);
        setCustomers(INITIAL_CUSTOMERS);
      } finally {
        setIsLoading(false);
        isLoadedRef.current = true;
      }
    };

    loadCustomers();
  }, []);

  // 2. Guardar automáticamente cuando cambia la lista de clientes
  useEffect(() => {
    if (!isLoadedRef.current) return;
    const saveCustomers = async () => {
      try {
        await AsyncStorage.setItem(CUSTOMERS_STORAGE_KEY, JSON.stringify(customers));
      } catch (err) {
        console.warn('Error saving customers to AsyncStorage', err);
      }
    };
    saveCustomers();
  }, [customers]);

  // Acciones
  const addCustomer = useCallback(
    (data: Omit<Customer, 'id' | 'createdAt'> & { id?: string }): Customer => {
      const newCustomer: Customer = {
        ...data,
        id: data.id || `cust-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      setCustomers((prev) => [newCustomer, ...prev]);
      return newCustomer;
    },
    []
  );

  const updateCustomer = useCallback((customer: Customer) => {
    setCustomers((prev) =>
      prev.map((item) => (item.id === customer.id ? customer : item))
    );
  }, []);

  const deleteCustomer = useCallback((id: string) => {
    setCustomers((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const getCustomerById = useCallback(
    (id: string) => {
      return customers.find((item) => item.id === id);
    },
    [customers]
  );

  const resetToInitialCustomers = useCallback(() => {
    setCustomers(INITIAL_CUSTOMERS);
  }, []);

  const value = useMemo(
    () => ({
      customers,
      isLoading,
      addCustomer,
      updateCustomer,
      deleteCustomer,
      getCustomerById,
      resetToInitialCustomers,
    }),
    [
      customers,
      isLoading,
      addCustomer,
      updateCustomer,
      deleteCustomer,
      getCustomerById,
      resetToInitialCustomers,
    ]
  );

  return <CustomerContext.Provider value={value}>{children}</CustomerContext.Provider>;
};

export const useCustomers = (): CustomerContextType => {
  const context = useContext(CustomerContext);
  if (!context) {
    throw new Error('useCustomers must be used within a CustomerProvider');
  }
  return context;
};
