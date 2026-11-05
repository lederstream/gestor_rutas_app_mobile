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
import { User } from '../models/User';
import {
  orderReducer,
  initialOrderState,
  OrderState,
} from './orderReducer';
import { calculateOrderStatistics, calculateRouteLoad } from '../utils/formatters';
import { getDynamicPriority } from '../utils/priorityHelper';
import { INITIAL_ORDERS } from '../utils/mockData';

const STORAGE_KEY = '@gestor_rutas_orders_v5_multi_dist_tacna';

export interface OrderContextType {
  state: OrderState;
  orders: Order[];
  filteredOrders: Order[];
  statistics: OrderStatistics;
  routeLoad: RouteLoadItem[];
  filter: OrderFilter;
  isLoading: boolean;
  // Getters para pedidos según usuario
  getOrdersForUser: (user: User | null) => Order[];
  getStatisticsForUser: (user: User | null) => OrderStatistics;
  getRouteLoadForUser: (user: User | null) => RouteLoadItem[];
  // Actions
  addOrder: (order: Order) => void;
  updateOrder: (order: Order) => void;
  changeStatus: (id: string, status: OrderStatus, deliveredAt?: string) => void;
  updateOrderStatus: (id: string, status: OrderStatus, deliveredAt?: string) => void;
  updateOrderLocation: (id: string, latitude: number, longitude: number) => void;
  loadDemoOrders: (demoOrders: Order[]) => void;
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

  // 1. Cargar mockData inicial al montar la aplicación y sincronizar con memoria
  useEffect(() => {
    const loadSavedOrders = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed: Order[] = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            dispatch({ type: 'SET_ORDERS', payload: parsed });
          } else {
            dispatch({ type: 'SET_ORDERS', payload: INITIAL_ORDERS });
          }
        } else {
          dispatch({ type: 'SET_ORDERS', payload: INITIAL_ORDERS });
        }
      } catch (err) {
        console.warn('Error loading orders from storage, loading mockData', err);
        dispatch({ type: 'SET_ORDERS', payload: INITIAL_ORDERS });
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

  const changeStatus = useCallback(
    (id: string, status: OrderStatus, deliveredAt?: string) => {
      dispatch({
        type: 'CHANGE_STATUS',
        payload: { id, status, deliveredAt },
      });
    },
    []
  );

  const updateOrderStatus = useCallback(
    (id: string, status: OrderStatus, deliveredAt?: string) => {
      dispatch({
        type: 'CHANGE_STATUS',
        payload: { id, status, deliveredAt },
      });
    },
    []
  );

  const updateOrderLocation = useCallback(
    (id: string, latitude: number, longitude: number) => {
      dispatch({
        type: 'UPDATE_ORDER_LOCATION',
        payload: { id, latitude, longitude },
      });
    },
    []
  );

  const loadDemoOrders = useCallback((demoOrders: Order[]) => {
    dispatch({ type: 'LOAD_DEMO_ORDERS', payload: demoOrders });
  }, []);

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

  // Obtener pedidos dinámicos asociados al usuario según su rol y especialidad
  const getOrdersForUser = useCallback(
    (currentUser: User | null): Order[] => {
      if (!currentUser) return [];
      if (currentUser.role === 'DISTRIBUTOR') {
        const specialty = currentUser.specialtyCategory || 'WATER';
        return enrichedOrders.filter((o) => o.category === specialty);
      }
      if (currentUser.role === 'CLIENT') {
        return enrichedOrders.filter(
          (o) =>
            (currentUser.customerId && o.customerId === currentUser.customerId) ||
            o.customerName.trim().toLowerCase() === currentUser.name.trim().toLowerCase()
        );
      }
      return enrichedOrders;
    },
    [enrichedOrders]
  );

  // Métricas de pedidos según usuario
  const getStatisticsForUser = useCallback(
    (currentUser: User | null): OrderStatistics => {
      const userOrders = getOrdersForUser(currentUser);
      return calculateOrderStatistics(userOrders);
    },
    [getOrdersForUser]
  );

  // Calcular carga física en camión para el usuario
  const getRouteLoadForUser = useCallback(
    (currentUser: User | null): RouteLoadItem[] => {
      const userOrders = getOrdersForUser(currentUser);
      return calculateRouteLoad(userOrders);
    },
    [getOrdersForUser]
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
      getOrdersForUser,
      getStatisticsForUser,
      getRouteLoadForUser,
      addOrder,
      updateOrder,
      changeStatus,
      updateOrderStatus,
      updateOrderLocation,
      loadDemoOrders,
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
      getOrdersForUser,
      getStatisticsForUser,
      getRouteLoadForUser,
      addOrder,
      updateOrder,
      changeStatus,
      updateOrderStatus,
      updateOrderLocation,
      loadDemoOrders,
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
