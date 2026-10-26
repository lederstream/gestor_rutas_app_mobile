/**
 * ============================================================================
 * STATE MANAGEMENT REDUCER: orderReducer.ts
 * Pure reducer handling deterministic state mutations for Orders
 * ============================================================================
 */

import { Order, OrderFilter, OrderStatus } from '../models/Order';
import { INITIAL_ORDERS } from '../utils/mockData';

export interface OrderState {
  orders: Order[];
  filter: OrderFilter;
  selectedOrderId: string | null;
}

export type OrderAction =
  | { type: 'ADD_ORDER'; payload: Order }
  | { type: 'UPDATE_ORDER'; payload: Order }
  | {
      type: 'UPDATE_ORDER_STATUS';
      payload: { id: string; status: OrderStatus; deliveredAt?: string };
    }
  | { type: 'DELETE_ORDER'; payload: { id: string } }
  | { type: 'SET_FILTER'; payload: Partial<OrderFilter> }
  | { type: 'RESET_FILTERS' }
  | { type: 'RESET_TO_MOCK' }
  | { type: 'SELECT_ORDER'; payload: string | null };

export const initialFilter: OrderFilter = {
  status: 'ALL',
  category: 'ALL',
  priority: 'ALL',
  district: 'ALL',
  searchQuery: '',
};

export const initialOrderState: OrderState = {
  orders: INITIAL_ORDERS,
  filter: initialFilter,
  selectedOrderId: null,
};

export function orderReducer(state: OrderState, action: OrderAction): OrderState {
  switch (action.type) {
    case 'ADD_ORDER': {
      return {
        ...state,
        orders: [action.payload, ...state.orders],
      };
    }

    case 'UPDATE_ORDER': {
      return {
        ...state,
        orders: state.orders.map((ord) =>
          ord.id === action.payload.id ? action.payload : ord
        ),
      };
    }

    case 'UPDATE_ORDER_STATUS': {
      const { id, status, deliveredAt } = action.payload;
      return {
        ...state,
        orders: state.orders.map((ord) => {
          if (ord.id !== id) return ord;
          const isDelivered = status === 'DELIVERED';
          return {
            ...ord,
            status,
            deliveredAt: isDelivered
              ? deliveredAt || new Date().toISOString()
              : ord.deliveredAt,
            // If delivered, mark paymentStatus as PAID if cash or card
            paymentStatus: isDelivered ? 'PAID' : ord.paymentStatus,
          };
        }),
      };
    }

    case 'DELETE_ORDER': {
      return {
        ...state,
        orders: state.orders.filter((ord) => ord.id !== action.payload.id),
        selectedOrderId:
          state.selectedOrderId === action.payload.id
            ? null
            : state.selectedOrderId,
      };
    }

    case 'SET_FILTER': {
      return {
        ...state,
        filter: {
          ...state.filter,
          ...action.payload,
        },
      };
    }

    case 'RESET_FILTERS': {
      return {
        ...state,
        filter: initialFilter,
      };
    }

    case 'RESET_TO_MOCK': {
      return {
        ...state,
        orders: INITIAL_ORDERS,
        filter: initialFilter,
      };
    }

    case 'SELECT_ORDER': {
      return {
        ...state,
        selectedOrderId: action.payload,
      };
    }

    default:
      return state;
  }
}
