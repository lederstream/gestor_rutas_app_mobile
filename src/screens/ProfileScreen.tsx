import React, { useState, useMemo, useEffect } from 'react';
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
import { LocationPickerModal } from '../components/common/LocationPickerModal';
import { FloatingBottomDock } from '../components/common/FloatingBottomDock';
import {
  getSavedDistricts,
  addDistrict,
  updateDistrict,
  deleteDistrict,
  resetDefaultDistricts,
} from '../services/districtService';

type Props = NativeStackScreenProps<RootStackParamList, 'ProfileScreen'>;

export const ProfileScreen: React.FC<Props> = ({ navigation }) => {
  const { user, logout, updateProfile, updatePassword, accounts } = useAuth();
  const { orders, statistics, getStatisticsForUser } = useOrders();
  const { customers, getCustomerById, updateCustomer } = useCustomers();
  const { products } = useProducts();

  // Métricas del usuario actual
  const userStats = useMemo(() => {
    return getStatisticsForUser(user);
  }, [getStatisticsForUser, user, orders]);

  // Estados de Modales
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
  const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false);
  const [isMapModalVisible, setIsMapModalVisible] = useState(false);

  // Estados de Formulario de Edición
  const [editName, setEditName] = useState(user?.name || '');
  const [editPhone, setEditPhone] = useState(user?.phone || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [editVehicleInfo, setEditVehicleInfo] = useState(user?.vehicleInfo || '');
  const [editDriverCode, setEditDriverCode] = useState(user?.driverCode || '');
  const [editAddress, setEditAddress] = useState(user?.deliveryAddress || '');
  const [editReference, setEditReference] = useState(user?.addressReference || '');

  // Estados de Cambio de Contraseña con visibilidad
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Estados de Gestión de Zonas y Distritos (Admin)
  const [districts, setDistricts] = useState<string[]>([]);
  const [isDistrictModalVisible, setIsDistrictModalVisible] = useState(false);
  const [newDistrictInput, setNewDistrictInput] = useState('');
  const [editingDistrictOldName, setEditingDistrictOldName] = useState<string | null>(null);
  const [editingDistrictNewInput, setEditingDistrictNewInput] = useState('');

  const isAdmin = user?.role === 'ADMIN';
  const isDistributor = user?.role === 'DISTRIBUTOR';
  const isClient = user?.role === 'CLIENT';

  // Cargar distritos activos de Tacna
  useEffect(() => {
    getSavedDistricts().then(setDistricts);
  }, []);

  // Pedidos del cliente si es rol cliente
  const clientOrdersCount = orders.filter(
    (o) =>
      o.customerId === user?.customerId ||
      o.customerName.toLowerCase() === user?.name.toLowerCase()
  ).length;

  // Conteo reactivo de choferes para el atajo de administración
  const distributorsCount = useMemo(() => {
    return accounts.filter((a) => a.role === 'DISTRIBUTOR').length;
  }, [accounts]);

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

  const handleSelectGpsLocation = async (coords: { latitude: number; longitude: number }) => {
    setIsMapModalVisible(false);
    hapticImpact('medium');

    const res = await updateProfile({
      latitude: coords.latitude,
      longitude: coords.longitude,
    });

    if (user?.customerId) {
      const existing = getCustomerById(user.customerId);
      if (existing) {
        updateCustomer({
          ...existing,
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
      }
    }

    if (res.success) {
      Alert.alert(
        'Ubicación Guardada 🎉',
        'Tu PIN exacto en el mapa ha sido actualizado. El camión de reparto podrá navegar directo a tu local.'
      );
    } else {
      Alert.alert('Error', res.error || 'No se pudo actualizar la ubicación.');
    }
  };

  const handleOpenPasswordModal = () => {
    hapticImpact('light');
    setCurrentPass('');
    setNewPass('');
    setConfirmPass('');
    setShowCurrentPass(false);
    setShowNewPass(false);
    setShowConfirmPass(false);
    setIsPasswordModalVisible(true);
  };

  const handleSavePassword = async () => {
    if (!currentPass.trim() || !newPass.trim() || !confirmPass.trim()) {
      Alert.alert('Campos Incompletos', 'Por favor completa todos los campos de contraseña.');
      return;
    }
    if (newPass.length < 6) {
      Alert.alert('Seguridad de Contraseña', 'La nueva contraseña debe tener al menos 6 caracteres o dígitos.');
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
      Alert.alert('Error', res.error || 'Contraseña actual incorrecta.');
    }
  };

  // Manejadores CRUD de Distritos y Cobertura (Admin)
  const handleOpenDistrictsModal = async () => {
    hapticImpact('light');
    const list = await getSavedDistricts();
    setDistricts(list);
    setNewDistrictInput('');
    setEditingDistrictOldName(null);
    setIsDistrictModalVisible(true);
  };

  const handleAddDistrictAction = async () => {
    const res = await addDistrict(newDistrictInput);
    if (!res.success) {
      Alert.alert('Aviso', res.error || 'No se pudo agregar el distrito.');
      return;
    }
    setDistricts(res.districts);
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
    setDistricts(res.districts);
    setEditingDistrictOldName(null);
    setEditingDistrictNewInput('');
    hapticImpact('medium');
  };

  const handleDeleteDistrictAction = (distName: string) => {
    Alert.alert(
      'Eliminar Zona de Cobertura',
      `¿Deseas retirar "${distName}" de la lista de distritos autorizados en Tacna?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, Eliminar',
          style: 'destructive',
          onPress: async () => {
            const res = await deleteDistrict(distName);
            if (!res.success) {
              Alert.alert('Aviso', res.error || 'No se pudo eliminar el distrito.');
              return;
            }
            setDistricts(res.districts);
            hapticImpact('medium');
          },
        },
      ]
    );
  };

  const handleResetDistrictsAction = () => {
    Alert.alert(
      'Restablecer Cobertura Tacna',
      '¿Deseas restaurar la lista original de distritos de Tacna?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restablecer',
          onPress: async () => {
            const list = await resetDefaultDistricts();
            setDistricts(list);
            hapticImpact('medium');
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
        subtitle="Cuenta y preferencias"
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Cabecera de usuario */}
        <View style={styles.userCardCompact}>
          <View
            style={[
              styles.avatarBoxCompact,
              isAdmin
                ? styles.avatarAdmin
                : isDistributor
                ? styles.avatarDist
                : styles.avatarClient,
            ]}
          >
            <Text style={styles.avatarEmojiCompact}>
              {isAdmin ? '👑' : isDistributor ? '👨‍✈️' : '🏪'}
            </Text>
          </View>

          <View style={styles.userMetaCol}>
            <Text style={styles.userNameCompact} numberOfLines={1}>
              {user?.name || 'Usuario'}
            </Text>
            <Text style={styles.userUsernameCompact} numberOfLines={1}>
              @{user?.username || 'usuario'}
            </Text>

            <View
              style={[
                styles.roleBadgeCompact,
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
                size={11}
                color={
                  isAdmin ? '#6B21A8' : isDistributor ? '#0369A1' : '#047857'
                }
              />
              <Text
                style={[
                  styles.roleBadgeTextCompact,
                  isAdmin
                    ? styles.roleBadgeTextAdmin
                    : isDistributor
                    ? styles.roleBadgeTextDist
                    : styles.roleBadgeTextClient,
                ]}
              >
                {isAdmin
                  ? 'ADMIN'
                  : isDistributor
                  ? 'DISTRIBUIDOR'
                  : 'CLIENTE'}
              </Text>
            </View>
          </View>

          {/* Botón de edición compacto en la esquina */}
          <TouchableOpacity
            style={styles.editProfileBtnCompact}
            onPress={handleOpenEditModal}
            activeOpacity={0.8}
          >
            <Ionicons name="create-outline" size={13} color={COLORS.primary} />
            <Text style={styles.editProfileBtnTextCompact}>Editar</Text>
          </TouchableOpacity>
        </View>

        {/* Información de contacto */}
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

        {/* Datos según rol */}
        {isDistributor && (
          <>
            <View style={styles.card}>
              <Text style={styles.cardHeaderTitle}>Unidad de Distribución Especializada</Text>

              <View style={styles.infoRow}>
                <View style={[styles.iconSquare, { backgroundColor: '#F0FDF4' }]}>
                  <Ionicons name="cube-outline" size={18} color={COLORS.success} />
                </View>
                <View style={styles.infoCol}>
                  <Text style={styles.infoLabel}>Rubro / Especialidad</Text>
                  <Text style={styles.infoValue}>
                    {user?.specialtyLabel ||
                      (user?.specialtyCategory === 'GAS'
                        ? '🔥 Distribuidor de Gas GLP'
                        : user?.specialtyCategory === 'BAKERY'
                        ? '🥖 Distribuidora de Panadería'
                        : user?.specialtyCategory === 'CLEANING'
                        ? '🧴 Distribuidor de Productos de Limpieza'
                        : '💧 Distribuidor de Agua Purificada')}
                  </Text>
                </View>
              </View>

              <View style={styles.infoDivider} />

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
                  <Text style={styles.infoLabel}>Código de Distribuidor</Text>
                  <Text style={styles.infoValue}>{user?.driverCode || 'DIST-01'}</Text>
                </View>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardHeaderTitle}>Rendimiento de Hoy</Text>

              <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                  <Text style={styles.statNumber}>{userStats.deliveredOrders}</Text>
                  <Text style={styles.statLabel}>Entregas Listas</Text>
                </View>

                <View style={styles.statBox}>
                  <Text style={[styles.statNumber, { color: COLORS.statusInTransit }]}>
                    {userStats.inTransitOrders + userStats.pendingOrders}
                  </Text>
                  <Text style={styles.statLabel}>Por Entregar</Text>
                </View>

                <View style={styles.statBox}>
                  <Text style={[styles.statNumber, { color: COLORS.primary }]}>
                    {formatCurrency(userStats.totalRevenue)}
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

            {/* Fila de Ubicación GPS para la Hoja de Ruta */}
            <View style={styles.infoRow}>
              <View style={[styles.iconSquare, { backgroundColor: '#ECFDF5' }]}>
                <Ionicons name="navigate-circle-outline" size={18} color="#059669" />
              </View>
              <View style={styles.infoCol}>
                <Text style={styles.infoLabel}>Punto GPS en el Mapa</Text>
                <Text style={styles.infoValue}>
                  {user?.latitude && user?.longitude
                    ? `${user.latitude.toFixed(4)}, ${user.longitude.toFixed(4)}`
                    : 'Aún no has fijado tu PIN GPS'}
                </Text>
              </View>
              <View
                style={[
                  styles.gpsStatusPill,
                  user?.latitude ? styles.gpsStatusPillActive : styles.gpsStatusPillInactive,
                ]}
              >
                <Text
                  style={[
                    styles.gpsStatusPillText,
                    user?.latitude
                      ? styles.gpsStatusPillTextActive
                      : styles.gpsStatusPillTextInactive,
                  ]}
                >
                  {user?.latitude ? '📍 Listo' : '⚪ Pendiente'}
                </Text>
              </View>
            </View>

            {/* Botón interactivo para fijar/editar PIN GPS en mapa */}
            <TouchableOpacity
              style={styles.gpsPickerBtn}
              onPress={() => {
                hapticImpact('light');
                setIsMapModalVisible(true);
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="map-outline" size={16} color="#059669" />
              <Text style={styles.gpsPickerBtnText}>
                {user?.latitude ? 'Mover o Ajustar PIN en el Mapa' : 'Fijar Ubicación Exacta en el Mapa'}
              </Text>
            </TouchableOpacity>

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

        {/* Centro de Control y Administración para el Administrador */}
        {isAdmin && (
          <View style={styles.card}>
            <Text style={styles.cardHeaderTitle}>Centro de Control y Administración</Text>

            {/* Fila 1: Gestión de Flota y Distribuidores */}
            <TouchableOpacity
              style={styles.actionRowBtn}
              onPress={() => {
                hapticImpact('light');
                navigation.navigate('DriverListScreen');
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.actionRowIcon, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="people" size={18} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionRowTitle}>Flota y Distribuidores</Text>
                <Text style={styles.actionRowSub}>
                  {distributorsCount} conductores registrados en ruta (Gestionar)
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>

            <View style={styles.infoDivider} />

            {/* Fila 2: Gestión de Zonas y Distritos de Reparto */}
            <TouchableOpacity
              style={styles.actionRowBtn}
              onPress={handleOpenDistrictsModal}
              activeOpacity={0.7}
            >
              <View style={[styles.actionRowIcon, { backgroundColor: '#ECFDF5' }]}>
                <Ionicons name="map" size={18} color="#059669" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionRowTitle}>Zonas y Distritos de Reparto</Text>
                <Text style={styles.actionRowSub}>
                  {districts.length} zonas autorizadas en Tacna (Configurar)
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>

            {/* Vista previa de Distritos */}
            <View style={styles.districtChipsRow}>
              {districts.slice(0, 4).map((d) => (
                <View key={d} style={styles.districtChipBadge}>
                  <Text style={styles.districtChipBadgeText} numberOfLines={1}>
                    📍 {d}
                  </Text>
                </View>
              ))}
              {districts.length > 4 && (
                <TouchableOpacity
                  style={[styles.districtChipBadge, { backgroundColor: '#E2E8F0' }]}
                  onPress={handleOpenDistrictsModal}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.districtChipBadgeText, { color: COLORS.textSecondary }]}>
                    +{districts.length - 4} más
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* SEGURIDAD: CAMBIAR CONTRASEÑA */}
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

        {/* BOTÓN DE CIERRE DE SESIÓN SEGURO */}
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

      {/* Navegación Flotante en Burbujas para Distribuidor y Administrador */}
      <FloatingBottomDock activeTab="PROFILE" navigation={navigation} />

      {/* MODAL: EDITAR INFORMACIÓN DE PERFIL */}
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

                  <Text style={styles.inputLabel}>Código de Distribuidor</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editDriverCode}
                    onChangeText={setEditDriverCode}
                    placeholder="Ej. DIST-01"
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

      {/* MODAL: CAMBIAR CONTRASEÑA */}
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
            <View style={styles.passwordInputWrapper}>
              <TextInput
                style={styles.passwordInput}
                value={currentPass}
                onChangeText={setCurrentPass}
                placeholder="Ingresa tu contraseña actual"
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry={!showCurrentPass}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.passwordEyeBtn}
                onPress={() => setShowCurrentPass(!showCurrentPass)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={showCurrentPass ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Nueva Contraseña</Text>
            <View style={styles.passwordInputWrapper}>
              <TextInput
                style={styles.passwordInput}
                value={newPass}
                onChangeText={setNewPass}
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry={!showNewPass}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.passwordEyeBtn}
                onPress={() => setShowNewPass(!showNewPass)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={showNewPass ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Confirmar Nueva Contraseña</Text>
            <View style={styles.passwordInputWrapper}>
              <TextInput
                style={styles.passwordInput}
                value={confirmPass}
                onChangeText={setConfirmPass}
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry={!showConfirmPass}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.passwordEyeBtn}
                onPress={() => setShowConfirmPass(!showConfirmPass)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={showConfirmPass ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
            </View>

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

      {/* MODAL: GESTIÓN DE ZONAS Y DISTRITOS DE TACNA (ADMIN) */}
      <Modal
        visible={isDistrictModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsDistrictModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCardLarge}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[styles.actionRowIcon, { backgroundColor: '#ECFDF5', width: 32, height: 32 }]}>
                  <Ionicons name="map" size={16} color="#059669" />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Distritos de Cobertura</Text>
                  <Text style={styles.modalSubtitle}>Tacna y Zonas Autorizadas</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setIsDistrictModalVisible(false)}>
                <Ionicons name="close-circle" size={24} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Barra para agregar nuevo distrito */}
            <View style={styles.addDistrictInputRow}>
              <TextInput
                style={styles.addDistrictTextInput}
                placeholder="Nuevo distrito (Ej. Sama, Ite...)"
                placeholderTextColor={COLORS.textMuted}
                value={newDistrictInput}
                onChangeText={setNewDistrictInput}
              />
              <TouchableOpacity
                style={styles.addDistrictActionBtn}
                onPress={handleAddDistrictAction}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Lista con CRUD de Distritos */}
            <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
              {districts.map((dist, idx) => {
                const isEditingThis = editingDistrictOldName === dist;
                return (
                  <View key={dist + idx} style={styles.districtItemCard}>
                    {isEditingThis ? (
                      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <TextInput
                          style={styles.editDistrictTextInput}
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
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Ionicons name="location" size={15} color={COLORS.primary} />
                          <Text style={styles.districtItemText}>{dist}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <TouchableOpacity
                            style={styles.districtActionIconBtn}
                            onPress={() => handleStartEditDistrict(dist)}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="pencil" size={14} color={COLORS.primary} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.districtActionIconBtn, { backgroundColor: '#FEF2F2' }]}
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

            {/* Acciones Inferiores del Modal de Distritos */}
            <View style={styles.districtsModalBottomRow}>
              <TouchableOpacity
                style={styles.resetDistrictsBtn}
                onPress={handleResetDistrictsAction}
                activeOpacity={0.7}
              >
                <Ionicons name="refresh-outline" size={14} color="#64748B" />
                <Text style={styles.resetDistrictsBtnText}>Restablecer Tacna</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.closeDistrictsModalBtn}
                onPress={() => setIsDistrictModalVisible(false)}
                activeOpacity={0.85}
              >
                <Text style={styles.closeDistrictsModalBtnText}>Listo</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL: CONFIRMACIÓN DE CIERRE DE SESIÓN */}
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

      {/* MODAL: SELECCIÓN DE COORDENADAS GPS EN EL MAPA ESRI */}
      <LocationPickerModal
        visible={isMapModalVisible}
        onClose={() => setIsMapModalVisible(false)}
        onSelectLocation={handleSelectGpsLocation}
        initialLatitude={user?.latitude || -18.0139}
        initialLongitude={user?.longitude || -70.2519}
        title="Fijar tu Ubicación de Entrega"
        subtitle="Mueve el pin sobre el mapa para que el distribuidor llegue exacto"
        addressHint={user?.deliveryAddress}
      />
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
  userCardCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  avatarBoxCompact: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
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
  avatarEmojiCompact: {
    fontSize: 26,
  },
  userMetaCol: {
    flex: 1,
    justifyContent: 'center',
  },
  userNameCompact: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  userUsernameCompact: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  roleBadgeCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
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
  roleBadgeTextCompact: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
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
  editProfileBtnCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  editProfileBtnTextCompact: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
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
  gpsStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  gpsStatusPillActive: {
    backgroundColor: '#ECFDF5',
  },
  gpsStatusPillInactive: {
    backgroundColor: '#FEF3C7',
  },
  gpsStatusPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  gpsStatusPillTextActive: {
    color: '#059669',
  },
  gpsStatusPillTextInactive: {
    color: '#D97706',
  },
  gpsPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    marginTop: 10,
    marginBottom: 4,
  },
  gpsPickerBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
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
  passwordInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: RADIUS.sm,
    paddingHorizontal: 12,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  passwordEyeBtn: {
    padding: 6,
  },
  districtChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  districtChipBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  districtChipBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  addDistrictInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  addDistrictTextInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: RADIUS.sm,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  addDistrictActionBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  districtItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: RADIUS.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 6,
  },
  districtItemText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  districtActionIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editDistrictTextInput: {
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
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelEditDistrictBtn: {
    width: 28,
    height: 28,
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
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  resetDistrictsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: RADIUS.sm,
    backgroundColor: '#F1F5F9',
  },
  resetDistrictsBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  closeDistrictsModalBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: RADIUS.sm,
  },
  closeDistrictsModalBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
