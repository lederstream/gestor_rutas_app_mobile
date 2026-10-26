/**
 * ============================================================================
 * CONTEXT API: OrderContext.tsx
 * In-memory enterprise state management with useReducer & memoized selectors
 * ============================================================================
 */

import React, { createContext, useContext, useReducer, useMemo, useCallback } from 'react';
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
  initialFilter,
} from './orderReducer';
import { calculateOrderStatistics, calculateRouteLoad } from '../utils/formatters';

export interface OrderContextType {
  state: OrderState;
  orders: Order[];
  filteredOrders: Order[];
  statistics: OrderStatistics;
  routeLoad: RouteLoadItem[];
  filter: OrderFilter;
  // Actions
  addOrder: (order: Order) => void;
  updateOrder: (order: Order) => void;
  updateOrderStatus: (id: string, status: OrderStatus, deliveredAt?: string) => void;
  deleteOrder: (id: string) => void;
  setFilter: (filter: Partial<OrderFilter>) => void;
  resetFilters: () => void;
  resetToMockData: () => void;
  getOrderById: (id: string) => Order | undefined;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const OrderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(orderReducer, initialOrderState);

  // Memoized Filtered Orders
  const filteredOrders = useMemo(() => {
    return state.orders.filter((order) => {
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

      // 4. District Filter
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
  }, [state.orders, state.filter]);

  // Memoized Logistics Statistics
  const statistics = useMemo(() => {
    return calculateOrderStatistics(state.orders);
  }, [state.orders]);

  // Memoized Delivery Truck Load
  const routeLoad = useMemo(() => {
    return calculateRouteLoad(state.orders);
  }, [state.orders]);

  // Action Helpers with useCallback
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

  const setFilter = useCallback((filter: Partial<OrderFilter>) => {
    dispatch({ type: 'SET_FILTER', payload: filter });
  }, []);

  const resetFilters = useCallback(() => {
    dispatch({ type: 'RESET_FILTERS' });
  }, []);

  const resetToMockData = useCallback(() => {
    dispatch({ type: 'RESET_TO_MOCK' });
  }, []);

  const getOrderById = useCallback(
    (id: string) => {
      return state.orders.find((ord) => ord.id === id);
    },
    [state.orders]
  );

  const contextValue: OrderContextType = useMemo(
    () => ({
      state,
      orders: state.orders,
      filteredOrders,
      statistics,
      routeLoad,
      filter: state.filter,
      addOrder,
      updateOrder,
      updateOrderStatus,
      deleteOrder,
      setFilter,
      resetFilters,
      resetToMockData,
      getOrderById,
    }),
    [
      state,
      filteredOrders,
      statistics,
      routeLoad,
      addOrder,
      updateOrder,
      updateOrderStatus,
      deleteOrder,
      setFilter,
      resetFilters,
      resetToMockData,
      getOrderById,
    ]
  );

  return (
    <OrderContext.Provider value={contextValue}>{children}</OrderContext.Provider>
  );
};

/**
 * Custom Hook: useOrders
 * Encapsulates access to OrderContext with type-safety & runtime validation
 */
export const useOrders = (): OrderContextType => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrders must be used within an OrderProvider');
  }
  return context;
};
