import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Linking,
  StatusBar,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/RootNavigator';
import { useAuth } from '../context/AuthContext';
import { useOrders } from '../context/OrderContext';
import { UserAccount } from '../models/User';
import { ProductCategory } from '../models/Order';
import { COLORS, RADIUS, SPACING, TOUCH_TARGET } from '../utils/constants';
import { Header } from '../components/common/Header';
import { FloatingBottomDock } from '../components/common/FloatingBottomDock';
import { hapticImpact, hapticSelection } from '../utils/haptics';

type Props = NativeStackScreenProps<RootStackParamList, 'DriverListScreen'>;

export const DriverListScreen: React.FC<Props> = ({ navigation }) => {
  const { accounts, registerUser, updateAccount, deleteAccount } = useAuth();
  const { orders } = useOrders();

  // Estados de Búsqueda y Filtro por Rubro
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Estados de Modal Formulario (Crear / Editar)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<UserAccount | null>(null);

  // Campos del formulario
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formVehicle, setFormVehicle] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formCategory, setFormCategory] = useState<ProductCategory>('WATER');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('123');

  // Obtener lista reactiva de distribuidores
  const allDrivers = useMemo(() => {
    return accounts.filter((a) => a.role === 'DISTRIBUTOR');
  }, [accounts]);

  // Filtrado de distribuidores por texto y por rubro
  const filteredDrivers = useMemo(() => {
    return allDrivers.filter((driver) => {
      // Filtro por Rubro
      if (categoryFilter !== 'ALL' && driver.specialtyCategory !== categoryFilter) {
        return false;
      }
      // Filtro por Buscador
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        driver.name.toLowerCase().includes(q) ||
        driver.phone.includes(q) ||
        (driver.driverCode && driver.driverCode.toLowerCase().includes(q)) ||
        (driver.vehicleInfo && driver.vehicleInfo.toLowerCase().includes(q))
      );
    });
  }, [allDrivers, categoryFilter, searchQuery]);

  // Pedidos activos asignados a cada chofer en ruta
  const getActiveOrdersCountForDriver = (driverName: string) => {
    return orders.filter(
      (o) =>
        o.driverAssigned &&
        o.driverAssigned.toLowerCase().includes(driverName.toLowerCase()) &&
        (o.status === 'PENDING' || o.status === 'IN_TRANSIT')
    ).length;
  };

  // Abrir Modal para Crear
  const handleOpenCreateModal = () => {
    hapticImpact('light');
    setEditingDriver(null);
    setFormName('');
    setFormPhone('');
    setFormVehicle('');
    setFormCode(`DIST-0${allDrivers.length + 1}`);
    setFormCategory('WATER');
    setFormUsername(`dist_${Date.now().toString().slice(-4)}`);
    setFormPassword('123');
    setIsModalOpen(true);
  };

  // Abrir Modal para Editar
  const handleOpenEditModal = (driver: UserAccount) => {
    hapticImpact('light');
    setEditingDriver(driver);
    setFormName(driver.name);
    setFormPhone(driver.phone);
    setFormVehicle(driver.vehicleInfo || '');
    setFormCode(driver.driverCode || '');
    setFormCategory(driver.specialtyCategory || 'WATER');
    setFormUsername(driver.username);
    setFormPassword(driver.password || '123');
    setIsModalOpen(true);
  };

  // Guardar Conductor (Create or Update)
  const handleSaveDriver = async () => {
    if (!formName.trim()) {
      Alert.alert('Nombre Requerido', 'Por favor ingresa el nombre del distribuidor.');
      return;
    }
    if (!formPhone.trim()) {
      Alert.alert('Teléfono Requerido', 'Ingresa el número celular de contacto.');
      return;
    }

    const catLabelMap: Record<ProductCategory, string> = {
      WATER: 'Distribuidor de Agua Purificada',
      GAS: 'Distribuidor de Gas GLP',
      BAKERY: 'Distribuidor de Panadería',
      CLEANING: 'Distribuidor de Productos de Limpieza',
    };

    if (editingDriver) {
      // Actualizar chofer existente
      const updated: UserAccount = {
        ...editingDriver,
        name: formName.trim(),
        phone: formPhone.trim(),
        vehicleInfo: formVehicle.trim() || undefined,
        driverCode: formCode.trim() || undefined,
        specialtyCategory: formCategory,
        specialtyLabel: catLabelMap[formCategory],
        password: formPassword.trim() || editingDriver.password,
      };
      await updateAccount(updated);
      Alert.alert('Distribuidor Actualizado 🎉', `${updated.name} fue actualizado exitosamente.`);
    } else {
      // Registrar nuevo chofer
      const newAcc: UserAccount = {
        id: `user-dist-${Date.now()}`,
        username: formUsername.trim().toLowerCase() || `dist_${Date.now()}`,
        password: formPassword.trim() || '123',
        name: formName.trim(),
        phone: formPhone.trim(),
        role: 'DISTRIBUTOR',
        vehicleInfo: formVehicle.trim() || `Camión (Placa Z${Math.floor(100 + Math.random() * 900)})`,
        driverCode: formCode.trim() || `DIST-0${allDrivers.length + 1}`,
        specialtyCategory: formCategory,
        specialtyLabel: catLabelMap[formCategory],
      };
      await registerUser(newAcc);
      Alert.alert('Distribuidor Registrado 🚀', `${newAcc.name} ha sido dado de alta en la flota.`);
    }

    setIsModalOpen(false);
  };

  // Confirmar Eliminación (Delete)
  const handleDeleteDriver = (driver: UserAccount) => {
    if (allDrivers.length <= 1) {
      Alert.alert('Operación Bloqueada', 'Debe mantenerse al menos un distribuidor activo en la flota.');
      return;
    }

    Alert.alert(
      'Dar de Baja Distribuidor',
      `¿Deseas retirar a ${driver.name} (${driver.driverCode || 'Distribuidor'}) de la flota activa?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, Eliminar',
          style: 'destructive',
          onPress: async () => {
            await deleteAccount(driver.id);
          },
        },
      ]
    );
  };

  // Llamada telefónica
  const handleCall = (phone: string, name: string) => {
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('Contacto', `Llamar a ${name}: ${phone}`);
    });
  };

  // WhatsApp
  const handleWhatsApp = (phone: string, name: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const prefix = cleanPhone.length === 9 ? '51' : '';
    const message = encodeURIComponent(`Hola ${name}, te saludamos de la Central de Despacho.`);
    Linking.openURL(`https://wa.me/${prefix}${cleanPhone}?text=${message}`).catch(() => {
      Alert.alert('WhatsApp', `Enviar mensaje a ${phone}`);
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

      <Header
        title="Flota y Distribuidores"
        subtitle={`${allDrivers.length} choferes especializados en ruta`}
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
        rightActionIcon="person-add"
        onRightActionPress={handleOpenCreateModal}
      />

      {/* Buscador Rápido */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por chofer, placa o código..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Píldoras de Filtro por Rubro Especializado */}
      <View style={styles.filterScrollWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          {[
            { key: 'ALL', label: `✨ Todos (${allDrivers.length})` },
            { key: 'WATER', label: '💧 Agua' },
            { key: 'GAS', label: '🔥 Gas GLP' },
            { key: 'BAKERY', label: '🥖 Panadería' },
            { key: 'CLEANING', label: '🧴 Limpieza' },
          ].map((cat) => (
            <TouchableOpacity
              key={cat.key}
              style={[
                styles.categoryFilterChip,
                categoryFilter === cat.key && styles.categoryFilterChipActive,
              ]}
              onPress={() => {
                hapticSelection();
                setCategoryFilter(cat.key);
              }}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.categoryFilterChipText,
                  categoryFilter === cat.key && styles.categoryFilterChipTextActive,
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Lista de Distribuidores */}
      <FlatList
        data={filteredDrivers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={56} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No se encontraron distribuidores</Text>
            <Text style={styles.emptySubtitle}>
              Prueba cambiando el término de búsqueda o registra un nuevo conductor.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const categoryEmoji =
            item.specialtyCategory === 'GAS'
              ? '🔥'
              : item.specialtyCategory === 'BAKERY'
              ? '🥖'
              : item.specialtyCategory === 'CLEANING'
              ? '🧴'
              : '💧';

          const activeCount = getActiveOrdersCountForDriver(item.name);

          return (
            <View style={styles.driverCard}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.avatarEmojiBadge}>
                  <Text style={{ fontSize: 22 }}>{categoryEmoji}</Text>
                </View>

                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.driverName}>{item.name}</Text>
                  <View style={styles.driverCodeRow}>
                    <Text style={styles.driverCodeText}>{item.driverCode || 'DIST'}</Text>
                    <Text style={styles.driverDot}>•</Text>
                    <Text style={styles.driverSpecialtyText}>
                      {item.specialtyLabel || 'Distribuidor'}
                    </Text>
                  </View>
                </View>

                {/* Acciones de Edición y Eliminación */}
                <View style={styles.cardActionsRow}>
                  <TouchableOpacity
                    style={styles.cardActionIconBtn}
                    onPress={() => handleOpenEditModal(item)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="pencil" size={15} color={COLORS.primary} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.cardActionIconBtn, { backgroundColor: '#FEF2F2' }]}
                    onPress={() => handleDeleteDriver(item)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={15} color={COLORS.danger} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Datos del Vehículo y Entregas Activas */}
              <View style={styles.detailsRow}>
                <View style={styles.detailItem}>
                  <Ionicons name="car-outline" size={14} color="#64748B" />
                  <Text style={styles.detailItemText} numberOfLines={1}>
                    {item.vehicleInfo || 'Camión de Carga'}
                  </Text>
                </View>

                <View style={styles.detailItem}>
                  <Ionicons name="cube-outline" size={14} color={COLORS.primary} />
                  <Text style={[styles.detailItemText, { fontWeight: '700', color: COLORS.primary }]}>
                    {activeCount} {activeCount === 1 ? 'pedido activo' : 'pedidos activos'}
                  </Text>
                </View>
              </View>

              {/* Botones de Contacto Rápido */}
              <View style={styles.contactRow}>
                <TouchableOpacity
                  style={styles.contactBtn}
                  onPress={() => handleCall(item.phone, item.name)}
                  activeOpacity={0.75}
                >
                  <Ionicons name="call" size={13} color="#2563EB" />
                  <Text style={styles.contactBtnText}>Llamar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.contactBtn, styles.whatsappBtn]}
                  onPress={() => handleWhatsApp(item.phone, item.name)}
                  activeOpacity={0.75}
                >
                  <Ionicons name="logo-whatsapp" size={13} color="#16A34A" />
                  <Text style={[styles.contactBtnText, { color: '#16A34A' }]}>WhatsApp</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      {/* Floating Dock de Navegación */}
      <FloatingBottomDock activeTab="PROFILE" navigation={navigation} />

      {/* MODAL: FORMULARIO AGREGAR / EDITAR DISTRIBUIDOR */}
      <Modal
        visible={isModalOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons
                  name={editingDriver ? 'pencil' : 'person-add'}
                  size={20}
                  color={COLORS.primary}
                />
                <Text style={styles.modalTitle}>
                  {editingDriver ? 'Editar Distribuidor' : 'Nuevo Distribuidor'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              <Text style={styles.inputLabel}>Nombre Completo</Text>
              <TextInput
                style={styles.textInput}
                value={formName}
                onChangeText={setFormName}
                placeholder="Ej. Marco Mamani"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.inputLabel}>Teléfono Celular (WhatsApp)</Text>
              <TextInput
                style={styles.textInput}
                value={formPhone}
                onChangeText={setFormPhone}
                placeholder="Ej. 952001122"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
              />

              <Text style={styles.inputLabel}>Vehículo Asignado y Placa</Text>
              <TextInput
                style={styles.textInput}
                value={formVehicle}
                onChangeText={setFormVehicle}
                placeholder="Ej. Camión 04 (Placa Z4C-230)"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.inputLabel}>Código Único de Distribuidor</Text>
              <TextInput
                style={styles.textInput}
                value={formCode}
                onChangeText={setFormCode}
                placeholder="Ej. DIST-05"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.inputLabel}>Rubro Especializado de Carga</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {[
                  { key: 'WATER' as ProductCategory, label: '💧 Agua Purificada' },
                  { key: 'GAS' as ProductCategory, label: '🔥 Gas GLP' },
                  { key: 'BAKERY' as ProductCategory, label: '🥖 Panadería' },
                  { key: 'CLEANING' as ProductCategory, label: '🧴 Limpieza' },
                ].map((cat) => (
                  <TouchableOpacity
                    key={cat.key}
                    style={[
                      styles.categoryOptionBtn,
                      formCategory === cat.key && styles.categoryOptionBtnActive,
                    ]}
                    onPress={() => setFormCategory(cat.key)}
                  >
                    <Text
                      style={[
                        styles.categoryOptionBtnText,
                        formCategory === cat.key && styles.categoryOptionBtnTextActive,
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {!editingDriver && (
                <>
                  <Text style={styles.inputLabel}>Usuario de Acceso</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formUsername}
                    onChangeText={setFormUsername}
                    placeholder="Ej. dist_marco"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="none"
                  />
                </>
              )}

              <Text style={styles.inputLabel}>Contraseña de Acceso</Text>
              <TextInput
                style={styles.textInput}
                value={formPassword}
                onChangeText={setFormPassword}
                placeholder="Clave de acceso"
                placeholderTextColor="#94A3B8"
              />

              <View style={styles.modalButtonsRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setIsModalOpen(false)}
                >
                  <Text style={styles.cancelBtnText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleSaveDriver}
                >
                  <Text style={styles.saveBtnText}>
                    {editingDriver ? 'Guardar Cambios' : 'Registrar Chofer'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  searchSection: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    backgroundColor: COLORS.surface,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  filterScrollWrapper: {
    backgroundColor: COLORS.surface,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterScrollContent: {
    paddingHorizontal: SPACING.md,
    gap: 8,
  },
  categoryFilterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryFilterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryFilterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  categoryFilterChipTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: SPACING.md,
    paddingBottom: 110,
    gap: 12,
  },
  driverCard: {
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
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarEmojiBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  driverName: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  driverCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  driverCodeText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primary,
  },
  driverDot: {
    fontSize: 11,
    color: '#94A3B8',
  },
  driverSpecialtyText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardActionIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.md,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  detailItemText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  contactRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  contactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
    backgroundColor: '#EFF6FF',
    gap: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  whatsappBtn: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  contactBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  /* Modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    padding: SPACING.md,
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    maxHeight: '90%',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.secondary,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 4,
    marginTop: 6,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: RADIUS.sm,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  categoryOptionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.sm,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  categoryOptionBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#EFF6FF',
  },
  categoryOptionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  categoryOptionBtnTextActive: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: TOUCH_TARGET.buttonHeight,
    borderRadius: RADIUS.md,
    backgroundColor: '#F1F5F9',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  saveBtn: {
    flex: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    height: TOUCH_TARGET.buttonHeight,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
