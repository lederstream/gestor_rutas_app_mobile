/**
 * ============================================================================
 * STATE MANAGEMENT REDUCER: orderReducer.ts
 * Pure reducer handling state mutations for User-Driven Orders without Demo Data
 * ============================================================================
 */

import { Order, OrderFilter, OrderStatus } from '../models/Order';

export interface OrderState {
  orders: Order[];
  filter: OrderFilter;
  selectedOrderId: string | null;
  isLoading: boolean;
}

export type OrderAction =
  | { type: 'SET_ORDERS'; payload: Order[] }
  | { type: 'ADD_ORDER'; payload: Order }
  | { type: 'UPDATE_ORDER'; payload: Order }
  | {
      type: 'UPDATE_ORDER_STATUS';
      payload: { id: string; status: OrderStatus; deliveredAt?: string };
    }
  | {
      type: 'UPDATE_ORDER_LOCATION';
      payload: { id: string; latitude: number; longitude: number };
    }
  | { type: 'LOAD_DEMO_ORDERS'; payload: Order[] }
  | { type: 'DELETE_ORDER'; payload: { id: string } }
  | { type: 'CLEAR_ALL_ORDERS' }
  | { type: 'SET_FILTER'; payload: Partial<OrderFilter> }
  | { type: 'RESET_FILTERS' }
  | { type: 'SELECT_ORDER'; payload: string | null }
  | { type: 'SET_LOADING'; payload: boolean };

export const initialFilter: OrderFilter = {
  status: 'ALL',
  category: 'ALL',
  priority: 'ALL',
  district: 'ALL',
  searchQuery: '',
};

// Initial state starts completely clean (NO demo data)
export const initialOrderState: OrderState = {
  orders: [],
  filter: initialFilter,
  selectedOrderId: null,
  isLoading: true,
};

export function orderReducer(state: OrderState, action: OrderAction): OrderState {
  switch (action.type) {
    case 'SET_ORDERS': {
      return {
        ...state,
        orders: action.payload,
        isLoading: false,
      };
    }

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
            paymentStatus: isDelivered ? 'PAID' : ord.paymentStatus,
          };
        }),
      };
    }

    case 'UPDATE_ORDER_LOCATION': {
      const { id, latitude, longitude } = action.payload;
      return {
        ...state,
        orders: state.orders.map((ord) =>
          ord.id === id ? { ...ord, latitude, longitude } : ord
        ),
      };
    }

    case 'LOAD_DEMO_ORDERS': {
      return {
        ...state,
        orders: [...state.orders, ...action.payload],
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

    case 'CLEAR_ALL_ORDERS': {
      return {
        ...state,
        orders: [],
        selectedOrderId: null,
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

    case 'SELECT_ORDER': {
      return {
        ...state,
        selectedOrderId: action.payload,
      };
    }

    case 'SET_LOADING': {
      return {
        ...state,
        isLoading: action.payload,
      };
    }

    default:
      return state;
  }
}
