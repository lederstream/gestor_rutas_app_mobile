import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  RefreshControl,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/RootNavigator';
import { useAuth } from '../context/AuthContext';
import { useOrders } from '../context/OrderContext';
import { OrderStatus } from '../models/Order';
import { COLORS, SPACING, RADIUS, TOUCH_TARGET } from '../utils/constants';
import { formatCurrency } from '../utils/formatters';
import { hapticImpact, hapticNotification, hapticSelection } from '../utils/haptics';
import { Header } from '../components/common/Header';
import { CustomInput } from '../components/common/CustomInput';
import { OrderCard } from '../components/orders/OrderCard';
import { FloatingBottomDock } from '../components/common/FloatingBottomDock';

const STATUS_OPTIONS = [
  { id: 'ALL', label: 'Todos los Pedidos', shortLabel: 'Todos', icon: 'layers-outline' },
  { id: 'PENDING', label: 'Pendientes por Despachar', shortLabel: 'Pendientes', icon: 'hourglass-outline' },
  { id: 'IN_TRANSIT', label: 'En Ruta / Tránsito', shortLabel: 'En Ruta', icon: 'bicycle-outline' },
  { id: 'DELIVERED', label: 'Entregados y Cobrados', shortLabel: 'Entregados', icon: 'checkmark-circle-outline' },
  { id: 'CANCELLED', label: 'Anulados / Cancelados', shortLabel: 'Anulados', icon: 'close-circle-outline' },
];

const CATEGORY_OPTIONS = [
  { id: 'ALL', label: 'Todos los Rubros', shortLabel: 'Todos los Rubros', icon: 'globe-outline' },
  { id: 'WATER', label: 'Agua Purificada', shortLabel: 'Agua', icon: 'water-outline' },
  { id: 'GAS', label: 'Gas Doméstico', shortLabel: 'Gas', icon: 'flame-outline' },
  { id: 'BAKERY', label: 'Panadería y Pastelería', shortLabel: 'Panadería', icon: 'restaurant-outline' },
  { id: 'CLEANING', label: 'Productos de Limpieza', shortLabel: 'Limpieza', icon: 'sparkles-outline' },
];

type Props = NativeStackScreenProps<RootStackParamList, 'OrderListScreen'>;

export const OrderListScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const isDistributor = user?.role === 'DISTRIBUTOR';

  const {
    orders,
    filter,
    setFilter,
    resetFilters,
    updateOrderStatus,
  } = useOrders();

  const [adminCategory, setAdminCategory] = useState<string>('ALL');
  const [search, setSearch] = useState(filter.searchQuery);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isStatusModalVisible, setIsStatusModalVisible] = useState(false);
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);

  // Base de órdenes según el rol y rubro especializado del distribuidor
  const baseOrdersForUser = useMemo(() => {
    if (isDistributor) {
      const specialty = user?.specialtyCategory || 'WATER';
      return orders.filter((o) => o.category === specialty);
    }
    if (isAdmin && adminCategory !== 'ALL') {
      return orders.filter((o) => o.category === adminCategory);
    }
    return orders;
  }, [orders, isDistributor, user, isAdmin, adminCategory]);

  // Órdenes filtradas para mostrar
  const displayedOrders = useMemo(() => {
    return baseOrdersForUser.filter((order) => {
      // 1. Status Filter
      if (filter.status !== 'ALL' && order.status !== filter.status) {
        return false;
      }
      // 2. Search Query Filter
      if (filter.searchQuery.trim().length > 0) {
        const query = filter.searchQuery.toLowerCase().trim();
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
  }, [baseOrdersForUser, filter.status, filter.searchQuery]);

  // Conteos dinámicos para los filtros de estado
  const counts = useMemo(
    () => ({
      all: baseOrdersForUser.length,
      pending: baseOrdersForUser.filter((o) => o.status === 'PENDING').length,
      inTransit: baseOrdersForUser.filter((o) => o.status === 'IN_TRANSIT').length,
      delivered: baseOrdersForUser.filter((o) => o.status === 'DELIVERED').length,
      cancelled: baseOrdersForUser.filter((o) => o.status === 'CANCELLED').length,
    }),
    [baseOrdersForUser]
  );

  // Total por cobrar en esta vista
  const pendingCollection = useMemo(() => {
    return baseOrdersForUser
      .filter((o) => o.status !== 'CANCELLED' && o.paymentStatus === 'PENDING')
      .reduce((sum, o) => sum + o.totalAmount, 0);
  }, [baseOrdersForUser]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    hapticImpact('light');
    setTimeout(() => {
      setIsRefreshing(false);
      hapticNotification('success');
    }, 700);
  }, []);

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

  const currentStatusObj =
    STATUS_OPTIONS.find((s) => s.id === filter.status) || STATUS_OPTIONS[0];
  const currentCategoryObj =
    CATEGORY_OPTIONS.find((c) => c.id === adminCategory) || CATEGORY_OPTIONS[0];
  const currentStatusCount =
    counts[
      filter.status === 'ALL'
        ? 'all'
        : filter.status === 'PENDING'
        ? 'pending'
        : filter.status === 'IN_TRANSIT'
        ? 'inTransit'
        : filter.status === 'DELIVERED'
        ? 'delivered'
        : 'cancelled'
    ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

      {/* Cabecera con botón de acción contextual (Crear pedido para Admin / Mapa para Distribuidor) */}
      <Header
        title={isDistributor ? 'Mis Entregas' : 'Hoja de Ruta'}
        subtitle={
          isDistributor
            ? user?.specialtyLabel || 'Distribuidor de Agua Purificada'
            : `${displayedOrders.length} despachos listados`
        }
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
        rightActionIcon={isAdmin ? "add-circle" : "map-outline"}
        onRightActionPress={() => {
          hapticSelection();
          if (isAdmin) {
            navigation.navigate('CreateOrderScreen');
          } else {
            navigation.navigate('MapRouteScreen');
          }
        }}
      />

      {/* Barra de KPIs compacta y de un vistazo */}
      <View style={styles.kpiBar}>
        <View style={styles.kpiCol}>
          <Text style={styles.kpiLabel}>Pendientes</Text>
          <Text style={[styles.kpiValue, { color: COLORS.statusPending }]}>
            {counts.pending}
          </Text>
        </View>
        <View style={styles.kpiDivider} />
        <View style={styles.kpiCol}>
          <Text style={styles.kpiLabel}>En Ruta</Text>
          <Text style={[styles.kpiValue, { color: COLORS.statusInTransit }]}>
            {counts.inTransit}
          </Text>
        </View>
        <View style={styles.kpiDivider} />
        <View style={styles.kpiCol}>
          <Text style={styles.kpiLabel}>Entregados</Text>
          <Text style={[styles.kpiValue, { color: COLORS.statusDelivered }]}>
            {counts.delivered}
          </Text>
        </View>
        <View style={styles.kpiDivider} />
        <View style={styles.kpiCol}>
          <Text style={styles.kpiLabel}>Por Cobrar</Text>
          <Text style={[styles.kpiValue, { color: COLORS.textPrimary }]}>
            {formatCurrency(pendingCollection)}
          </Text>
        </View>
      </View>

      {/* Buscador Rápido y Ergonómico */}
      <View style={styles.searchSection}>
        <CustomInput
          value={search}
          onChangeText={handleSearchChange}
          placeholder="Buscar pedido por cliente..."
          icon="search-outline"
          onClear={handleClearSearch}
          containerStyle={{ marginBottom: 0 }}
        />
      </View>

      {/* Barra de Filtros Compacta tipo Combobox (Elimina carruseles horizontales) */}
      <View style={styles.comboboxBar}>
        {/* Píldora 1: Combobox de Estado */}
        <TouchableOpacity
          style={[
            styles.comboboxPill,
            filter.status !== 'ALL' && styles.comboboxPillActive,
          ]}
          onPress={() => {
            hapticSelection();
            setIsStatusModalVisible(true);
          }}
          activeOpacity={0.8}
        >
          <Ionicons
            name={filter.status !== 'ALL' ? 'funnel' : 'funnel-outline'}
            size={13}
            color={filter.status !== 'ALL' ? COLORS.primary : '#64748B'}
          />
          <Text
            style={[
              styles.comboboxPillText,
              filter.status !== 'ALL' && styles.comboboxPillTextActive,
            ]}
            numberOfLines={1}
          >
            {currentStatusObj.shortLabel} ({currentStatusCount})
          </Text>
          <Ionicons
            name="chevron-down"
            size={12}
            color={filter.status !== 'ALL' ? COLORS.primary : '#94A3B8'}
          />
        </TouchableOpacity>

        {/* Píldora 2: Combobox de Rubro (Solo visible para Administrador) */}
        {isAdmin && (
          <TouchableOpacity
            style={[
              styles.comboboxPill,
              adminCategory !== 'ALL' && styles.comboboxPillActive,
            ]}
            onPress={() => {
              hapticSelection();
              setIsCategoryModalVisible(true);
            }}
            activeOpacity={0.8}
          >
            <Ionicons
              name={adminCategory !== 'ALL' ? 'pricetag' : 'pricetag-outline'}
              size={13}
              color={adminCategory !== 'ALL' ? COLORS.primary : '#64748B'}
            />
            <Text
              style={[
                styles.comboboxPillText,
                adminCategory !== 'ALL' && styles.comboboxPillTextActive,
              ]}
              numberOfLines={1}
            >
              {currentCategoryObj.shortLabel}
            </Text>
            <Ionicons
              name="chevron-down"
              size={12}
              color={adminCategory !== 'ALL' ? COLORS.primary : '#94A3B8'}
            />
          </TouchableOpacity>
        )}

        {/* Botón rápido para limpiar filtros si hay alguno activo */}
        {(filter.status !== 'ALL' || (isAdmin && adminCategory !== 'ALL')) && (
          <TouchableOpacity
            style={styles.comboboxClearBtn}
            onPress={() => {
              hapticImpact('light');
              resetFilters();
              setAdminCategory('ALL');
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="close-circle" size={17} color="#64748B" />
          </TouchableOpacity>
        )}
      </View>

      {/* Lista Principal de Pedidos */}
      <FlatList
        data={displayedOrders}
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
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        initialNumToRender={6}
        maxToRenderPerBatch={8}
        windowSize={5}
        removeClippedSubviews={true}
      />

      {/* Floating Dock - Burbujas Flotantes de Navegación */}
      <FloatingBottomDock activeTab="ORDERS" navigation={navigation} />

      {/* MODAL SELECTOR DE ESTADO (COMBOBOX DESPLEGABLE) */}
      <Modal
        visible={isStatusModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsStatusModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.modalDismissArea}
            activeOpacity={1}
            onPress={() => setIsStatusModalVisible(false)}
          />
          <View style={styles.comboboxSheetCard}>
            <View style={styles.comboboxSheetHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="funnel" size={18} color={COLORS.primary} />
                <Text style={styles.comboboxSheetTitle}>Filtrar por Estado de Pedido</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsStatusModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {STATUS_OPTIONS.map((opt) => {
              const isSelected = filter.status === opt.id;
              const countVal = counts[
                opt.id === 'ALL'
                  ? 'all'
                  : opt.id === 'PENDING'
                  ? 'pending'
                  : opt.id === 'IN_TRANSIT'
                  ? 'inTransit'
                  : opt.id === 'DELIVERED'
                  ? 'delivered'
                  : 'cancelled'
              ];

              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[
                    styles.comboboxOptionRow,
                    isSelected && styles.comboboxOptionRowActive,
                  ]}
                  onPress={() => {
                    hapticImpact('light');
                    handleStatusFilterChange(opt.id as any);
                    setIsStatusModalVisible(false);
                  }}
                  activeOpacity={0.75}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                    <Ionicons
                      name={opt.icon as any}
                      size={18}
                      color={isSelected ? COLORS.primary : '#64748B'}
                    />
                    <Text
                      style={[
                        styles.comboboxOptionLabel,
                        isSelected && styles.comboboxOptionLabelActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.comboboxCountBadge,
                      isSelected && styles.comboboxCountBadgeActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.comboboxCountBadgeText,
                        isSelected && styles.comboboxCountBadgeTextActive,
                      ]}
                    >
                      {countVal}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>

      {/* MODAL SELECTOR DE RUBRO (COMBOBOX DESPLEGABLE SOLO ADMIN) */}
      {isAdmin && (
        <Modal
          visible={isCategoryModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsCategoryModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <TouchableOpacity
              style={styles.modalDismissArea}
              activeOpacity={1}
              onPress={() => setIsCategoryModalVisible(false)}
            />
            <View style={styles.comboboxSheetCard}>
              <View style={styles.comboboxSheetHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="pricetag" size={18} color={COLORS.primary} />
                  <Text style={styles.comboboxSheetTitle}>Filtrar por Rubro Especializado</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setIsCategoryModalVisible(false)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              {CATEGORY_OPTIONS.map((cat) => {
                const isSelected = adminCategory === cat.id;
                const catCount =
                  cat.id === 'ALL'
                    ? orders.length
                    : orders.filter((o) => o.category === cat.id).length;

                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.comboboxOptionRow,
                      isSelected && styles.comboboxOptionRowActive,
                    ]}
                    onPress={() => {
                      hapticImpact('light');
                      setAdminCategory(cat.id);
                      setIsCategoryModalVisible(false);
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                      <Ionicons
                        name={cat.icon as any}
                        size={18}
                        color={isSelected ? COLORS.primary : '#64748B'}
                      />
                      <Text
                        style={[
                          styles.comboboxOptionLabel,
                          isSelected && styles.comboboxOptionLabelActive,
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.comboboxCountBadge,
                        isSelected && styles.comboboxCountBadgeActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.comboboxCountBadgeText,
                          isSelected && styles.comboboxCountBadgeTextActive,
                        ]}
                      >
                        {catCount}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </Modal>
      )}
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
    paddingBottom: 115,
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
  comboboxBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 8,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  comboboxPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  comboboxPillActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  comboboxPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748B',
  },
  comboboxPillTextActive: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  comboboxClearBtn: {
    padding: 4,
    borderRadius: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  modalDismissArea: {
    flex: 1,
  },
  comboboxSheetCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 18,
    paddingBottom: Platform.OS === 'ios' ? 34 : 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 16,
  },
  comboboxSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  comboboxSheetTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.secondary,
  },
  comboboxOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 4,
  },
  comboboxOptionRowActive: {
    backgroundColor: '#EFF6FF',
  },
  comboboxOptionLabel: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#334155',
  },
  comboboxOptionLabelActive: {
    fontWeight: '800',
    color: COLORS.primary,
  },
  comboboxCountBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  comboboxCountBadgeActive: {
    backgroundColor: '#DBEAFE',
  },
  comboboxCountBadgeText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#64748B',
  },
  comboboxCountBadgeTextActive: {
    color: COLORS.primary,
  },
});
