import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
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
import { hapticImpact, hapticSelection, hapticNotification } from '../utils/haptics';
import { FloatingBottomDock } from '../components/common/FloatingBottomDock';
import {
  getSavedDistricts,
  addDistrict,
  updateDistrict,
  deleteDistrict,
  resetDefaultDistricts,
} from '../services/districtService';

type Props = NativeStackScreenProps<RootStackParamList, 'WelcomeScreen'>;

export const WelcomeScreen: React.FC<Props> = ({ navigation }) => {
  const { user, accounts } = useAuth();
  const { orders, statistics, clearAllOrders, getOrdersForUser, getStatisticsForUser } = useOrders();
  const { customers } = useCustomers();
  const { products } = useProducts();

  const isAdmin = user?.role === 'ADMIN';
  const isDistributor = user?.role === 'DISTRIBUTOR';

  // Cantidad de choferes en flota (garantizado dinámico)
  const distributorsCount = useMemo(() => {
    return accounts.filter((a) => a.role === 'DISTRIBUTOR').length;
  }, [accounts]);

  // Gestión de Distritos de Tacna (CRUD Completo)
  const [isDistrictsModalVisible, setIsDistrictsModalVisible] = useState(false);
  const [managedDistricts, setManagedDistricts] = useState<string[]>([]);
  const [newDistrictInput, setNewDistrictInput] = useState('');
  const [editingDistrictOldName, setEditingDistrictOldName] = useState<string | null>(null);
  const [editingDistrictNewInput, setEditingDistrictNewInput] = useState('');

  useEffect(() => {
    if (isAdmin) {
      getSavedDistricts().then(setManagedDistricts);
    }
  }, [isAdmin]);

  const handleOpenDistrictsModal = async () => {
    hapticImpact('light');
    const list = await getSavedDistricts();
    setManagedDistricts(list);
    setNewDistrictInput('');
    setEditingDistrictOldName(null);
    setIsDistrictsModalVisible(true);
  };

  const handleAddDistrictAction = async () => {
    const res = await addDistrict(newDistrictInput);
    if (!res.success) {
      Alert.alert('Aviso', res.error || 'No se pudo agregar el distrito.');
      return;
    }
    setManagedDistricts(res.districts);
    setNewDistrictInput('');
    hapticImpact('medium');
  };

  const handleStartEditDistrict = (distName: string) => {
    hapticImpact('light');
    setEditingDistrictOldName(distName);
    setEditingDistrictNewInput(distName);
  };

  const handleSaveEditDistrict = async () => {
    if (!editingDistrictOldName) return;
    const res = await updateDistrict(editingDistrictOldName, editingDistrictNewInput);
    if (!res.success) {
      Alert.alert('Aviso', res.error || 'No se pudo actualizar el distrito.');
      return;
    }
    setManagedDistricts(res.districts);
    setEditingDistrictOldName(null);
    setEditingDistrictNewInput('');
    hapticImpact('medium');
  };

  const handleDeleteDistrictAction = async (distName: string) => {
    Alert.alert(
      'Eliminar Zona de Cobertura',
      `¿Deseas retirar a "${distName}" de las zonas de reparto de Tacna?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, Eliminar',
          style: 'destructive',
          onPress: async () => {
            const res = await deleteDistrict(distName);
            if (!res.success) {
              Alert.alert('Operación Bloqueada', res.error || 'No se puede eliminar el distrito.');
              return;
            }
            setManagedDistricts(res.districts);
            hapticImpact('light');
          },
        },
      ]
    );
  };

  const handleResetDistrictsAction = () => {
    Alert.alert(
      'Restablecer Zonas',
      '¿Deseas restablecer los distritos oficiales de Tacna a sus valores predeterminados?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, Restablecer',
          onPress: async () => {
            const list = await resetDefaultDistricts();
            setManagedDistricts(list);
            hapticNotification('success');
          },
        },
      ]
    );
  };

  // Métricas del usuario actual
  const userOrders = useMemo(() => {
    return getOrdersForUser(user);
  }, [getOrdersForUser, user, orders]);

  const userStats = useMemo(() => {
    return getStatisticsForUser(user);
  }, [getStatisticsForUser, user, orders]);

  const activeDeliveriesCount = userStats.pendingOrders + userStats.inTransitOrders;
  const deliveredCount = userStats.deliveredOrders;
  const totalCount = userStats.totalOrders;
  const pendingCollection = userStats.pendingCollection;

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
        {/* CABECERA PRINCIPAL: IDENTIDAD Y ACCESO A MI PERFIL */}
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
                  : `👨‍✈️ ${user?.name || 'Distribuidor'} • ${user?.specialtyLabel || user?.vehicleInfo || 'Unidad Asignada'}`}
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

        {/* BANNER PRINCIPAL DE ACCIÓN: CONDUCTOR / OPERACIÓN EN RUTA */}
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
                {deliveredCount} de {totalCount} entregados
              </Text>
            </View>

            <Text style={styles.activeHeroTitle}>
              {activeDeliveriesCount} {activeDeliveriesCount === 1 ? 'parada pendiente' : 'paradas pendientes'} por entregar
            </Text>
            <Text style={styles.activeHeroDesc}>
              Cobranza en ruta estimada: {formatCurrency(pendingCollection)}
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

        {/* Acceso para crear nuevo pedido */}
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

        {/* TABLERO RESUMEN DE HOY (MÉTRICAS OPERATIVAS) */}
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
            <Text style={styles.kpiNumber}>{userStats.totalOrders}</Text>
            <Text style={styles.kpiLabel}>Total</Text>
          </View>

          <View style={styles.kpiCard}>
            <Text style={[styles.kpiNumber, { color: COLORS.statusInTransit }]}>
              {userStats.inTransitOrders}
            </Text>
            <Text style={styles.kpiLabel}>En Ruta</Text>
          </View>

          <View style={styles.kpiCard}>
            <Text style={[styles.kpiNumber, { color: COLORS.statusDelivered }]}>
              {userStats.deliveredOrders}
            </Text>
            <Text style={styles.kpiLabel}>Entregados</Text>
          </View>

          <View style={styles.kpiCard}>
            <Text style={[styles.kpiNumber, { color: COLORS.primary }]}>
              {formatCurrency(isAdmin ? userStats.totalRevenue : userStats.pendingCollection)}
            </Text>
            <Text style={styles.kpiLabel}>
              {isAdmin ? 'Recaudado' : 'Por Cobrar'}
            </Text>
          </View>
        </View>

        {/* PANEL DE ADMINISTRACIÓN OPERATIVA Y FLOTA (SOLO ADMINISTRADOR) */}
        {isAdmin && (
          <View style={styles.adminModulesSection}>
            <Text style={styles.sectionHeaderTitle}>Administración Operativa</Text>

            <View style={styles.adminCardsRow}>
              {/* Tarjeta 1: Flota y Distribuidores (Navega a pantalla completa DriverListScreen) */}
              <TouchableOpacity
                style={styles.adminModuleCard}
                onPress={() => {
                  hapticImpact('light');
                  navigation.navigate('DriverListScreen');
                }}
                activeOpacity={0.85}
              >
                <View style={[styles.adminModuleIconBox, { backgroundColor: '#EFF6FF' }]}>
                  <Ionicons name="people" size={24} color={COLORS.primary} />
                </View>
                <Text style={styles.adminModuleTitle}>Flota y Choferes</Text>
                <Text style={styles.adminModuleSubtitle}>
                  {distributorsCount} conductores activos
                </Text>
                <View style={styles.adminModuleActionPill}>
                  <Text style={styles.adminModuleActionPillText}>Gestionar Flota →</Text>
                </View>
              </TouchableOpacity>

              {/* Tarjeta 2: Zonas y Distritos de Reparto (Abre CRUD Modal) */}
              <TouchableOpacity
                style={styles.adminModuleCard}
                onPress={handleOpenDistrictsModal}
                activeOpacity={0.85}
              >
                <View style={[styles.adminModuleIconBox, { backgroundColor: '#F0FDF4' }]}>
                  <Ionicons name="map" size={24} color={COLORS.success} />
                </View>
                <Text style={styles.adminModuleTitle}>Zonas y Distritos</Text>
                <Text style={styles.adminModuleSubtitle}>
                  {managedDistricts.length} zonas en Tacna
                </Text>
                <View style={[styles.adminModuleActionPill, { backgroundColor: '#ECFDF5' }]}>
                  <Text style={[styles.adminModuleActionPillText, { color: '#059669' }]}>
                    Configurar Zonas →
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* MODAL CRUD COMPLETO: ZONAS Y DISTRITOS DE TACNA */}
      <Modal
        visible={isDistrictsModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsDistrictsModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.districtsModalBackdrop}
        >
          <View style={styles.districtsModalCard}>
            <View style={styles.districtsModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="map" size={20} color={COLORS.success} />
                <Text style={styles.districtsModalTitle}>
                  Zonas y Distritos de Tacna ({managedDistricts.length})
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsDistrictsModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.districtsModalSubtitle}>
              Configura las zonas donde tus repartidores tienen cobertura oficial.
            </Text>

            {/* Input para Agregar Nuevo Distrito */}
            <View style={styles.addDistrictRow}>
              <TextInput
                style={styles.addDistrictInput}
                placeholder="Nuevo distrito (Ej. Calana, Pachía...)"
                placeholderTextColor="#94A3B8"
                value={newDistrictInput}
                onChangeText={setNewDistrictInput}
              />
              <TouchableOpacity
                style={styles.addDistrictBtn}
                onPress={handleAddDistrictAction}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Lista con CRUD de Distritos */}
            <ScrollView style={{ maxHeight: 290 }} showsVerticalScrollIndicator={false}>
              {managedDistricts.map((dist, idx) => {
                const isEditingThis = editingDistrictOldName === dist;
                const ordersInDistrict = orders.filter((o) => o.district === dist).length;

                return (
                  <View key={dist + idx} style={styles.districtItemCard}>
                    {isEditingThis ? (
                      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <TextInput
                          style={styles.editDistrictInput}
                          value={editingDistrictNewInput}
                          onChangeText={setEditingDistrictNewInput}
                          autoFocus={true}
                        />
                        <TouchableOpacity
                          style={styles.saveEditDistrictBtn}
                          onPress={handleSaveEditDistrict}
                        >
                          <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.cancelEditDistrictBtn}
                          onPress={() => setEditingDistrictOldName(null)}
                        >
                          <Ionicons name="close" size={16} color="#64748B" />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Ionicons name="location" size={15} color={COLORS.primary} />
                            <Text style={styles.districtItemText}>{dist}</Text>
                          </View>
                          <Text style={styles.districtOrdersCountText}>
                            {ordersInDistrict} {ordersInDistrict === 1 ? 'pedido registrado' : 'pedidos registrados'}
                          </Text>
                        </View>

                        {/* Botones de acción: Editar y Eliminar */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <TouchableOpacity
                            style={styles.actionDistrictIconBtn}
                            onPress={() => handleStartEditDistrict(dist)}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="pencil" size={14} color={COLORS.primary} />
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.actionDistrictIconBtn, { backgroundColor: '#FEF2F2' }]}
                            onPress={() => handleDeleteDistrictAction(dist)}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="trash-outline" size={14} color={COLORS.danger} />
                          </TouchableOpacity>
                        </View>
                      </>
                    )}
                  </View>
                );
              })}
            </ScrollView>

            {/* Acciones Inferiores */}
            <View style={styles.districtsModalBottomRow}>
              <TouchableOpacity
                style={styles.resetDistrictsBtn}
                onPress={handleResetDistrictsAction}
                activeOpacity={0.7}
              >
                <Ionicons name="refresh-outline" size={14} color="#64748B" />
                <Text style={styles.resetDistrictsBtnText}>Restablecer Base</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.closeDistrictsModalBtn}
                onPress={() => setIsDistrictsModalVisible(false)}
                activeOpacity={0.85}
              >
                <Text style={styles.closeDistrictsModalBtnText}>Listo, Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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
    paddingBottom: 115,
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
  /* Módulos Operativos y Flota para Administrador */
  adminModulesSection: {
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
  },
  adminCardsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  adminModuleCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  adminModuleIconBox: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  adminModuleTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  adminModuleSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
    marginBottom: 10,
  },
  adminModuleActionPill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    alignSelf: 'flex-start',
  },
  adminModuleActionPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primary,
  },
  /* Modal de Distritos */
  districtsModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    padding: SPACING.md,
  },
  districtsModalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    maxHeight: '85%',
  },
  districtsModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  districtsModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.secondary,
  },
  districtsModalSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginVertical: 10,
  },
  addDistrictRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  addDistrictInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  addDistrictBtn: {
    backgroundColor: COLORS.primary,
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  districtItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.md,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  districtItemText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  districtOrdersCountText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
    marginLeft: 21,
  },
  actionDistrictIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editDistrictInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  saveEditDistrictBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelEditDistrictBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  districtsModalBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  resetDistrictsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  resetDistrictsBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  closeDistrictsModalBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: RADIUS.md,
  },
  closeDistrictsModalBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
});
