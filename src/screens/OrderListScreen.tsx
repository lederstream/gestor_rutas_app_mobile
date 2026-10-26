/**
 * ============================================================================
 * SCREEN: OrderListScreen.tsx
 * High-performance logistics dispatch board with instant search & filter tabs
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
import { Order, OrderStatus, ProductCategory } from '../models/Order';
import { COLORS, CATEGORY_CONFIG } from '../utils/constants';
import { formatCurrency } from '../utils/formatters';
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
  const [showCategoryPills, setShowCategoryPills] = useState(false);

  const handleSearchChange = (text: string) => {
    setSearch(text);
    setFilter({ searchQuery: text });
  };

  const handleClearSearch = () => {
    setSearch('');
    setFilter({ searchQuery: '' });
  };

  const handleStatusFilterChange = (status: OrderStatus | 'ALL') => {
    setFilter({ status });
  };

  const handleCategoryFilterChange = (category: ProductCategory | 'ALL') => {
    setFilter({
      category: filter.category === category ? 'ALL' : category,
    });
  };

  const handleQuickStatusChange = (orderId: string, newStatus: OrderStatus) => {
    if (newStatus === 'DELIVERED') {
      Alert.alert(
        'Confirmar Entrega',
        '¿Deseas marcar este pedido como entregado y recibido a conformidad?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Sí, Confirmar',
            style: 'default',
            onPress: () => updateOrderStatus(orderId, 'DELIVERED'),
          },
        ]
      );
    } else {
      updateOrderStatus(orderId, newStatus);
    }
  };

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconCircle}>
        <Ionicons name="cube-outline" size={48} color={COLORS.textMuted} />
      </View>
      <Text style={styles.emptyTitle}>Sin pedidos para mostrar</Text>
      <Text style={styles.emptySubtitle}>
        No existen despachos que coincidan con la búsqueda o filtros seleccionados.
      </Text>
      <TouchableOpacity
        style={styles.resetFiltersButton}
        onPress={() => {
          setSearch('');
          resetFilters();
        }}
        activeOpacity={0.75}
      >
        <Ionicons name="refresh" size={16} color={COLORS.primary} />
        <Text style={styles.resetFiltersText}>Restablecer Filtros</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

      {/* Top Header */}
      <Header
        title="Hoja de Ruta Activa"
        subtitle={`${filteredOrders.length} pedidos de ${statistics.totalOrders} totales`}
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
        rightActionIcon="analytics-outline"
        onRightActionPress={() => navigation.navigate('RouteSummaryModalOrScreen')}
        rightBadgeText={String(statistics.pendingOrders + statistics.inTransitOrders)}
      />

      {/* Quick KPI Strip */}
      <View style={styles.kpiStrip}>
        <View style={styles.kpiItem}>
          <Text style={styles.kpiLabel}>Pendientes</Text>
          <Text style={[styles.kpiValue, { color: COLORS.statusPending }]}>
            {statistics.pendingOrders}
          </Text>
        </View>
        <View style={styles.kpiDivider} />
        <View style={styles.kpiItem}>
          <Text style={styles.kpiLabel}>En Ruta</Text>
          <Text style={[styles.kpiValue, { color: COLORS.statusInTransit }]}>
            {statistics.inTransitOrders}
          </Text>
        </View>
        <View style={styles.kpiDivider} />
        <View style={styles.kpiItem}>
          <Text style={styles.kpiLabel}>Entregados</Text>
          <Text style={[styles.kpiValue, { color: COLORS.statusDelivered }]}>
            {statistics.deliveredOrders}
          </Text>
        </View>
        <View style={styles.kpiDivider} />
        <View style={styles.kpiItem}>
          <Text style={styles.kpiLabel}>Por Cobrar</Text>
          <Text style={styles.kpiValue}>
            {formatCurrency(statistics.pendingCollection)}
          </Text>
        </View>
      </View>

      {/* Map Switcher Banner */}
      <TouchableOpacity
        style={styles.mapBannerBtn}
        onPress={() => navigation.navigate('MapRouteScreen')}
        activeOpacity={0.85}
      >
        <View style={styles.mapBannerLeft}>
          <View style={styles.mapIconCircle}>
            <Ionicons name="map" size={16} color="#FFFFFF" />
          </View>
          <View>
            <Text style={styles.mapBannerTitle}>Ver Recorrido en Mapa</Text>
            <Text style={styles.mapBannerSubtitle}>Puntos GPS y paradas estilo Uber</Text>
          </View>
        </View>
        <View style={styles.mapBannerBadge}>
          <Text style={styles.mapBannerBadgeText}>ABRIR</Text>
          <Ionicons name="chevron-forward" size={14} color="#FFFFFF" />
        </View>
      </TouchableOpacity>

      {/* Search Input */}
      <View style={styles.searchSection}>
        <CustomInput
          value={search}
          onChangeText={handleSearchChange}
          placeholder="Buscar por cliente, código, dirección o celular..."
          icon="search-outline"
          onClear={handleClearSearch}
          containerStyle={styles.searchContainerStyle}
        />
        <TouchableOpacity
          style={[
            styles.filterToggleBtn,
            showCategoryPills && styles.filterToggleBtnActive,
          ]}
          onPress={() => setShowCategoryPills(!showCategoryPills)}
          activeOpacity={0.7}
        >
          <Ionicons
            name="options-outline"
            size={20}
            color={showCategoryPills ? COLORS.textInverse : COLORS.textPrimary}
          />
        </TouchableOpacity>
      </View>

      {/* Optional Category Pills */}
      {showCategoryPills && (
        <View style={styles.categoryPillsRow}>
          <TouchableOpacity
            style={[
              styles.categoryChip,
              filter.category === 'ALL' && styles.categoryChipActive,
            ]}
            onPress={() => handleCategoryFilterChange('ALL')}
          >
            <Text
              style={[
                styles.categoryChipText,
                filter.category === 'ALL' && styles.categoryChipTextActive,
              ]}
            >
              Todos los rubros
            </Text>
          </TouchableOpacity>
          {Array.from(new Set(orders.map((o) => o.category).filter(Boolean))).map(
            (cat) => {
              const isSelected = filter.category === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryChip,
                    isSelected && { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
                  ]}
                  onPress={() => handleCategoryFilterChange(cat)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      isSelected && styles.categoryChipTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            }
          )}
        </View>
      )}

      {/* Status Segment Filter Bar */}
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

      {/* Order List */}
      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <OrderCard
            order={item}
            onPress={() =>
              navigation.navigate('OrderDetailScreen', { orderId: item.id })
            }
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

      {/* Floating Action Button (FAB) */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('CreateOrderScreen')}
      >
        <Ionicons name="add" size={26} color={COLORS.textInverse} />
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
  kpiStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  kpiItem: {
    alignItems: 'center',
    flex: 1,
  },
  kpiLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  kpiValue: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  kpiDivider: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.border,
  },
  mapBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  mapBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  mapIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  mapBannerSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  mapBannerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 2,
  },
  mapBannerBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: COLORS.surface,
    gap: 8,
  },
  searchContainerStyle: {
    flex: 1,
    marginBottom: 8,
  },
  filterToggleBtn: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  filterToggleBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: COLORS.surface,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 4,
  },
  categoryChipActive: {
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.secondary,
  },
  categoryChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  categoryChipTextActive: {
    color: COLORS.textInverse,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingBottom: 90,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
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
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
    gap: 6,
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
    borderRadius: 30,
    paddingVertical: 13,
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
    color: COLORS.textInverse,
    fontSize: 15,
    fontWeight: '700',
  },
});
