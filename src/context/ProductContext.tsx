/**
 * ============================================================================
 * CONTEXT: ProductContext.tsx
 * Gestión del estado del Catálogo de Productos y Servicios en AsyncStorage
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
import { Product, INITIAL_PRODUCTS } from '../models/Product';

const PRODUCTS_STORAGE_KEY = '@gestor_rutas_products_v1';

export interface ProductContextType {
  products: Product[];
  isLoading: boolean;
  addProduct: (data: Omit<Product, 'id' | 'createdAt'> & { id?: string }) => Product;
  updateProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;
  getProductById: (id: string) => Product | undefined;
  resetToInitialProducts: () => void;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export const ProductProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isLoadedRef = useRef(false);

  // 1. Cargar productos desde AsyncStorage
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const stored = await AsyncStorage.getItem(PRODUCTS_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setProducts(parsed);
          } else {
            setProducts(INITIAL_PRODUCTS);
          }
        } else {
          setProducts(INITIAL_PRODUCTS);
        }
      } catch (err) {
        console.warn('Error loading products from AsyncStorage', err);
        setProducts(INITIAL_PRODUCTS);
      } finally {
        setIsLoading(false);
        isLoadedRef.current = true;
      }
    };

    loadProducts();
  }, []);

  // 2. Guardar automáticamente cuando cambia la lista de productos
  useEffect(() => {
    if (!isLoadedRef.current) return;
    const saveProducts = async () => {
      try {
        await AsyncStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(products));
      } catch (err) {
        console.warn('Error saving products to AsyncStorage', err);
      }
    };
    saveProducts();
  }, [products]);

  // Acciones
  const addProduct = useCallback(
    (data: Omit<Product, 'id' | 'createdAt'> & { id?: string }): Product => {
      const newProduct: Product = {
        ...data,
        id: data.id || `prod-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      setProducts((prev) => [newProduct, ...prev]);
      return newProduct;
    },
    []
  );

  const updateProduct = useCallback((product: Product) => {
    setProducts((prev) =>
      prev.map((item) => (item.id === product.id ? product : item))
    );
  }, []);

  const deleteProduct = useCallback((id: string) => {
    setProducts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const getProductById = useCallback(
    (id: string) => {
      return products.find((item) => item.id === id);
    },
    [products]
  );

  const resetToInitialProducts = useCallback(() => {
    setProducts(INITIAL_PRODUCTS);
  }, []);

  const value = useMemo(
    () => ({
      products,
      isLoading,
      addProduct,
      updateProduct,
      deleteProduct,
      getProductById,
      resetToInitialProducts,
    }),
    [
      products,
      isLoading,
      addProduct,
      updateProduct,
      deleteProduct,
      getProductById,
      resetToInitialProducts,
    ]
  );

  return <ProductContext.Provider value={value}>{children}</ProductContext.Provider>;
};

export const useProducts = (): ProductContextType => {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error('useProducts must be used within a ProductProvider');
  }
  return context;
};
