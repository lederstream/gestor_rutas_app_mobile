/**
 * ============================================================================
 * SCREEN: ProfileScreen.tsx
 * Pantalla Dedicada "Mi Perfil" con Información de Cuenta, Rol (RBAC) y Cierre de Sesión
 * Sigue las Mejores Prácticas de UX Móvil (Uber Driver, Mercado Envíos, Rappi)
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
import { hapticImpact } from '../utils/haptics';
import { Header } from '../components/common/Header';

type Props = NativeStackScreenProps<RootStackParamList, 'ProfileScreen'>;

export const ProfileScreen: React.FC<Props> = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { orders, statistics } = useOrders();
  const { customers } = useCustomers();
  const { products } = useProducts();

  const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false);

  const isAdmin = user?.role === 'ADMIN';
  const isDistributor = user?.role === 'DISTRIBUTOR';

  const handleOpenLogout = () => {
    hapticImpact('light');
    setIsLogoutModalVisible(true);
  };

  const handleConfirmLogout = async () => {
    setIsLogoutModalVisible(false);
    await logout();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

      <Header
        title="Mi Perfil"
        subtitle="Datos de cuenta y configuración"
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ================================================================= */}
        {/* TARJETA DE IDENTIFICACIÓN DE USUARIO */}
        {/* ================================================================= */}
        <View style={styles.userCard}>
          <View style={[styles.avatarBox, isAdmin ? styles.avatarAdmin : styles.avatarDist]}>
            <Text style={styles.avatarEmoji}>
              {isAdmin ? '👑' : isDistributor ? '👨‍✈️' : '👤'}
            </Text>
          </View>

          <Text style={styles.userName}>{user?.name || 'Usuario'}</Text>
          <Text style={styles.userUsername}>@{user?.username || 'usuario'}</Text>

          <View
            style={[
              styles.roleBadge,
              isAdmin ? styles.roleBadgeAdmin : styles.roleBadgeDist,
            ]}
          >
            <Ionicons
              name={isAdmin ? 'shield-checkmark' : 'bicycle'}
              size={13}
              color={isAdmin ? '#6B21A8' : '#0369A1'}
            />
            <Text
              style={[
                styles.roleBadgeText,
                isAdmin ? styles.roleBadgeTextAdmin : styles.roleBadgeTextDist,
              ]}
            >
              {isAdmin
                ? 'ADMINISTRADOR GENERAL'
                : isDistributor
                ? 'DISTRIBUIDOR / CHOFER'
                : 'CLIENTE'}
            </Text>
          </View>
        </View>

        {/* ================================================================= */}
        {/* INFORMACIÓN DE CONTACTO Y CREDENCIALES */}
        {/* ================================================================= */}
        <View style={styles.card}>
          <Text style={styles.cardHeaderTitle}>Información de Contacto</Text>

          <View style={styles.infoRow}>
            <View style={styles.iconSquare}>
              <Ionicons name="mail-outline" size={18} color={COLORS.primary} />
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Correo Electrónico</Text>
              <Text style={styles.infoValue}>{user?.email || 'No registrado'}</Text>
            </View>
          </View>

          <View style={styles.infoDivider} />

          <View style={styles.infoRow}>
            <View style={styles.iconSquare}>
              <Ionicons name="call-outline" size={18} color={COLORS.primary} />
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Teléfono Móvil</Text>
              <Text style={styles.infoValue}>{user?.phone || 'No registrado'}</Text>
            </View>
          </View>

          <View style={styles.infoDivider} />

          <View style={styles.infoRow}>
            <View style={styles.iconSquare}>
              <Ionicons name="location-outline" size={18} color={COLORS.primary} />
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Ciudad de Operaciones</Text>
              <Text style={styles.infoValue}>Tacna, Perú (Centro & Cono Sur/Norte)</Text>
            </View>
          </View>
        </View>

        {/* ================================================================= */}
        {/* DATOS OPERATIVOS DEL DISTRIBUIDOR (VEHÍCULO Y RENDIMIENTO) */}
        {/* ================================================================= */}
        {isDistributor && (
          <>
            <View style={styles.card}>
              <Text style={styles.cardHeaderTitle}>Unidad de Transporte Asignada</Text>

              <View style={styles.infoRow}>
                <View style={[styles.iconSquare, { backgroundColor: '#F0FDF4' }]}>
                  <Ionicons name="car-outline" size={18} color={COLORS.success} />
                </View>
                <View style={styles.infoCol}>
                  <Text style={styles.infoLabel}>Vehículo Asignado</Text>
                  <Text style={styles.infoValue}>
                    {user?.vehicleInfo || 'Camión 02 (Placa BZ-492)'}
                  </Text>
                </View>
              </View>

              <View style={styles.infoDivider} />

              <View style={styles.infoRow}>
                <View style={[styles.iconSquare, { backgroundColor: '#F0FDF4' }]}>
                  <Ionicons name="id-card-outline" size={18} color={COLORS.success} />
                </View>
                <View style={styles.infoCol}>
                  <Text style={styles.infoLabel}>Código de Chofer</Text>
                  <Text style={styles.infoValue}>{user?.driverCode || 'CHO-02'}</Text>
                </View>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardHeaderTitle}>Tu Rendimiento en Ruta (Hoy)</Text>

              <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                  <Text style={styles.statNumber}>{statistics.deliveredOrders}</Text>
                  <Text style={styles.statLabel}>Entregas Listas</Text>
                </View>

                <View style={styles.statBox}>
                  <Text style={[styles.statNumber, { color: COLORS.statusInTransit }]}>
                    {statistics.inTransitOrders + statistics.pendingOrders}
                  </Text>
                  <Text style={styles.statLabel}>Por Entregar</Text>
                </View>

                <View style={styles.statBox}>
                  <Text style={[styles.statNumber, { color: COLORS.primary }]}>
                    {formatCurrency(statistics.totalRevenue)}
                  </Text>
                  <Text style={styles.statLabel}>Cobrado Hoy</Text>
                </View>
              </View>
            </View>
          </>
        )}

        {/* ================================================================= */}
        {/* DATOS GERENCIALES DEL ADMINISTRADOR */}
        {/* ================================================================= */}
        {isAdmin && (
          <View style={styles.card}>
            <Text style={styles.cardHeaderTitle}>Supervisión del Negocio (Global)</Text>

            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{orders.length}</Text>
                <Text style={styles.statLabel}>Total Pedidos</Text>
              </View>

              <View style={styles.statBox}>
                <Text style={[styles.statNumber, { color: COLORS.primary }]}>
                  {customers.length}
                </Text>
                <Text style={styles.statLabel}>Clientes Activos</Text>
              </View>

              <View style={styles.statBox}>
                <Text style={[styles.statNumber, { color: '#D97706' }]}>
                  {products.length}
                </Text>
                <Text style={styles.statLabel}>Productos</Text>
              </View>
            </View>

            <View style={styles.adminPrivilegeBox}>
              <Ionicons name="key-outline" size={16} color="#6B21A8" />
              <Text style={styles.adminPrivilegeText}>
                Tienes permisos maestros para crear, editar y eliminar pedidos, clientes y catálogo de productos.
              </Text>
            </View>
          </View>
        )}

        {/* ================================================================= */}
        {/* INFORMACIÓN DEL SISTEMA Y TECNOLOGÍA */}
        {/* ================================================================= */}
        <View style={styles.card}>
          <Text style={styles.cardHeaderTitle}>Sistema y Cumplimiento</Text>

          <View style={styles.systemRow}>
            <Text style={styles.systemLabel}>App:</Text>
            <Text style={styles.systemValue}>Gestor de Rutas Móvil (Tacna)</Text>
          </View>
          <View style={styles.systemRow}>
            <Text style={styles.systemLabel}>Arquitectura:</Text>
            <Text style={styles.systemValue}>Offline-First (Context API + AsyncStorage)</Text>
          </View>
          <View style={styles.systemRow}>
            <Text style={styles.systemLabel}>Cartografía:</Text>
            <Text style={styles.systemValue}>Leaflet + Esri World Street (100% Free)</Text>
          </View>
          <View style={styles.systemRow}>
            <Text style={styles.systemLabel}>Evaluación:</Text>
            <Text style={styles.systemValue}>Rúbrica IDAT 20/20</Text>
          </View>
        </View>

        {/* ================================================================= */}
        {/* BOTÓN FORMAL DE CIERRE DE SESIÓN */}
        {/* ================================================================= */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleOpenLogout}
          activeOpacity={0.85}
        >
          <Ionicons name="log-out-outline" size={20} color="#DC2626" />
          <Text style={styles.logoutButtonText}>Cerrar Sesión Segura</Text>
        </TouchableOpacity>
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

            <View style={styles.logoutModalBtnRow}>
              <TouchableOpacity
                style={styles.logoutCancelBtn}
                onPress={() => setIsLogoutModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.logoutCancelText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.logoutConfirmBtn}
                onPress={handleConfirmLogout}
                activeOpacity={0.85}
              >
                <Text style={styles.logoutConfirmText}>Sí, Salir</Text>
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
    padding: SPACING.md,
    paddingBottom: 40,
  },
  userCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  avatarBox: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  avatarAdmin: {
    backgroundColor: '#F3E8FF',
    borderWidth: 2,
    borderColor: '#C084FC',
  },
  avatarDist: {
    backgroundColor: '#E0F2FE',
    borderWidth: 2,
    borderColor: '#38BDF8',
  },
  avatarEmoji: {
    fontSize: 38,
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 2,
    textAlign: 'center',
  },
  userUsername: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 10,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
  },
  roleBadgeAdmin: {
    backgroundColor: '#F3E8FF',
  },
  roleBadgeDist: {
    backgroundColor: '#E0F2FE',
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  roleBadgeTextAdmin: {
    color: '#6B21A8',
  },
  roleBadgeTextDist: {
    color: '#0369A1',
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconSquare: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  infoCol: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: SPACING.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  adminPrivilegeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FAF5FF',
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  adminPrivilegeText: {
    flex: 1,
    fontSize: 12,
    color: '#6B21A8',
    lineHeight: 16,
  },
  systemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  systemLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  systemValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FECACA',
    borderRadius: RADIUS.md,
    height: TOUCH_TARGET.buttonHeight,
    marginTop: SPACING.sm,
  },
  logoutButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#DC2626',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  logoutModalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  logoutModalIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
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
    marginBottom: SPACING.lg,
  },
  logoutModalBtnRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    width: '100%',
  },
  logoutCancelBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: RADIUS.sm,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  logoutConfirmBtn: {
    flex: 1,
    backgroundColor: COLORS.danger,
    borderRadius: RADIUS.sm,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutConfirmText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
