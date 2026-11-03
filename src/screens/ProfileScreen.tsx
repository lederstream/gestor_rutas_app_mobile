/**
 * ============================================================================
 * SCREEN: ProfileScreen.tsx
 * Gestión Integral de Mi Perfil con UX Limpia y Armoniosa para Todos los Roles
 * Eliminación de Redundancias y Enfoque en Claridad Visual
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
  TextInput,
  Alert,
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
import { hapticImpact, hapticSelection } from '../utils/haptics';
import { Header } from '../components/common/Header';

type Props = NativeStackScreenProps<RootStackParamList, 'ProfileScreen'>;

export const ProfileScreen: React.FC<Props> = ({ navigation }) => {
  const { user, logout, updateProfile, updatePassword } = useAuth();
  const { orders, statistics } = useOrders();
  const { customers } = useCustomers();
  const { products } = useProducts();

  // Estados de Modales
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
  const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false);

  // Estados de Formulario de Edición
  const [editName, setEditName] = useState(user?.name || '');
  const [editPhone, setEditPhone] = useState(user?.phone || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [editVehicleInfo, setEditVehicleInfo] = useState(user?.vehicleInfo || '');
  const [editDriverCode, setEditDriverCode] = useState(user?.driverCode || '');
  const [editAddress, setEditAddress] = useState(user?.deliveryAddress || '');
  const [editReference, setEditReference] = useState(user?.addressReference || '');

  // Estados de Cambio de Contraseña
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  const isAdmin = user?.role === 'ADMIN';
  const isDistributor = user?.role === 'DISTRIBUTOR';
  const isClient = user?.role === 'CLIENT';

  // Pedidos del cliente si es rol cliente
  const clientOrdersCount = orders.filter(
    (o) =>
      o.customerId === user?.customerId ||
      o.customerName.toLowerCase() === user?.name.toLowerCase()
  ).length;

  const handleOpenEditModal = () => {
    hapticImpact('light');
    setEditName(user?.name || '');
    setEditPhone(user?.phone || '');
    setEditEmail(user?.email || '');
    setEditVehicleInfo(user?.vehicleInfo || '');
    setEditDriverCode(user?.driverCode || '');
    setEditAddress(user?.deliveryAddress || '');
    setEditReference(user?.addressReference || '');
    setIsEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('Nombre Requerido', 'Por favor ingresa tu nombre o razón social.');
      return;
    }
    if (!editPhone.trim()) {
      Alert.alert('Teléfono Requerido', 'El número de teléfono o celular es obligatorio.');
      return;
    }

    const res = await updateProfile({
      name: editName,
      phone: editPhone,
      email: editEmail,
      vehicleInfo: isDistributor ? editVehicleInfo : undefined,
      driverCode: isDistributor ? editDriverCode : undefined,
      deliveryAddress: isClient ? editAddress : undefined,
      addressReference: isClient ? editReference : undefined,
    });

    if (res.success) {
      setIsEditModalVisible(false);
      Alert.alert('Perfil Actualizado', 'Tus datos fueron guardados correctamente.');
    } else {
      Alert.alert('Error', res.error || 'No se pudieron guardar los cambios.');
    }
  };

  const handleOpenPasswordModal = () => {
    hapticImpact('light');
    setCurrentPass('');
    setNewPass('');
    setConfirmPass('');
    setIsPasswordModalVisible(true);
  };

  const handleSavePassword = async () => {
    if (!currentPass.trim() || !newPass.trim()) {
      Alert.alert('Campos Incompletos', 'Ingresa la contraseña actual y la nueva contraseña.');
      return;
    }
    if (newPass !== confirmPass) {
      Alert.alert('Validación', 'La nueva contraseña y su confirmación no coinciden.');
      return;
    }

    const res = await updatePassword(currentPass, newPass);
    if (res.success) {
      setIsPasswordModalVisible(false);
      Alert.alert('Contraseña Actualizada', 'Tu nueva clave de acceso ya está activa.');
    } else {
      Alert.alert('Error', res.error || 'Contraseña incorrecta.');
    }
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
        subtitle="Cuenta y preferencias"
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ================================================================= */}
        {/* TARJETA DE IDENTIFICACIÓN: AVATAR Y UN SOLO BOTÓN DE EDICIÓN */}
        {/* ================================================================= */}
        <View style={styles.userCard}>
          <View
            style={[
              styles.avatarBox,
              isAdmin
                ? styles.avatarAdmin
                : isDistributor
                ? styles.avatarDist
                : styles.avatarClient,
            ]}
          >
            <Text style={styles.avatarEmoji}>
              {isAdmin ? '👑' : isDistributor ? '👨‍✈️' : '🏪'}
            </Text>
          </View>

          <Text style={styles.userName}>{user?.name || 'Usuario'}</Text>
          <Text style={styles.userUsername}>@{user?.username || 'usuario'}</Text>

          <View
            style={[
              styles.roleBadge,
              isAdmin
                ? styles.roleBadgeAdmin
                : isDistributor
                ? styles.roleBadgeDist
                : styles.roleBadgeClient,
            ]}
          >
            <Ionicons
              name={
                isAdmin
                  ? 'shield-checkmark'
                  : isDistributor
                  ? 'bicycle'
                  : 'storefront'
              }
              size={13}
              color={
                isAdmin ? '#6B21A8' : isDistributor ? '#0369A1' : '#047857'
              }
            />
            <Text
              style={[
                styles.roleBadgeText,
                isAdmin
                  ? styles.roleBadgeTextAdmin
                  : isDistributor
                  ? styles.roleBadgeTextDist
                  : styles.roleBadgeTextClient,
              ]}
            >
              {isAdmin
                ? 'ADMINISTRADOR GENERAL'
                : isDistributor
                ? 'DISTRIBUIDOR / CHOFER'
                : 'CLIENTE REGISTRADO'}
            </Text>
          </View>

          {/* Único botón de edición centralizado */}
          <TouchableOpacity
            style={styles.editProfileBtn}
            onPress={handleOpenEditModal}
            activeOpacity={0.8}
          >
            <Ionicons name="create-outline" size={15} color={COLORS.primary} />
            <Text style={styles.editProfileBtnText}>Editar Información</Text>
          </TouchableOpacity>
        </View>

        {/* ================================================================= */}
        {/* INFORMACIÓN DE CONTACTO (LIMPIA, SIN BOTONES DUPLICADOS) */}
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
              <Text style={styles.infoLabel}>Teléfono de Contacto</Text>
              <Text style={styles.infoValue}>{user?.phone || 'No registrado'}</Text>
            </View>
          </View>

          <View style={styles.infoDivider} />

          <View style={styles.infoRow}>
            <View style={styles.iconSquare}>
              <Ionicons name="location-outline" size={18} color={COLORS.primary} />
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Zona Operativa</Text>
              <Text style={styles.infoValue}>
                {user?.district ? `${user.district}, Tacna` : 'Tacna, Perú'}
              </Text>
            </View>
          </View>
        </View>

        {/* ================================================================= */}
        {/* DATOS EXCLUSIVOS SEGÚN ROL */}
        {/* ================================================================= */}
        {isDistributor && (
          <>
            <View style={styles.card}>
              <Text style={styles.cardHeaderTitle}>Unidad de Reparto Asignada</Text>

              <View style={styles.infoRow}>
                <View style={[styles.iconSquare, { backgroundColor: '#F0FDF4' }]}>
                  <Ionicons name="car-outline" size={18} color={COLORS.success} />
                </View>
                <View style={styles.infoCol}>
                  <Text style={styles.infoLabel}>Vehículo / Placa</Text>
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
              <Text style={styles.cardHeaderTitle}>Rendimiento de Hoy</Text>

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
                  <Text style={styles.statLabel}>Recaudado</Text>
                </View>
              </View>
            </View>
          </>
        )}

        {isAdmin && (
          <View style={styles.card}>
            <Text style={styles.cardHeaderTitle}>Supervisión General</Text>

            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{orders.length}</Text>
                <Text style={styles.statLabel}>Total Pedidos</Text>
              </View>

              <View style={styles.statBox}>
                <Text style={[styles.statNumber, { color: COLORS.primary }]}>
                  {customers.length}
                </Text>
                <Text style={styles.statLabel}>Clientes</Text>
              </View>

              <View style={styles.statBox}>
                <Text style={[styles.statNumber, { color: '#D97706' }]}>
                  {products.length}
                </Text>
                <Text style={styles.statLabel}>Productos</Text>
              </View>
            </View>
          </View>
        )}

        {isClient && (
          <View style={styles.card}>
            <Text style={styles.cardHeaderTitle}>Dirección de Entrega Registrada</Text>

            <View style={styles.infoRow}>
              <View style={[styles.iconSquare, { backgroundColor: '#ECFDF5' }]}>
                <Ionicons name="business-outline" size={18} color="#059669" />
              </View>
              <View style={styles.infoCol}>
                <Text style={styles.infoLabel}>Dirección de tu Local / Negocio</Text>
                <Text style={styles.infoValue}>
                  {user?.deliveryAddress || 'Av. Bolognesi 845'}
                </Text>
              </View>
            </View>

            {user?.addressReference && (
              <>
                <View style={styles.infoDivider} />
                <View style={styles.infoRow}>
                  <View style={[styles.iconSquare, { backgroundColor: '#ECFDF5' }]}>
                    <Ionicons name="compass-outline" size={18} color="#059669" />
                  </View>
                  <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>Referencia de Llegada</Text>
                    <Text style={styles.infoValue}>{user.addressReference}</Text>
                  </View>
                </View>
              </>
            )}

            <View style={styles.infoDivider} />

            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{clientOrdersCount}</Text>
                <Text style={styles.statLabel}>Pedidos Realizados</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statNumber, { color: COLORS.success }]}>Activo</Text>
                <Text style={styles.statLabel}>Estado de Cuenta</Text>
              </View>
            </View>
          </View>
        )}

        {/* ================================================================= */}
        {/* SEGURIDAD: CAMBIAR CONTRASEÑA */}
        {/* ================================================================= */}
        <View style={styles.card}>
          <Text style={styles.cardHeaderTitle}>Seguridad de la Cuenta</Text>

          <TouchableOpacity
            style={styles.actionRowBtn}
            onPress={handleOpenPasswordModal}
            activeOpacity={0.7}
          >
            <View style={styles.actionRowIcon}>
              <Ionicons name="key-outline" size={18} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionRowTitle}>Cambiar Contraseña / PIN</Text>
              <Text style={styles.actionRowSub}>Actualizar clave de acceso seguro</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        {/* ================================================================= */}
        {/* BOTÓN DE CIERRE DE SESIÓN SEGURO */}
        {/* ================================================================= */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => {
            hapticImpact('light');
            setIsLogoutModalVisible(true);
          }}
          activeOpacity={0.85}
        >
          <Ionicons name="log-out-outline" size={20} color="#DC2626" />
          <Text style={styles.logoutButtonText}>Cerrar Sesión Segura</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ================================================================= */}
      {/* MODAL: EDITAR INFORMACIÓN DE PERFIL */}
      {/* ================================================================= */}
      <Modal
        visible={isEditModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalCardLarge}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTitle}>Editar Mi Perfil</Text>
                <Text style={styles.modalSubtitle}>Actualiza tus datos de contacto</Text>
              </View>
              <TouchableOpacity onPress={() => setIsEditModalVisible(false)}>
                <Ionicons name="close-circle" size={24} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              <Text style={styles.inputLabel}>Nombre o Razón Social</Text>
              <TextInput
                style={styles.textInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Ingresa tu nombre completo"
                placeholderTextColor={COLORS.textMuted}
              />

              <Text style={styles.inputLabel}>Teléfono / Celular de Contacto</Text>
              <TextInput
                style={styles.textInput}
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="Ej. 987111222"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="phone-pad"
              />

              <Text style={styles.inputLabel}>Correo Electrónico</Text>
              <TextInput
                style={styles.textInput}
                value={editEmail}
                onChangeText={setEditEmail}
                placeholder="Ej. usuario@correo.com"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              {isDistributor && (
                <>
                  <Text style={styles.inputLabel}>Vehículo Asignado y Placa</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editVehicleInfo}
                    onChangeText={setEditVehicleInfo}
                    placeholder="Ej. Camión 02 (Placa BZ-492)"
                    placeholderTextColor={COLORS.textMuted}
                  />

                  <Text style={styles.inputLabel}>Código de Chofer</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editDriverCode}
                    onChangeText={setEditDriverCode}
                    placeholder="Ej. CHO-02"
                    placeholderTextColor={COLORS.textMuted}
                  />
                </>
              )}

              {isClient && (
                <>
                  <Text style={styles.inputLabel}>Dirección de Entrega</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editAddress}
                    onChangeText={setEditAddress}
                    placeholder="Ej. Av. Bolognesi 845"
                    placeholderTextColor={COLORS.textMuted}
                  />

                  <Text style={styles.inputLabel}>Referencia de Llegada</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editReference}
                    onChangeText={setEditReference}
                    placeholder="Ej. Frente al mercado, portón negro"
                    placeholderTextColor={COLORS.textMuted}
                  />
                </>
              )}
            </ScrollView>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setIsEditModalVisible(false)}
              >
                <Text style={styles.cancelModalBtnText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveModalBtn}
                onPress={handleSaveProfile}
              >
                <Text style={styles.saveModalBtnText}>Guardar Cambios</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ================================================================= */}
      {/* MODAL: CAMBIAR CONTRASEÑA */}
      {/* ================================================================= */}
      <Modal
        visible={isPasswordModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsPasswordModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTitle}>Cambiar Contraseña</Text>
                <Text style={styles.modalSubtitle}>Clave de acceso seguro al sistema</Text>
              </View>
              <TouchableOpacity onPress={() => setIsPasswordModalVisible(false)}>
                <Ionicons name="close-circle" size={24} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Contraseña Actual</Text>
            <TextInput
              style={styles.textInput}
              value={currentPass}
              onChangeText={setCurrentPass}
              placeholder="Ingresa tu contraseña actual"
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry={true}
            />

            <Text style={styles.inputLabel}>Nueva Contraseña</Text>
            <TextInput
              style={styles.textInput}
              value={newPass}
              onChangeText={setNewPass}
              placeholder="Mínimo 3 caracteres"
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry={true}
            />

            <Text style={styles.inputLabel}>Confirmar Nueva Contraseña</Text>
            <TextInput
              style={styles.textInput}
              value={confirmPass}
              onChangeText={setConfirmPass}
              placeholder="Vuelve a escribir la nueva clave"
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry={true}
            />

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setIsPasswordModalVisible(false)}
              >
                <Text style={styles.cancelModalBtnText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveModalBtn}
                onPress={handleSavePassword}
              >
                <Text style={styles.saveModalBtnText}>Actualizar Clave</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ================================================================= */}
      {/* MODAL: CONFIRMACIÓN DE CIERRE DE SESIÓN */}
      {/* ================================================================= */}
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

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setIsLogoutModalVisible(false)}
              >
                <Text style={styles.cancelModalBtnText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveModalBtn, { backgroundColor: COLORS.danger }]}
                onPress={handleConfirmLogout}
              >
                <Text style={styles.saveModalBtnText}>Sí, Salir</Text>
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
  avatarClient: {
    backgroundColor: '#ECFDF5',
    borderWidth: 2,
    borderColor: '#6EE7B7',
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
    marginBottom: 8,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    marginBottom: 12,
  },
  roleBadgeAdmin: {
    backgroundColor: '#F3E8FF',
  },
  roleBadgeDist: {
    backgroundColor: '#E0F2FE',
  },
  roleBadgeClient: {
    backgroundColor: '#ECFDF5',
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  roleBadgeTextAdmin: {
    color: '#6B21A8',
  },
  roleBadgeTextDist: {
    color: '#0369A1',
  },
  roleBadgeTextClient: {
    color: '#047857',
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  editProfileBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
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
    fontSize: 14,
    fontWeight: '800',
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
    fontSize: 11,
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
    marginTop: 6,
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
    fontSize: 17,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  actionRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  actionRowIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionRowTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  actionRowSub: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1,
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
  /* Modal Styles */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    width: '100%',
    maxWidth: 360,
  },
  modalCardLarge: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    width: '100%',
    maxWidth: 380,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  modalSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 10,
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: RADIUS.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  cancelModalBtn: {
    flex: 1,
    height: 44,
    backgroundColor: '#F1F5F9',
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelModalBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  saveModalBtn: {
    flex: 1.3,
    height: 44,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveModalBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
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
    width: 56,
    height: 56,
    borderRadius: 28,
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
    marginBottom: SPACING.md,
  },
});
