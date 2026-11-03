/**
 * ============================================================================
 * SCREEN: WelcomeScreen.tsx
 * Tablero Principal Ejecutivo y Operativo (RBAC: Admin vs Distribuidor)
 * UX Móvil Limpia según Estándares de la Industria (Sin redundancias)
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
import { useAuth } from '../context/AuthContext';
import { useOrders } from '../context/OrderContext';
import { useCustomers } from '../context/CustomerContext';
import { useProducts } from '../context/ProductContext';
import { COLORS, SPACING, RADIUS, TOUCH_TARGET } from '../utils/constants';
import { formatCurrency } from '../utils/formatters';
import { hapticImpact, hapticSelection } from '../utils/haptics';
import { FloatingBottomDock } from '../components/common/FloatingBottomDock';

type Props = NativeStackScreenProps<RootStackParamList, 'WelcomeScreen'>;

export const WelcomeScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const { orders, statistics, clearAllOrders } = useOrders();
  const { customers } = useCustomers();
  const { products } = useProducts();

  const isAdmin = user?.role === 'ADMIN';
  const isDistributor = user?.role === 'DISTRIBUTOR';

  const activeDeliveriesCount = statistics.pendingOrders + statistics.inTransitOrders;

  const handleClearAll = () => {
    Alert.alert(
      'Limpiar Pedidos de la Jornada',
      '¿Deseas reiniciar los pedidos de hoy? Tus clientes y catálogo permanecerán intactos.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, Reiniciar',
          style: 'destructive',
          onPress: () => {
            hapticImpact('heavy');
            clearAllOrders();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* =================================================================== */}
        {/* CABECERA PRINCIPAL: IDENTIDAD Y ACCESO A MI PERFIL */}
        {/* =================================================================== */}
        <View style={styles.topHeader}>
          <View style={styles.brandRow}>
            <View style={styles.logoBadge}>
              <Ionicons name="cube" size={24} color={COLORS.primary} />
            </View>

            <View style={styles.brandTextCol}>
              <View style={styles.appTitleRow}>
                <Text style={styles.appName}>Gestor de Rutas</Text>
                <View
                  style={[
                    styles.roleBadge,
                    isAdmin ? styles.adminRoleBadge : styles.distRoleBadge,
                  ]}
                >
                  <Text
                    style={[
                      styles.roleBadgeText,
                      isAdmin ? styles.adminRoleBadgeText : styles.distRoleBadgeText,
                    ]}
                  >
                    {isAdmin ? 'ADMIN' : 'DISTRIBUIDOR'}
                  </Text>
                </View>
              </View>
              <Text style={styles.appSubtitle} numberOfLines={1}>
                {isAdmin
                  ? `👑 ${user?.name || 'Administrador'} • Tacna Central`
                  : `👨‍✈️ ${user?.name || 'Distribuidor'} • ${user?.vehicleInfo || 'Unidad Asignada'}`}
              </Text>
            </View>

            {/* Acceso Rápido a Mi Perfil (Estándar de UX Móvil) */}
            <TouchableOpacity
              style={styles.headerProfileBtn}
              onPress={() => {
                hapticSelection();
                navigation.navigate('ProfileScreen');
              }}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.headerAvatarCircle,
                  isAdmin ? styles.headerAvatarAdmin : styles.headerAvatarDist,
                ]}
              >
                <Text style={styles.headerAvatarEmoji}>
                  {isAdmin ? '👑' : '👨‍✈️'}
                </Text>
              </View>
              <Text style={styles.headerProfileText}>Mi Perfil</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* =================================================================== */}
        {/* BANNER PRINCIPAL DE ACCIÓN: CONDUCTOR / OPERACIÓN EN RUTA */}
        {/* =================================================================== */}
        {activeDeliveriesCount > 0 ? (
          <View style={styles.activeRouteHeroCard}>
            <View style={styles.activeHeroTop}>
              <View style={styles.activeHeroBadge}>
                <Ionicons name="bicycle" size={14} color="#FFFFFF" />
                <Text style={styles.activeHeroBadgeText}>
                  {isDistributor ? 'TU RUTA ACTIVA' : 'RUTA EN CURSO'}
                </Text>
              </View>
              <Text style={styles.activeHeroProgress}>
                {statistics.deliveredOrders} de {statistics.totalOrders} entregados ({statistics.completedDeliveriesRate}%)
              </Text>
            </View>

            <Text style={styles.activeHeroTitle}>
              {activeDeliveriesCount} {activeDeliveriesCount === 1 ? 'parada pendiente' : 'paradas pendientes'} por entregar
            </Text>
            <Text style={styles.activeHeroDesc}>
              Cobranza en ruta estimada: {formatCurrency(statistics.pendingCollection)}
            </Text>

            <View style={styles.activeHeroButtonsRow}>
              <TouchableOpacity
                style={styles.heroButtonPrimary}
                onPress={() => {
                  hapticImpact('medium');
                  navigation.navigate('MapRouteScreen');
                }}
                activeOpacity={0.88}
              >
                <Ionicons name="navigate" size={18} color="#FFFFFF" />
                <Text style={styles.heroButtonPrimaryText}>Abrir Mapa de Ruta</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.heroButtonSecondary}
                onPress={() => {
                  hapticSelection();
                  navigation.navigate('OrderListScreen');
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="list" size={18} color="#FFFFFF" />
                <Text style={styles.heroButtonSecondaryText}>
                  {isDistributor ? 'Mis Paradas' : 'Ver Lista'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.emptyWelcomeCard}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="rocket-outline" size={26} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.emptyCardTitle}>
                {isAdmin ? '¡Todo Listo para Despachar!' : '¡Sin Paradas Pendientes!'}
              </Text>
              <Text style={styles.emptyCardDesc}>
                {isAdmin
                  ? 'Crea pedidos con clientes registrados para trazar la ruta en el mapa GPS.'
                  : 'No tienes entregas pendientes por el momento. ¡Buen trabajo!'}
              </Text>
            </View>
          </View>
        )}

        {/* =================================================================== */}
        {/* BOTÓN RÁPIDO PARA CREAR PEDIDO (SOLO VISIBLE PARA ADMINISTRADOR) */}
        {/* =================================================================== */}
        {isAdmin && (
          <TouchableOpacity
            style={styles.newOrderActionCard}
            onPress={() => {
              hapticImpact('light');
              navigation.navigate('CreateOrderScreen');
            }}
            activeOpacity={0.88}
          >
            <View style={styles.newOrderIconBox}>
              <Ionicons name="add" size={24} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.newOrderTitle}>Generar Nuevo Pedido</Text>
              <Text style={styles.newOrderSubtitle}>
                Despacho rápido con cliente y productos de Tacna
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        )}

        {/* =================================================================== */}
        {/* TABLERO RESUMEN DE HOY (MÉTRICAS OPERATIVAS) */}
        {/* =================================================================== */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderTitle}>
            {isAdmin ? 'Operación General de Hoy' : 'Tu Desempeño de Hoy'}
          </Text>
          {/* Solo Admin puede reiniciar la jornada */}
          {isAdmin && orders.length > 0 && (
            <TouchableOpacity onPress={handleClearAll} activeOpacity={0.7}>
              <Text style={styles.clearLinkText}>Reiniciar</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiNumber}>{statistics.totalOrders}</Text>
            <Text style={styles.kpiLabel}>Total</Text>
          </View>

          <View style={styles.kpiCard}>
            <Text style={[styles.kpiNumber, { color: COLORS.statusInTransit }]}>
              {statistics.inTransitOrders}
            </Text>
            <Text style={styles.kpiLabel}>En Ruta</Text>
          </View>

          <View style={styles.kpiCard}>
            <Text style={[styles.kpiNumber, { color: COLORS.statusDelivered }]}>
              {statistics.deliveredOrders}
            </Text>
            <Text style={styles.kpiLabel}>Entregados</Text>
          </View>

          <View style={styles.kpiCard}>
            <Text style={[styles.kpiNumber, { color: COLORS.primary }]}>
              {formatCurrency(isAdmin ? statistics.totalRevenue : statistics.pendingCollection)}
            </Text>
            <Text style={styles.kpiLabel}>
              {isAdmin ? 'Recaudado' : 'Por Cobrar'}
            </Text>
          </View>
        </View>

        {/* =================================================================== */}
        {/* ACCIÓN RÁPIDA DE CARGA / MANIFIESTO */}
        {/* =================================================================== */}
        <TouchableOpacity
          style={styles.manifestCard}
          onPress={() => {
            hapticSelection();
            navigation.navigate('RouteSummaryModalOrScreen');
          }}
          activeOpacity={0.8}
        >
          <View style={[styles.manifestIconBox, { backgroundColor: '#F3E8FF' }]}>
            <Ionicons name="clipboard" size={22} color="#7C3AED" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.manifestTitle}>Manifiesto y Carga en Camión</Text>
            <Text style={styles.manifestSubtitle}>
              {isDistributor
                ? 'Control de balones, bidones y envases vacíos a bordo'
                : 'Auditoría física de carga total y envases retornables'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
      </ScrollView>

      {/* Floating Dock - Burbujas Flotantes de Navegación */}
      <FloatingBottomDock activeTab="HOME" navigation={navigation} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingBottom: 95,
  },
  topHeader: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  brandTextCol: {
    flex: 1,
  },
  appTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  appName: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.secondary,
    letterSpacing: -0.2,
  },
  appSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  adminRoleBadge: {
    backgroundColor: '#F3E8FF',
    borderColor: '#DDD6FE',
  },
  distRoleBadge: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  adminRoleBadgeText: {
    color: '#7C3AED',
  },
  distRoleBadgeText: {
    color: COLORS.primary,
  },
  headerProfileBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 4,
  },
  headerAvatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarAdmin: {
    backgroundColor: '#F3E8FF',
    borderWidth: 1.5,
    borderColor: '#C084FC',
  },
  headerAvatarDist: {
    backgroundColor: '#E0F2FE',
    borderWidth: 1.5,
    borderColor: '#38BDF8',
  },
  headerAvatarEmoji: {
    fontSize: 20,
  },
  headerProfileText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  /* Hero de Ruta Activa */
  activeRouteHeroCard: {
    backgroundColor: COLORS.secondary,
    marginHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginTop: SPACING.lg,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  activeHeroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  activeHeroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    gap: 4,
  },
  activeHeroBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  activeHeroProgress: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  activeHeroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  activeHeroDesc: {
    fontSize: 13,
    color: '#CBD5E1',
    marginTop: 4,
    marginBottom: 14,
  },
  activeHeroButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  heroButtonPrimary: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    gap: 6,
  },
  heroButtonPrimaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  heroButtonSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    gap: 6,
  },
  heroButtonSecondaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyWelcomeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F7FF',
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    gap: 12,
  },
  emptyIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primary,
  },
  emptyCardDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  /* Botón Nuevo Pedido */
  newOrderActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1.5,
    borderColor: COLORS.primaryLight,
    gap: 12,
    elevation: 2,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  newOrderIconBox: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newOrderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  newOrderSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  /* KPIs de Hoy */
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.xl,
    marginBottom: SPACING.sm,
  },
  sectionHeaderTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  clearLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.danger,
  },
  kpiGrid: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    gap: 8,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  kpiNumber: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  /* Manifiesto de Carga Directo */
  manifestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  manifestIconBox: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manifestTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  manifestSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 15,
  },
});
