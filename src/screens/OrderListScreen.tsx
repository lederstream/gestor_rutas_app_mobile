/**
 * ============================================================================
 * SCREEN: OrderListScreen.tsx
 * Tablero de Despachos Optimizado para Repartidores y Operadores Logísticos
 * ============================================================================
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/RootNavigator';
import { useOrders } from '../context/OrderContext';
import { OrderStatus } from '../models/Order';
import { COLORS, SPACING, RADIUS, TOUCH_TARGET } from '../utils/constants';
import { formatCurrency } from '../utils/formatters';
import { hapticImpact, hapticNotification, hapticSelection } from '../utils/haptics';
import { Header } from '../components/common/Header';
import { CustomInput } from '../components/common/CustomInput';
import { OrderCard } from '../components/orders/OrderCard';
import { OrderFilterBar } from '../components/orders/OrderFilterBar';

type Props = NativeStackScreenProps<RootStackParamList, 'OrderListScreen'>;

export const OrderListScreen: React.FC<Props> = ({ navigation }) => {
  const {
    orders,
    filteredOrders,
    statistics,
    filter,
    setFilter,
    resetFilters,
    updateOrderStatus,
  } = useOrders();

  const [search, setSearch] = useState(filter.searchQuery);

  const handleSearchChange = (text: string) => {
    setSearch(text);
    setFilter({ searchQuery: text });
  };

  const handleClearSearch = () => {
    hapticSelection();
    setSearch('');
    setFilter({ searchQuery: '' });
  };

  const handleStatusFilterChange = (status: OrderStatus | 'ALL') => {
    hapticSelection();
    setFilter({ status });
  };

  const handleQuickStatusChange = (orderId: string, newStatus: OrderStatus) => {
    if (newStatus === 'DELIVERED') {
      Alert.alert(
        'Confirmar Entrega',
        '¿Deseas marcar este pedido como entregado conforme?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Sí, Confirmar',
            style: 'default',
            onPress: () => {
              hapticNotification('success');
              updateOrderStatus(orderId, 'DELIVERED');
            },
          },
        ]
      );
    } else {
      hapticImpact('medium');
      updateOrderStatus(orderId, newStatus);
    }
  };

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconCircle}>
        <Ionicons name="cube-outline" size={44} color={COLORS.textMuted} />
      </View>
      <Text style={styles.emptyTitle}>Sin pedidos para mostrar</Text>
      <Text style={styles.emptySubtitle}>
        No hay despachos que coincidan con la búsqueda o filtro seleccionado.
      </Text>
      <TouchableOpacity
        style={styles.resetFiltersButton}
        onPress={() => {
          hapticSelection();
          setSearch('');
          resetFilters();
        }}
        activeOpacity={0.75}
      >
        <Ionicons name="refresh" size={16} color={COLORS.primary} />
        <Text style={styles.resetFiltersText}>Mostrar Todos los Pedidos</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

      {/* Cabecera con acceso directo al Mapa y Manifiesto */}
      <Header
        title="Hoja de Ruta"
        subtitle={`${filteredOrders.length} despachos listados`}
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
        rightActionIcon="map-outline"
        onRightActionPress={() => {
          hapticSelection();
          navigation.navigate('MapRouteScreen');
        }}
      />

      {/* Barra de KPIs compacta y de un vistazo */}
      <View style={styles.kpiBar}>
        <View style={styles.kpiCol}>
          <Text style={styles.kpiLabel}>Pendientes</Text>
          <Text style={[styles.kpiValue, { color: COLORS.statusPending }]}>
            {statistics.pendingOrders}
          </Text>
        </View>
        <View style={styles.kpiDivider} />
        <View style={styles.kpiCol}>
          <Text style={styles.kpiLabel}>En Ruta</Text>
          <Text style={[styles.kpiValue, { color: COLORS.statusInTransit }]}>
            {statistics.inTransitOrders}
          </Text>
        </View>
        <View style={styles.kpiDivider} />
        <View style={styles.kpiCol}>
          <Text style={styles.kpiLabel}>Entregados</Text>
          <Text style={[styles.kpiValue, { color: COLORS.statusDelivered }]}>
            {statistics.deliveredOrders}
          </Text>
        </View>
        <View style={styles.kpiDivider} />
        <View style={styles.kpiCol}>
          <Text style={styles.kpiLabel}>Por Cobrar</Text>
          <Text style={[styles.kpiValue, { color: COLORS.textPrimary }]}>
            {formatCurrency(statistics.pendingCollection)}
          </Text>
        </View>
      </View>

      {/* Buscador Rápido y Ergonómico */}
      <View style={styles.searchSection}>
        <CustomInput
          value={search}
          onChangeText={handleSearchChange}
          placeholder="Buscar por cliente, dirección, distrito o código..."
          icon="search-outline"
          onClear={handleClearSearch}
          containerStyle={{ marginBottom: 0 }}
        />
      </View>

      {/* Filtros Segmentados por Estado */}
      <OrderFilterBar
        activeStatus={filter.status}
        onSelectStatus={handleStatusFilterChange}
        counts={{
          all: statistics.totalOrders,
          pending: statistics.pendingOrders,
          inTransit: statistics.inTransitOrders,
          delivered: statistics.deliveredOrders,
          cancelled: statistics.cancelledOrders,
        }}
      />

      {/* Lista Principal de Pedidos */}
      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <OrderCard
            order={item}
            onPress={() => {
              hapticSelection();
              navigation.navigate('OrderDetailScreen', { orderId: item.id });
            }}
            onQuickStatusChange={handleQuickStatusChange}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmptyList}
        initialNumToRender={6}
        maxToRenderPerBatch={8}
        windowSize={5}
        removeClippedSubviews={true}
      />

      {/* Botón Flotante para Generar Pedido (FAB) */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.88}
        onPress={() => {
          hapticImpact('medium');
          navigation.navigate('CreateOrderScreen');
        }}
      >
        <Ionicons name="add" size={24} color="#FFFFFF" />
        <Text style={styles.fabText}>Nuevo Pedido</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  kpiBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingVertical: 10,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  kpiCol: {
    flex: 1,
    alignItems: 'center',
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
  },
  kpiValue: {
    fontSize: 14,
    fontWeight: '900',
    marginTop: 2,
  },
  kpiDivider: {
    width: 1,
    height: 22,
    backgroundColor: COLORS.border,
  },
  searchSection: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
    backgroundColor: COLORS.surface,
  },
  listContent: {
    padding: SPACING.lg,
    paddingBottom: 95,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: SPACING.xl,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  resetFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    backgroundColor: '#EFF6FF',
    gap: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  resetFiltersText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    height: TOUCH_TARGET.buttonHeight,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    elevation: 6,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
