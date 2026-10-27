/**
 * ============================================================================
 * SCREEN: WelcomeScreen.tsx
 * Dashboard Principal: Tema Claro Premium con Emojis Vivos y Tarjetas Ergonómicas
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
      '¿Deseas vaciar los pedidos de la jornada actual? Tus clientes y catálogo de productos se mantendrán intactos.',
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

  const activeDeliveriesCount = statistics.pendingOrders + statistics.inTransitOrders;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* =================================================================== */}
        {/* CABECERA PRINCIPAL CON VIDA Y EMOJIS */}
        {/* =================================================================== */}
        <View style={styles.topHeader}>
          <View style={styles.brandRow}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoEmoji}>🚚</Text>
            </View>

            <View style={styles.brandTextCol}>
              <View style={styles.appTitleRow}>
                <Text style={styles.appName}>Gestor de Rutas</Text>
                <View style={styles.onlineBadge}>
                  <View style={styles.onlineDot} />
                  <Text style={styles.onlineText}>En Línea</Text>
                </View>
              </View>
              <Text style={styles.appSubtitle}>
                Logística, Clientes y Despachos en Vivo 📍
              </Text>
            </View>
          </View>

          {/* Barra de Resumen Superior con Emojis */}
          <View style={styles.metricsPillsRow}>
            <TouchableOpacity
              style={styles.metricPill}
              onPress={() => navigation.navigate('CustomerListScreen')}
              activeOpacity={0.7}
            >
              <Text style={styles.pillEmoji}>👥</Text>
              <Text style={styles.metricPillNumber}>{customers.length}</Text>
              <Text style={styles.metricPillLabel}>Clientes</Text>
            </TouchableOpacity>

            <View style={styles.metricPillDivider} />

            <TouchableOpacity
              style={styles.metricPill}
              onPress={() => navigation.navigate('ProductListScreen')}
              activeOpacity={0.7}
            >
              <Text style={styles.pillEmoji}>🏷️</Text>
              <Text style={styles.metricPillNumber}>{products.length}</Text>
              <Text style={styles.metricPillLabel}>Productos</Text>
            </TouchableOpacity>

            <View style={styles.metricPillDivider} />

            <TouchableOpacity
              style={styles.metricPill}
              onPress={() => navigation.navigate('OrderListScreen')}
              activeOpacity={0.7}
            >
              <Text style={styles.pillEmoji}>📦</Text>
              <Text style={styles.metricPillNumber}>{orders.length}</Text>
              <Text style={styles.metricPillLabel}>En Cola</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* =================================================================== */}
        {/* MÉTRICAS DE OPERACIÓN DEL DÍA */}
        {/* =================================================================== */}
        {orders.length > 0 ? (
          <View style={styles.statsCard}>
            <View style={styles.statsHeader}>
              <View style={styles.statsTitleRow}>
                <Text style={styles.headerIconEmoji}>📊</Text>
                <Text style={styles.statsTitle}>Operación de Hoy</Text>
              </View>

              <View style={styles.effectivityPill}>
                <Text style={{ fontSize: 13 }}>🎯</Text>
                <Text style={styles.effectivityText}>
                  {statistics.completedDeliveriesRate}% Efectividad
                </Text>
              </View>
            </View>

            <View style={styles.statsValuesGrid}>
              <View style={styles.statCol}>
                <Text style={styles.statLargeNumber}>{statistics.totalOrders}</Text>
                <View style={styles.statSubRow}>
                  <Text style={styles.statMiniEmoji}>📦</Text>
                  <Text style={styles.statLabelText}>Total Pedidos</Text>
                </View>
              </View>

              <View style={styles.statColDivider} />

              <View style={styles.statCol}>
                <Text style={[styles.statLargeNumber, { color: COLORS.statusInTransit }]}>
                  {statistics.inTransitOrders}
                </Text>
                <View style={styles.statSubRow}>
                  <Text style={styles.statMiniEmoji}>🚚</Text>
                  <Text style={styles.statLabelText}>En Ruta</Text>
                </View>
              </View>

              <View style={styles.statColDivider} />

              <View style={styles.statCol}>
                <Text style={[styles.statLargeNumber, { color: COLORS.statusDelivered }]}>
                  {statistics.deliveredOrders}
                </Text>
                <View style={styles.statSubRow}>
                  <Text style={styles.statMiniEmoji}>✅</Text>
                  <Text style={styles.statLabelText}>Entregados</Text>
                </View>
              </View>
            </View>

            {/* Fila de Recaudación */}
            <View style={styles.revenueRow}>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={{ fontSize: 13 }}>💰</Text>
                  <Text style={styles.revenueCaption}>Cobranza Prevista</Text>
                </View>
                <Text style={styles.revenueAmount}>
                  {formatCurrency(statistics.pendingCollection + statistics.totalRevenue)}
                </Text>
              </View>

              <View style={styles.pendingCollectionBox}>
                <Text style={styles.pendingCollectionLabel}>Pendiente en Ruta:</Text>
                <Text style={styles.pendingCollectionValue}>
                  {formatCurrency(statistics.pendingCollection)}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          /* Estado inicial amigable cuando aún no hay pedidos cargados */
          <View style={styles.emptyWelcomeCard}>
            <View style={styles.emptyIconCircle}>
              <Text style={{ fontSize: 26 }}>✨</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.emptyCardTitle}>¡Listo para Despachar! 🚀</Text>
              <Text style={styles.emptyCardDesc}>
                Crea tu primer pedido con un cliente registrado para trazar la ruta en el mapa GPS.
              </Text>
            </View>
          </View>
        )}

        {/* =================================================================== */}
        {/* ACCIONES PRINCIPALES DESTACADAS */}
        {/* =================================================================== */}
        <View style={styles.sectionTitleWrapper}>
          <Text style={styles.sectionHeaderTitle}>⚡ Acciones Rápidas</Text>
        </View>

        <View style={styles.actionsContainer}>
          {/* Botón Hero: Generar Nuevo Pedido */}
          <TouchableOpacity
            style={styles.heroButton}
            onPress={() => navigation.navigate('CreateOrderScreen')}
            activeOpacity={0.88}
          >
            <View style={styles.heroIconCircle}>
              <Text style={styles.heroEmoji}>➕</Text>
            </View>

            <View style={styles.heroTextCol}>
              <View style={styles.heroBadgeRow}>
                <Text style={styles.heroTitle}>Generar Nuevo Pedido</Text>
                <View style={styles.heroTag}>
                  <Text style={styles.heroTagText}>Rápido ⚡</Text>
                </View>
              </View>
              <Text style={styles.heroSubtitle}>
                Elige un cliente para autocompletar su dirección, GPS y productos
              </Text>
            </View>

            <Ionicons name="chevron-forward" size={20} color={COLORS.textInverse} />
          </TouchableOpacity>

          {/* Botón Secundario: Mapa de Rutas GPS */}
          <TouchableOpacity
            style={styles.mapActionButton}
            onPress={() => navigation.navigate('MapRouteScreen')}
            activeOpacity={0.8}
          >
            <View style={styles.mapIconCircle}>
              <Text style={{ fontSize: 24 }}>🗺️</Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.mapActionTitle}>Mapa de Rutas (GPS)</Text>
              <Text style={styles.mapActionSubtitle}>
                {activeDeliveriesCount > 0
                  ? `${activeDeliveriesCount} paradas geolocalizadas listas para entrega 📍`
                  : 'Navegación visual interactiva en tiempo real'}
              </Text>
            </View>

            <View style={styles.mapActionEnd}>
              {activeDeliveriesCount > 0 && (
                <View style={styles.activeRoutePill}>
                  <Text style={styles.activeRouteText}>{activeDeliveriesCount}</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
            </View>
          </TouchableOpacity>
        </View>

        {/* =================================================================== */}
        {/* GESTIÓN OPERATIVA: FILAS RECTANGULARES ERGONÓMICAS CON EMOJIS */}
        {/* =================================================================== */}
        <View style={styles.sectionTitleWrapper}>
          <Text style={styles.sectionHeaderTitle}>🗂️ Gestión Operativa</Text>
          <Text style={styles.sectionHeaderSubtitle}>Módulos y Catálogos</Text>
        </View>

        <View style={styles.modulesContainer}>
          {/* Fila 1: Mis Clientes */}
          <TouchableOpacity
            style={styles.moduleRowCard}
            onPress={() => navigation.navigate('CustomerListScreen')}
            activeOpacity={0.7}
          >
            <View style={[styles.moduleIconBox, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
              <Text style={styles.moduleEmoji}>👥</Text>
            </View>

            <View style={styles.moduleTextCol}>
              <Text style={styles.moduleTitle}>Mis Clientes</Text>
              <Text style={styles.moduleSubtitle}>
                Directorio, teléfonos de contacto y puntos GPS fijados 📍
              </Text>
            </View>

            <View style={styles.moduleEndCol}>
              <View style={[styles.moduleCountBadge, { backgroundColor: '#EFF6FF' }]}>
                <Text style={[styles.moduleCountText, { color: COLORS.primary }]}>
                  {customers.length}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
            </View>
          </TouchableOpacity>

          {/* Fila 2: Mis Productos */}
          <TouchableOpacity
            style={styles.moduleRowCard}
            onPress={() => navigation.navigate('ProductListScreen')}
            activeOpacity={0.7}
          >
            <View style={[styles.moduleIconBox, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
              <Text style={styles.moduleEmoji}>🏷️</Text>
            </View>

            <View style={styles.moduleTextCol}>
              <Text style={styles.moduleTitle}>Mis Productos y Servicios</Text>
              <Text style={styles.moduleSubtitle}>
                Catálogo de precios y unidades de venta para pedidos 🛒
              </Text>
            </View>

            <View style={styles.moduleEndCol}>
              <View style={[styles.moduleCountBadge, { backgroundColor: '#FEF3C7' }]}>
                <Text style={[styles.moduleCountText, { color: '#B45309' }]}>
                  {products.length}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
            </View>
          </TouchableOpacity>

          {/* Fila 3: Lista de Pedidos */}
          <TouchableOpacity
            style={styles.moduleRowCard}
            onPress={() => navigation.navigate('OrderListScreen')}
            activeOpacity={0.7}
          >
            <View style={[styles.moduleIconBox, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
              <Text style={styles.moduleEmoji}>📦</Text>
            </View>

            <View style={styles.moduleTextCol}>
              <Text style={styles.moduleTitle}>Lista de Pedidos</Text>
              <Text style={styles.moduleSubtitle}>
                Control por estado, cobro en ruta y trazabilidad ⏱️
              </Text>
            </View>

            <View style={styles.moduleEndCol}>
              <View style={[styles.moduleCountBadge, { backgroundColor: '#ECFDF5' }]}>
                <Text style={[styles.moduleCountText, { color: '#065F46' }]}>
                  {orders.length}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
            </View>
          </TouchableOpacity>

          {/* Fila 4: Hoja de Carga */}
          <TouchableOpacity
            style={styles.moduleRowCard}
            onPress={() => navigation.navigate('RouteSummaryModalOrScreen')}
            activeOpacity={0.7}
          >
            <View style={[styles.moduleIconBox, { backgroundColor: '#F3E8FF', borderColor: '#DDD6FE' }]}>
              <Text style={styles.moduleEmoji}>🚚</Text>
            </View>

            <View style={styles.moduleTextCol}>
              <Text style={styles.moduleTitle}>Hoja de Carga del Vehículo</Text>
              <Text style={styles.moduleSubtitle}>
                Consolidado de mercadería para cargar la unidad 📋
              </Text>
            </View>

            <View style={styles.moduleEndCol}>
              <View style={[styles.moduleCountBadge, { backgroundColor: '#F3E8FF' }]}>
                <Text style={[styles.moduleCountText, { color: '#7C3AED' }]}>
                  Carga
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
            </View>
          </TouchableOpacity>
        </View>

        {/* =================================================================== */}
        {/* BOTÓN INFERIOR: VACIAR PEDIDOS DE LA JORNADA */}
        {/* =================================================================== */}
        {orders.length > 0 && (
          <TouchableOpacity
            style={styles.clearOrdersButton}
            onPress={handleClearAll}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={15} color={COLORS.danger} />
            <Text style={styles.clearOrdersText}>
              Vaciar pedidos de la jornada actual
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  /* Cabecera Superior */
  topHeader: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  logoEmoji: {
    fontSize: 26,
  },
  brandTextCol: {
    flex: 1,
  },
  appTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  appName: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.secondary,
    letterSpacing: -0.3,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success,
  },
  onlineText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#065F46',
  },
  appSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  metricsPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'space-around',
  },
  metricPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 6,
  },
  pillEmoji: {
    fontSize: 15,
  },
  metricPillNumber: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  metricPillLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  metricPillDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#CBD5E1',
  },
  /* Tarjeta de Métricas Operativas */
  statsCard: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerIconEmoji: {
    fontSize: 16,
  },
  statsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.secondary,
  },
  effectivityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  effectivityText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  statsValuesGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statLargeNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  statSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  statMiniEmoji: {
    fontSize: 11,
  },
  statLabelText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  statColDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#F1F5F9',
  },
  revenueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  revenueCaption: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  revenueAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  pendingCollectionBox: {
    alignItems: 'flex-end',
  },
  pendingCollectionLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  pendingCollectionValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 1,
  },
  emptyWelcomeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#F0F7FF',
    gap: 12,
  },
  emptyIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  emptyCardDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  /* Títulos de Sección */
  sectionTitleWrapper: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    marginTop: 22,
    marginBottom: 10,
  },
  sectionHeaderTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sectionHeaderSubtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  /* Acciones Rápidas */
  actionsContainer: {
    paddingHorizontal: 16,
    gap: 10,
  },
  heroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 16,
    gap: 14,
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  heroIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroEmoji: {
    fontSize: 22,
    fontWeight: '800',
  },
  heroTextCol: {
    flex: 1,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textInverse,
  },
  heroTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  heroTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.textInverse,
    textTransform: 'uppercase',
  },
  heroSubtitle: {
    fontSize: 11,
    color: '#DBEAFE',
    marginTop: 2,
    lineHeight: 15,
  },
  mapActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  mapIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  mapActionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  mapActionSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  mapActionEnd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activeRoutePill: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  activeRouteText: {
    color: COLORS.textInverse,
    fontSize: 11,
    fontWeight: '800',
  },
  /* Filas Rectangulares de Gestión Operativa */
  modulesContainer: {
    paddingHorizontal: 16,
    gap: 10,
  },
  moduleRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    gap: 12,
  },
  moduleIconBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  moduleEmoji: {
    fontSize: 22,
  },
  moduleTextCol: {
    flex: 1,
  },
  moduleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  moduleSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 15,
  },
  moduleEndCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  moduleCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  moduleCountText: {
    fontSize: 11,
    fontWeight: '800',
  },
  /* Botón de Vaciar */
  clearOrdersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 6,
    marginTop: 16,
  },
  clearOrdersText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.danger,
  },
});
