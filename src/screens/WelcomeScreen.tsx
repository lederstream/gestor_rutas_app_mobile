/**
 * ============================================================================
 * SCREEN: WelcomeScreen.tsx
 * Tablero Principal Ejecutivo: Máxima Claridad Visual y Acceso Rápido
 * ============================================================================
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  Modal,
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

type Props = NativeStackScreenProps<RootStackParamList, 'WelcomeScreen'>;

export const WelcomeScreen: React.FC<Props> = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { orders, statistics, clearAllOrders } = useOrders();
  const { customers } = useCustomers();
  const { products } = useProducts();

  const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false);

  const activeDeliveriesCount = statistics.pendingOrders + statistics.inTransitOrders;

  const handleOpenLogout = () => {
    hapticImpact('light');
    setIsLogoutModalVisible(true);
  };

  const handleConfirmLogout = async () => {
    setIsLogoutModalVisible(false);
    await logout();
  };

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
        {/* CABECERA PRINCIPAL: IDENTIDAD Y SALIDA SEGURA */}
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
                    user?.role === 'ADMIN' && styles.adminRoleBadge,
                  ]}
                >
                  <Text
                    style={[
                      styles.roleBadgeText,
                      user?.role === 'ADMIN' && styles.adminRoleBadgeText,
                    ]}
                  >
                    {user?.role === 'ADMIN' ? 'ADMIN' : 'DISTRIBUIDOR'}
                  </Text>
                </View>
              </View>
              <Text style={styles.appSubtitle} numberOfLines={1}>
                {user?.role === 'ADMIN'
                  ? `👑 ${user?.name || 'Administrador General'}`
                  : `👨‍✈️ ${user?.name || 'Distribuidor'} • ${user?.vehicleInfo || 'Unidad Asignada'}`}
              </Text>
            </View>

            <View style={styles.topHeaderActions}>
              <TouchableOpacity
                style={styles.headerLogoutBtn}
                onPress={handleOpenLogout}
                activeOpacity={0.75}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="log-out-outline" size={16} color={COLORS.danger} />
                <Text style={styles.headerLogoutText}>Salir</Text>
              </TouchableOpacity>
            </View>
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
                <Text style={styles.activeHeroBadgeText}>RUTA EN CURSO</Text>
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
                <Text style={styles.heroButtonSecondaryText}>Ver Lista</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.emptyWelcomeCard}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="rocket-outline" size={26} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.emptyCardTitle}>¡Todo Listo para Despachar!</Text>
              <Text style={styles.emptyCardDesc}>
                Crea tu primer pedido con un cliente registrado para trazar la ruta en el mapa GPS.
              </Text>
            </View>
          </View>
        )}

        {/* =================================================================== */}
        {/* BOTÓN RÁPIDO PARA CREAR PEDIDO (DESTACADO Y ERGONÓMICO) */}
        {/* =================================================================== */}
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
              Asistente rápido en 3 pasos con autocompletado
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
        </TouchableOpacity>

        {/* =================================================================== */}
        {/* TABLERO RESUMEN DE HOY (MÉTRICAS CLARAS, SIN SATURACIÓN) */}
        {/* =================================================================== */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderTitle}>Operación de Hoy</Text>
          {orders.length > 0 && (
            <TouchableOpacity onPress={handleClearAll} activeOpacity={0.7}>
              <Text style={styles.clearLinkText}>Reiniciar</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiNumber}>{statistics.totalOrders}</Text>
            <Text style={styles.kpiLabel}>Total Pedidos</Text>
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
              {formatCurrency(statistics.totalRevenue)}
            </Text>
            <Text style={styles.kpiLabel}>Recaudado</Text>
          </View>
        </View>

        {/* =================================================================== */}
        {/* MÓDULOS OPERATIVOS (TARJETAS AMPLIAS DE FÁCIL TOQUE) */}
        {/* =================================================================== */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderTitle}>Módulos y Catálogos</Text>
        </View>

        <View style={styles.modulesContainer}>
          {/* Módulo Clientes */}
          <TouchableOpacity
            style={styles.moduleRowCard}
            onPress={() => {
              hapticSelection();
              navigation.navigate('CustomerListScreen');
            }}
            activeOpacity={0.75}
          >
            <View style={[styles.moduleIconBox, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="people" size={22} color={COLORS.primary} />
            </View>
            <View style={styles.moduleTextCol}>
              <Text style={styles.moduleTitle}>Mis Clientes</Text>
              <Text style={styles.moduleSubtitle}>
                Directorio con WhatsApp y puntos GPS fijados
              </Text>
            </View>
            <View style={styles.moduleEndBox}>
              <Text style={styles.moduleCountBadge}>{customers.length}</Text>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
            </View>
          </TouchableOpacity>

          {/* Módulo Productos */}
          <TouchableOpacity
            style={styles.moduleRowCard}
            onPress={() => {
              hapticSelection();
              navigation.navigate('ProductListScreen');
            }}
            activeOpacity={0.75}
          >
            <View style={[styles.moduleIconBox, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="pricetags" size={22} color="#D97706" />
            </View>
            <View style={styles.moduleTextCol}>
              <Text style={styles.moduleTitle}>Catálogo de Productos</Text>
              <Text style={styles.moduleSubtitle}>
                Precios y unidades de venta para carga
              </Text>
            </View>
            <View style={styles.moduleEndBox}>
              <Text style={[styles.moduleCountBadge, { color: '#B45309', backgroundColor: '#FEF3C7' }]}>
                {products.length}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
            </View>
          </TouchableOpacity>

          {/* Módulo Hoja de Ruta */}
          <TouchableOpacity
            style={styles.moduleRowCard}
            onPress={() => {
              hapticSelection();
              navigation.navigate('RouteSummaryModalOrScreen');
            }}
            activeOpacity={0.75}
          >
            <View style={[styles.moduleIconBox, { backgroundColor: '#F3E8FF' }]}>
              <Ionicons name="clipboard" size={22} color="#7C3AED" />
            </View>
            <View style={styles.moduleTextCol}>
              <Text style={styles.moduleTitle}>Manifiesto y Carga</Text>
              <Text style={styles.moduleSubtitle}>
                Consolidado en bodega móvil y arqueo de caja
              </Text>
            </View>
            <View style={styles.moduleEndBox}>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
            </View>
          </TouchableOpacity>
        </View>

        {/* =================================================================== */}
        {/* TARJETA DE USUARIO Y CIERRE DE SESIÓN AL PIE DE PÁGINA */}
        {/* =================================================================== */}
        <View style={styles.userSessionCard}>
          <View style={styles.userSessionRow}>
            <View style={styles.userAvatarBox}>
              <Text style={{ fontSize: 24 }}>
                {user?.role === 'ADMIN' ? '👑' : '👨‍✈️'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.userSessionName}>{user?.name || 'Usuario'}</Text>
                <View
                  style={[
                    styles.rolePill,
                    user?.role === 'ADMIN' ? styles.rolePillAdmin : styles.rolePillDist,
                  ]}
                >
                  <Text style={styles.rolePillText}>
                    {user?.role === 'ADMIN' ? 'Admin' : 'Distribuidor'}
                  </Text>
                </View>
              </View>
              <Text style={styles.userSessionContact}>
                {user?.email || user?.username || 'Cuenta corporativa'} • Tel: {user?.phone || 'N/A'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.sessionLogoutButton}
            onPress={handleOpenLogout}
            activeOpacity={0.85}
          >
            <Ionicons name="log-out-outline" size={18} color={COLORS.danger} />
            <Text style={styles.sessionLogoutButtonText}>Cerrar Sesión del Sistema</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal Seguro de Confirmación de Cierre de Sesión */}
      <Modal
        visible={isLogoutModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsLogoutModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.logoutModalCard}>
            <View style={styles.logoutModalIconBox}>
              <Ionicons name="log-out-outline" size={32} color={COLORS.danger} />
            </View>
            <Text style={styles.logoutModalTitle}>¿Cerrar Sesión?</Text>
            <Text style={styles.logoutModalDesc}>
              Saldrás de la cuenta de {user?.name || 'usuario'}. Para volver a acceder deberás ingresar tus credenciales.
            </Text>

            <View style={styles.logoutModalButtonsCol}>
              <TouchableOpacity
                style={styles.confirmLogoutBtn}
                onPress={handleConfirmLogout}
                activeOpacity={0.88}
              >
                <Ionicons name="log-out" size={18} color="#FFFFFF" />
                <Text style={styles.confirmLogoutBtnText}>Sí, Cerrar Sesión</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelLogoutBtn}
                onPress={() => setIsLogoutModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelLogoutBtnText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    justifyContent: 'space-between',
  },
  appName: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.secondary,
    letterSpacing: -0.2,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
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
  roleBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  adminRoleBadge: {
    backgroundColor: '#F3E8FF',
    borderColor: '#DDD6FE',
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  adminRoleBadgeText: {
    color: '#7C3AED',
  },
  topHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 6,
  },
  headerLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    gap: 4,
    borderWidth: 1,
    borderColor: '#FECACA',
    minHeight: 38,
  },
  headerLogoutText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.danger,
  },
  /* Tarjeta de Sesión al Pie */
  userSessionCard: {
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.xl,
    marginBottom: SPACING.lg,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  userSessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: SPACING.md,
  },
  userAvatarBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  userSessionName: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  userSessionContact: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  rolePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  rolePillDist: {
    backgroundColor: '#EFF6FF',
  },
  rolePillAdmin: {
    backgroundColor: '#F3E8FF',
  },
  rolePillText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },
  sessionLogoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: RADIUS.md,
    height: TOUCH_TARGET.buttonHeight,
    borderWidth: 1,
    borderColor: '#FECACA',
    gap: 8,
  },
  sessionLogoutButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.danger,
  },
  /* Modal de Cierre de Sesión */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  logoutModalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  logoutModalIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  logoutModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  logoutModalDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  logoutModalButtonsCol: {
    width: '100%',
    gap: 10,
  },
  confirmLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.danger,
    borderRadius: RADIUS.md,
    height: TOUCH_TARGET.buttonHeight,
    gap: 8,
  },
  confirmLogoutBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  cancelLogoutBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: RADIUS.md,
  },
  cancelLogoutBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
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
  /* Módulos */
  modulesContainer: {
    paddingHorizontal: SPACING.lg,
    gap: 10,
  },
  moduleRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  moduleIconBox: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleTextCol: {
    flex: 1,
  },
  moduleTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  moduleSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 15,
  },
  moduleEndBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  moduleCountBadge: {
    backgroundColor: '#EFF6FF',
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
});
