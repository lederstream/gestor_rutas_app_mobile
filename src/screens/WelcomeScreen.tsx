/**
 * ============================================================================
 * SCREEN: WelcomeScreen.tsx
 * Dashboard Principal: Gestión Integral de Rutas, Clientes, Productos y Pedidos
 * ============================================================================
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/RootNavigator';
import { useOrders } from '../context/OrderContext';
import { useCustomers } from '../context/CustomerContext';
import { useProducts } from '../context/ProductContext';
import { COLORS } from '../utils/constants';
import { formatCurrency } from '../utils/formatters';

type Props = NativeStackScreenProps<RootStackParamList, 'WelcomeScreen'>;

export const WelcomeScreen: React.FC<Props> = ({ navigation }) => {
  const { orders, statistics, clearAllOrders } = useOrders();
  const { customers } = useCustomers();
  const { products } = useProducts();

  const handleClearAll = () => {
    Alert.alert(
      'Limpiar Lista de Pedidos',
      '¿Deseas vaciar la lista de pedidos en ruta? Los clientes y productos se mantendrán a salvo.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, Vaciar Pedidos',
          style: 'destructive',
          onPress: () => clearAllOrders(),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.secondary} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Encabezado Principal */}
        <View style={styles.heroBanner}>
          <View style={styles.brandRow}>
            <View style={styles.logoBadge}>
              <Ionicons name="navigate" size={28} color={COLORS.primary} />
            </View>
            <View style={styles.brandTextCol}>
              <Text style={styles.heroTitle}>Gestor de Rutas</Text>
              <Text style={styles.heroSubtitle}>Sistema de Logística y Despachos</Text>
            </View>
          </View>

          {/* Mini-Badges de Inventario & Contactos */}
          <View style={styles.topStatsRow}>
            <View style={styles.topStatItem}>
              <Ionicons name="people-outline" size={14} color={COLORS.accent} />
              <Text style={styles.topStatText}>{customers.length} Clientes</Text>
            </View>
            <View style={styles.topStatDivider} />
            <View style={styles.topStatItem}>
              <Ionicons name="cube-outline" size={14} color={COLORS.accent} />
              <Text style={styles.topStatText}>{products.length} Productos</Text>
            </View>
            <View style={styles.topStatDivider} />
            <View style={styles.topStatItem}>
              <Ionicons name="bicycle-outline" size={14} color={COLORS.accent} />
              <Text style={styles.topStatText}>{orders.length} En Cola</Text>
            </View>
          </View>
        </View>

        {/* Acciones Rápidas Destacadas */}
        <View style={styles.quickActionsContainer}>
          <TouchableOpacity
            style={styles.primaryActionBtn}
            onPress={() => navigation.navigate('CreateOrderScreen')}
            activeOpacity={0.85}
          >
            <View style={styles.primaryActionIconBox}>
              <Ionicons name="add" size={26} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.primaryActionTitle}>Generar Nuevo Pedido</Text>
              <Text style={styles.primaryActionSubtitle}>
                Elige un cliente para autocompletar su dirección y productos
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textInverse} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryActionBtn}
            onPress={() => navigation.navigate('MapRouteScreen')}
            activeOpacity={0.85}
          >
            <View style={styles.secondaryActionIconBox}>
              <Ionicons name="map-outline" size={22} color={COLORS.textInverse} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.secondaryActionTitle}>Mapa de Rutas (GPS)</Text>
              <Text style={styles.secondaryActionSubtitle}>
                {statistics.pendingOrders + statistics.inTransitOrders > 0
                  ? `${statistics.pendingOrders + statistics.inTransitOrders} entregas activas geolocalizadas`
                  : 'Navegación visual interactiva en tiempo real'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Grid de Secciones de Gestión Operativa */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Gestión Operativa</Text>
        </View>

        <View style={styles.gridContainer}>
          {/* Tarjeta: Mis Clientes */}
          <TouchableOpacity
            style={styles.gridCard}
            onPress={() => navigation.navigate('CustomerListScreen')}
            activeOpacity={0.7}
          >
            <View style={styles.gridCardTop}>
              <View style={[styles.gridIconCircle, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="people" size={22} color={COLORS.primary} />
              </View>
              <View style={styles.gridCountBadge}>
                <Text style={styles.gridCountText}>{customers.length}</Text>
              </View>
            </View>
            <Text style={styles.gridCardTitle}>Mis Clientes</Text>
            <Text style={styles.gridCardDesc}>Directorio, teléfonos y puntos GPS fijados</Text>
          </TouchableOpacity>

          {/* Tarjeta: Mis Productos */}
          <TouchableOpacity
            style={styles.gridCard}
            onPress={() => navigation.navigate('ProductListScreen')}
            activeOpacity={0.7}
          >
            <View style={styles.gridCardTop}>
              <View style={[styles.gridIconCircle, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="cube" size={22} color="#D97706" />
              </View>
              <View style={[styles.gridCountBadge, { backgroundColor: '#FEF3C7' }]}>
                <Text style={[styles.gridCountText, { color: '#B45309' }]}>
                  {products.length}
                </Text>
              </View>
            </View>
            <Text style={styles.gridCardTitle}>Mis Productos</Text>
            <Text style={styles.gridCardDesc}>Catálogo de precios y unidades para venta</Text>
          </TouchableOpacity>

          {/* Tarjeta: Lista de Pedidos */}
          <TouchableOpacity
            style={styles.gridCard}
            onPress={() => navigation.navigate('OrderListScreen')}
            activeOpacity={0.7}
          >
            <View style={styles.gridCardTop}>
              <View style={[styles.gridIconCircle, { backgroundColor: '#ECFDF5' }]}>
                <Ionicons name="list" size={22} color={COLORS.success} />
              </View>
              <View style={[styles.gridCountBadge, { backgroundColor: '#ECFDF5' }]}>
                <Text style={[styles.gridCountText, { color: '#065F46' }]}>
                  {orders.length}
                </Text>
              </View>
            </View>
            <Text style={styles.gridCardTitle}>Lista de Pedidos</Text>
            <Text style={styles.gridCardDesc}>Filtros por estado, prioridad y cobro en ruta</Text>
          </TouchableOpacity>

          {/* Tarjeta: Hoja de Carga */}
          <TouchableOpacity
            style={styles.gridCard}
            onPress={() => navigation.navigate('RouteSummaryModalOrScreen')}
            activeOpacity={0.7}
          >
            <View style={styles.gridCardTop}>
              <View style={[styles.gridIconCircle, { backgroundColor: '#F1F5F9' }]}>
                <Ionicons name="clipboard-outline" size={22} color={COLORS.secondary} />
              </View>
              <View style={styles.gridCountBadge}>
                <Ionicons name="car-outline" size={13} color={COLORS.textSecondary} />
              </View>
            </View>
            <Text style={styles.gridCardTitle}>Hoja de Carga</Text>
            <Text style={styles.gridCardDesc}>Totales consolidados para cargar el vehículo</Text>
          </TouchableOpacity>
        </View>

        {/* Métricas del Día (si hay pedidos) */}
        {orders.length > 0 && (
          <View style={styles.metricsCard}>
            <View style={styles.metricsHeader}>
              <View style={styles.metricsTitleRow}>
                <Ionicons name="pulse" size={18} color={COLORS.primary} />
                <Text style={styles.metricsTitle}>Operación del Día</Text>
              </View>
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>En Marcha</Text>
              </View>
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{statistics.totalOrders}</Text>
                <Text style={styles.statLabel}>Total Pedidos</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={[styles.statValue, { color: COLORS.statusInTransit }]}>
                  {statistics.inTransitOrders}
                </Text>
                <Text style={styles.statLabel}>En Ruta</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={[styles.statValue, { color: COLORS.statusDelivered }]}>
                  {statistics.deliveredOrders}
                </Text>
                <Text style={styles.statLabel}>Entregados</Text>
              </View>
            </View>

            <View style={styles.revenueRow}>
              <View>
                <Text style={styles.revenueCaption}>Cobranza Total Prevista</Text>
                <Text style={styles.revenueValue}>
                  {formatCurrency(statistics.pendingCollection + statistics.totalRevenue)}
                </Text>
              </View>
              <View style={styles.ratePill}>
                <Ionicons name="speedometer-outline" size={14} color={COLORS.success} />
                <Text style={styles.rateText}>
                  {statistics.completedDeliveriesRate}% Efectividad
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Botón de vaciar pedidos */}
        {orders.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClearAll}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={14} color={COLORS.danger} />
            <Text style={styles.clearButtonText}>Vaciar pedidos de la jornada</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.secondary,
  },
  scrollContent: {
    paddingBottom: 36,
  },
  heroBanner: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    backgroundColor: COLORS.secondary,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  logoBadge: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(56, 189, 248, 0.4)',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  brandTextCol: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textInverse,
  },
  heroSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  topStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 16,
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  topStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  topStatText: {
    fontSize: 12,
    color: COLORS.accent,
    fontWeight: '700',
  },
  topStatDivider: {
    width: 1,
    height: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  quickActionsContainer: {
    paddingHorizontal: 16,
    marginTop: 12,
    gap: 10,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 16,
    gap: 14,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryActionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.textInverse,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textInverse,
  },
  primaryActionSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
    lineHeight: 16,
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  secondaryActionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textInverse,
  },
  secondaryActionSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  sectionHeaderRow: {
    paddingHorizontal: 18,
    marginTop: 22,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 10,
  },
  gridCard: {
    width: '48%',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  gridCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  gridIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridCountBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  gridCountText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primary,
  },
  gridCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.secondary,
    marginBottom: 4,
  },
  gridCardDesc: {
    fontSize: 11,
    color: COLORS.textSecondary,
    lineHeight: 15,
  },
  metricsCard: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    marginTop: 20,
  },
  metricsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  metricsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.secondary,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#065F46',
  },
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#F1F5F9',
  },
  revenueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  revenueCaption: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  revenueValue: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  ratePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  rateText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    marginTop: 16,
  },
  clearButtonText: {
    fontSize: 12,
    color: COLORS.danger,
    fontWeight: '700',
  },
});
