/**
 * ============================================================================
 * CONTEXT API: OrderContext.tsx
 * State management with AsyncStorage Persistence and Dynamic Priority
 * ============================================================================
 */

import React, {
  createContext,
  useContext,
  useReducer,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Order,
  OrderFilter,
  OrderStatus,
  OrderStatistics,
  RouteLoadItem,
} from '../models/Order';
import {
  orderReducer,
  initialOrderState,
  OrderState,
} from './orderReducer';
import { calculateOrderStatistics, calculateRouteLoad } from '../utils/formatters';
import { getDynamicPriority } from '../utils/priorityHelper';

const STORAGE_KEY = '@gestor_rutas_orders_v2';

export interface OrderContextType {
  state: OrderState;
  orders: Order[];
  filteredOrders: Order[];
  statistics: OrderStatistics;
  routeLoad: RouteLoadItem[];
  filter: OrderFilter;
  isLoading: boolean;
  // Actions
  addOrder: (order: Order) => void;
  updateOrder: (order: Order) => void;
  updateOrderStatus: (id: string, status: OrderStatus, deliveredAt?: string) => void;
  deleteOrder: (id: string) => void;
  clearAllOrders: () => void;
  setFilter: (filter: Partial<OrderFilter>) => void;
  resetFilters: () => void;
  getOrderById: (id: string) => Order | undefined;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const OrderProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(orderReducer, initialOrderState);
  const isLoadedRef = useRef(false);

  // 1. Load saved orders from AsyncStorage on startup
  useEffect(() => {
    const loadSavedOrders = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed: Order[] = JSON.parse(stored);
          dispatch({ type: 'SET_ORDERS', payload: parsed });
        } else {
          dispatch({ type: 'SET_ORDERS', payload: [] });
        }
      } catch (err) {
        console.warn('Error loading orders from AsyncStorage', err);
        dispatch({ type: 'SET_ORDERS', payload: [] });
      } finally {
        isLoadedRef.current = true;
      }
    };

    loadSavedOrders();
  }, []);

  // 2. Automatically save orders to AsyncStorage on change
  useEffect(() => {
    if (!isLoadedRef.current) return;
    const saveOrders = async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state.orders));
      } catch (err) {
        console.warn('Error saving orders to AsyncStorage', err);
      }
    };
    saveOrders();
  }, [state.orders]);

  // Orders enriched with dynamic auto-priority based on real waiting time
  const enrichedOrders = useMemo(() => {
    return state.orders.map((order) => {
      const dynamicInfo = getDynamicPriority(order);
      return {
        ...order,
        priority: dynamicInfo.priority,
      };
    });
  }, [state.orders]);

  // Memoized Filtered Orders
  const filteredOrders = useMemo(() => {
    return enrichedOrders.filter((order) => {
      // 1. Status Filter
      if (state.filter.status !== 'ALL' && order.status !== state.filter.status) {
        return false;
      }

      // 2. Category Filter
      if (
        state.filter.category !== 'ALL' &&
        order.category !== state.filter.category
      ) {
        return false;
      }

      // 3. Priority Filter
      if (
        state.filter.priority !== 'ALL' &&
        order.priority !== state.filter.priority
      ) {
        return false;
      }

      // 4. District / City Filter
      if (
        state.filter.district !== 'ALL' &&
        order.district.toLowerCase() !== state.filter.district.toLowerCase()
      ) {
        return false;
      }

      // 5. Search Query Filter (Matches Code, Name, Address, or Phone)
      if (state.filter.searchQuery.trim().length > 0) {
        const query = state.filter.searchQuery.toLowerCase().trim();
        const matchesName = order.customerName.toLowerCase().includes(query);
        const matchesCode = order.orderCode.toLowerCase().includes(query);
        const matchesAddress = order.deliveryAddress.toLowerCase().includes(query);
        const matchesPhone = order.customerPhone.includes(query);

        if (!matchesName && !matchesCode && !matchesAddress && !matchesPhone) {
          return false;
        }
      }

      return true;
    });
  }, [enrichedOrders, state.filter]);

  // Memoized Statistics
  const statistics = useMemo(() => {
    return calculateOrderStatistics(enrichedOrders);
  }, [enrichedOrders]);

  // Memoized Route Load
  const routeLoad = useMemo(() => {
    return calculateRouteLoad(enrichedOrders);
  }, [enrichedOrders]);

  // Actions
  const addOrder = useCallback((order: Order) => {
    dispatch({ type: 'ADD_ORDER', payload: order });
  }, []);

  const updateOrder = useCallback((order: Order) => {
    dispatch({ type: 'UPDATE_ORDER', payload: order });
  }, []);

  const updateOrderStatus = useCallback(
    (id: string, status: OrderStatus, deliveredAt?: string) => {
      dispatch({
        type: 'UPDATE_ORDER_STATUS',
        payload: { id, status, deliveredAt },
      });
    },
    []
  );

  const deleteOrder = useCallback((id: string) => {
    dispatch({ type: 'DELETE_ORDER', payload: { id } });
  }, []);

  const clearAllOrders = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL_ORDERS' });
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  }, []);

  const setFilter = useCallback((filter: Partial<OrderFilter>) => {
    dispatch({ type: 'SET_FILTER', payload: filter });
  }, []);

  const resetFilters = useCallback(() => {
    dispatch({ type: 'RESET_FILTERS' });
  }, []);

  const getOrderById = useCallback(
    (id: string) => {
      return enrichedOrders.find((ord) => ord.id === id);
    },
    [enrichedOrders]
  );

  const contextValue: OrderContextType = useMemo(
    () => ({
      state,
      orders: enrichedOrders,
      filteredOrders,
      statistics,
      routeLoad,
      filter: state.filter,
      isLoading: state.isLoading,
      addOrder,
      updateOrder,
      updateOrderStatus,
      deleteOrder,
      clearAllOrders,
      setFilter,
      resetFilters,
      getOrderById,
    }),
    [
      state,
      enrichedOrders,
      filteredOrders,
      statistics,
      routeLoad,
      addOrder,
      updateOrder,
      updateOrderStatus,
      deleteOrder,
      clearAllOrders,
      setFilter,
      resetFilters,
      getOrderById,
    ]
  );

  return (
    <OrderContext.Provider value={contextValue}>{children}</OrderContext.Provider>
  );
};

export const useOrders = (): OrderContextType => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrders must be used within an OrderProvider');
  }
  return context;
};
