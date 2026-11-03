/**
 * ============================================================================
 * SCREEN: ProfileScreen.tsx
 * Gestión Integral de Perfil con CRUD Completo (Create, Read, Update, Reset)
 * UX Móvil Limpia y Ergonómica sin Saturaciones de Texto
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
import { hapticImpact, hapticNotification, hapticSelection } from '../utils/haptics';
import { Header } from '../components/common/Header';

type Props = NativeStackScreenProps<RootStackParamList, 'ProfileScreen'>;

export const ProfileScreen: React.FC<Props> = ({ navigation }) => {
  const { user, logout, updateProfile, updatePassword, resetToInitialProfile } = useAuth();
  const { orders, statistics } = useOrders();
  const { customers } = useCustomers();
  const { products } = useProducts();

  // Estados de Modales
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
  const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false);

  // Estados de Formulario de Edición de Perfil
  const [editName, setEditName] = useState(user?.name || '');
  const [editPhone, setEditPhone] = useState(user?.phone || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [editVehicleInfo, setEditVehicleInfo] = useState(user?.vehicleInfo || '');
  const [editDriverCode, setEditDriverCode] = useState(user?.driverCode || '');

  // Estados de Cambio de Contraseña
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  const isAdmin = user?.role === 'ADMIN';
  const isDistributor = user?.role === 'DISTRIBUTOR';

  const handleOpenEditModal = () => {
    hapticImpact('light');
    setEditName(user?.name || '');
    setEditPhone(user?.phone || '');
    setEditEmail(user?.email || '');
    setEditVehicleInfo(user?.vehicleInfo || '');
    setEditDriverCode(user?.driverCode || '');
    setIsEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('Nombre Requerido', 'Por favor ingresa tu nombre completo.');
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
    });

    if (res.success) {
      setIsEditModalVisible(false);
      Alert.alert('Perfil Actualizado 🎉', 'Tus datos fueron guardados y sincronizados en memoria.');
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
      Alert.alert('Contraseña Actualizada 🔒', 'Tu nueva clave de acceso ya está activa.');
    } else {
      Alert.alert('Error', res.error || 'Contraseña incorrecta.');
    }
  };

  const handleResetProfile = () => {
    Alert.alert(
      'Restablecer Datos de Cuenta',
      '¿Deseas restaurar la información predeterminada del usuario asignada por el sistema?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, Restablecer',
          style: 'destructive',
          onPress: async () => {
            hapticImpact('heavy');
            await resetToInitialProfile();
            Alert.alert('Restablecido', 'Los datos iniciales fueron restablecidos con éxito.');
          },
        },
      ]
    );
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
        rightActionIcon="create-outline"
        onRightActionPress={handleOpenEditModal}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ================================================================= */}
        {/* TARJETA DE IDENTIFICACIÓN CON BOTÓN DE EDICIÓN RÁPIDA */}
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

          {/* Botón Táctil de Edición Rápida (CRUD - Update) */}
          <TouchableOpacity
            style={styles.editProfileBtn}
            onPress={handleOpenEditModal}
            activeOpacity={0.8}
          >
            <Ionicons name="pencil" size={14} color={COLORS.primary} />
            <Text style={styles.editProfileBtnText}>Editar Datos</Text>
          </TouchableOpacity>
        </View>

        {/* ================================================================= */}
        {/* INFORMACIÓN DE CONTACTO */}
        {/* ================================================================= */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardHeaderTitle}>Información de Contacto</Text>
            <TouchableOpacity onPress={handleOpenEditModal} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.cardHeaderAction}>Modificar</Text>
            </TouchableOpacity>
          </View>

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
              <Text style={styles.infoValue}>Tacna, Perú (Centro, Cono Sur y Norte)</Text>
            </View>
          </View>
        </View>

        {/* ================================================================= */}
        {/* FICHA OPERATIVA DEL DISTRIBUIDOR */}
        {/* ================================================================= */}
        {isDistributor && (
          <>
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardHeaderTitle}>Unidad Asignada</Text>
                <TouchableOpacity onPress={handleOpenEditModal}>
                  <Text style={styles.cardHeaderAction}>Cambiar</Text>
                </TouchableOpacity>
              </View>

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

        {/* ================================================================= */}
        {/* RESUMEN ADMINISTRATIVO */}
        {/* ================================================================= */}
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
                <Text style={styles.statLabel}>Clientes Activos</Text>
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

        {/* ================================================================= */}
        {/* ACCIONES DE SEGURIDAD Y CONFIGURACIÓN (CRUD) */}
        {/* ================================================================= */}
        <View style={styles.card}>
          <Text style={styles.cardHeaderTitle}>Seguridad y Opciones de Cuenta</Text>

          {/* Cambiar Contraseña */}
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

          <View style={styles.infoDivider} />

          {/* Restablecer Valores Iniciales (CRUD - Reset) */}
          <TouchableOpacity
            style={styles.actionRowBtn}
            onPress={handleResetProfile}
            activeOpacity={0.7}
          >
            <View style={[styles.actionRowIcon, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="refresh-outline" size={18} color="#D97706" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionRowTitle}>Restablecer Valores de Fábrica</Text>
              <Text style={styles.actionRowSub}>Revertir cambios del usuario al valor inicial</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        {/* ================================================================= */}
        {/* BOTÓN FORMAL DE CIERRE DE SESIÓN */}
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
      {/* MODAL 1: EDITAR DATOS DE PERFIL (CRUD - UPDATE) */}
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
                <Text style={styles.modalSubtitle}>Actualiza tus datos de contacto y unidad</Text>
              </View>
              <TouchableOpacity onPress={() => setIsEditModalVisible(false)}>
                <Ionicons name="close-circle" size={24} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              {/* Nombre Completo */}
              <Text style={styles.inputLabel}>Nombre Completo</Text>
              <TextInput
                style={styles.textInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Ej. Carlos Mendoza"
                placeholderTextColor={COLORS.textMuted}
              />

              {/* Teléfono */}
              <Text style={styles.inputLabel}>Teléfono / WhatsApp de Contacto</Text>
              <TextInput
                style={styles.textInput}
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="Ej. 987111222"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="phone-pad"
              />

              {/* Correo Electrónico */}
              <Text style={styles.inputLabel}>Correo Electrónico</Text>
              <TextInput
                style={styles.textInput}
                value={editEmail}
                onChangeText={setEditEmail}
                placeholder="Ej. carlos@distribucion.com"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              {/* Datos exclusivos de Chofer */}
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
      {/* MODAL 2: CAMBIAR CONTRASEÑA / PIN */}
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
      {/* MODAL 3: CONFIRMACIÓN DE CIERRE DE SESIÓN */}
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
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  editProfileBtnText: {
    fontSize: 12,
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
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  cardHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  cardHeaderAction: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
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
