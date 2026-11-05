import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useCustomers } from '../context/CustomerContext';
import { CustomerType } from '../models/Customer';
import {
  COLORS,
  SPACING,
  RADIUS,
  TOUCH_TARGET,
  AVAILABLE_DISTRICTS,
  DISTRICT_COORDINATES,
} from '../utils/constants';
import { CustomInput } from '../components/common/CustomInput';
import { getSavedDistricts } from '../services/districtService';
import { hapticImpact, hapticSelection, hapticNotification } from '../utils/haptics';

export const LoginScreen: React.FC = () => {
  const { login, registerUser } = useAuth();
  const { addCustomer } = useCustomers();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Estados del Modal de Auto-Registro de Clientes
  const [isRegisterModalVisible, setIsRegisterModalVisible] = useState(false);
  const [availableDistricts, setAvailableDistricts] = useState<string[]>(AVAILABLE_DISTRICTS);
  const [isDistrictModalOpen, setIsDistrictModalOpen] = useState(false);
  const [regName, setRegName] = useState('');
  const [regCustomerType, setRegCustomerType] = useState<CustomerType>('B2C');
  const [regPhone, setRegPhone] = useState('');
  const [regDistrict, setRegDistrict] = useState(AVAILABLE_DISTRICTS[0]);
  const [regAddress, setRegAddress] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regErrors, setRegErrors] = useState<Record<string, string>>({});
  const [isRegSubmitting, setIsRegSubmitting] = useState(false);

  // Cargar distritos dinámicos configurados por el Administrador
  useEffect(() => {
    getSavedDistricts().then((dists) => {
      if (dists && dists.length > 0) {
        setAvailableDistricts(dists);
        setRegDistrict(dists[0]);
      }
    });
  }, []);

  const handleRegisterClient = async () => {
    const cleanPhone = regPhone.replace(/\D/g, '');
    const errs: Record<string, string> = {};
    if (!regName.trim()) errs.name = 'Ingresa tu nombre o familia';
    if (!cleanPhone || cleanPhone.length !== 9) {
      errs.phone = 'Ingresa un celular válido de 9 dígitos';
    }
    if (!regDistrict.trim()) errs.district = 'Selecciona tu distrito en Tacna';
    if (!regAddress.trim()) errs.address = 'Indica tu dirección exacta de entrega';
    if (!regPassword.trim() || regPassword.trim().length < 6) {
      errs.password = 'La contraseña debe tener al menos 6 caracteres o dígitos';
    } else if (regPassword !== regConfirmPassword) {
      errs.confirmPassword = 'Las contraseñas no coinciden';
    }

    if (Object.keys(errs).length > 0) {
      setRegErrors(errs);
      hapticNotification('error');
      return;
    }

    setRegErrors({});
    setIsRegSubmitting(true);
    hapticImpact('medium');

    try {
      const coords = DISTRICT_COORDINATES[regDistrict] || {
        latitude: -18.0139,
        longitude: -70.2519,
      };

      // 1. Crear cliente en libreta de clientes
      const newCustomer = addCustomer({
        name: regName.trim(),
        phone: cleanPhone,
        deliveryAddress: regAddress.trim(),
        district: regDistrict.trim(),
        customerType: regCustomerType,
        latitude: coords.latitude,
        longitude: coords.longitude,
      });

      // 2. Registrar cuenta de acceso en el sistema de autenticación
      // Usuario asignado al número de celular
      const newAccount = {
        id: `user-cust-${Date.now()}`,
        username: cleanPhone,
        password: regPassword.trim(),
        name: regName.trim(),
        phone: cleanPhone,
        role: 'CLIENT' as const,
        customerId: newCustomer.id,
        deliveryAddress: regAddress.trim(),
        district: regDistrict.trim(),
        latitude: coords.latitude,
        longitude: coords.longitude,
      };

      await registerUser(newAccount);

      // 3. Autenticación inmediata
      await login(newAccount.username, newAccount.password);
      setIsRegisterModalVisible(false);
      hapticNotification('success');
      Alert.alert(
        '¡Registro Exitoso!',
        `¡Bienvenido ${newAccount.name}! Tu cuenta de cliente ha sido activada y ya puedes solicitar despachos.`
      );
    } catch {
      Alert.alert('Error', 'No se pudo completar el registro del cliente.');
    } finally {
      setIsRegSubmitting(false);
    }
  };

  const handleLogin = async () => {
    setErrorMessage(null);

    if (!identifier.trim()) {
      setErrorMessage('Ingresa tu nombre de usuario o correo electrónico.');
      return;
    }
    if (!password.trim()) {
      setErrorMessage('Ingresa tu contraseña de acceso.');
      return;
    }

    setIsLoading(true);
    hapticImpact('light');

    try {
      const result = await login(identifier, password);
      if (!result.success) {
        setErrorMessage(result.error || 'Credenciales incorrectas.');
      }
    } catch {
      setErrorMessage('Ocurrió un error inesperado al iniciar sesión.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Branding */}
          <View style={styles.brandHero}>
            <View style={styles.logoCircle}>
              <Ionicons name="cube" size={38} color={COLORS.primary} />
            </View>
            <Text style={styles.appName}>Gestor de Rutas</Text>
            <Text style={styles.appTagline}>
              Sistema Integral de Logística y Portal de Clientes
            </Text>
          </View>

          {/* Tarjeta Principal de Inicio de Sesión */}
          <View style={styles.loginCard}>
            <Text style={styles.cardHeaderTitle}>Iniciar Sesión</Text>
            <Text style={styles.cardHeaderSubtitle}>
              Ingresa tus credenciales para acceder a tu panel correspondiente
            </Text>

            {/* Mensaje de Error si aplica */}
            {errorMessage && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={18} color={COLORS.danger} />
                <Text style={styles.errorBannerText}>{errorMessage}</Text>
              </View>
            )}

            {/* Campo: Usuario / Celular / Correo */}
            <Text style={styles.inputLabel}>Usuario, Celular o Correo</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="person-outline"
                size={20}
                color={COLORS.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.textInput}
                placeholder="Ingresa tu celular, usuario o correo"
                placeholderTextColor={COLORS.textMuted}
                value={identifier}
                onChangeText={(val) => {
                  setIdentifier(val);
                  if (errorMessage) setErrorMessage(null);
                }}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Campo: Contraseña */}
            <Text style={styles.inputLabel}>Contraseña de Acceso</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={COLORS.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.textInput}
                placeholder="Ingresa tu contraseña"
                placeholderTextColor={COLORS.textMuted}
                value={password}
                onChangeText={(val) => {
                  setPassword(val);
                  if (errorMessage) setErrorMessage(null);
                }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.passwordToggleBtn}
                onPress={() => setShowPassword(!showPassword)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
            </View>

            {/* Botón Principal de Acceso */}
            <TouchableOpacity
              style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.88}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.submitButtonText}>Ingresar al Sistema</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>

            {/* Enlace Limpio para Nuevos Clientes */}
            <View style={styles.registerLinkRow}>
              <Text style={styles.registerPromptText}>¿No tienes una cuenta?</Text>
              <TouchableOpacity
                onPress={() => {
                  hapticImpact('light');
                  setIsRegisterModalVisible(true);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.registerActionLink}>Regístrate como cliente</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal de Auto-Registro para Nuevos Clientes */}
      <Modal
        visible={isRegisterModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsRegisterModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.regModalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.regModalCard}>
            <View style={styles.regModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="person-add" size={20} color={COLORS.primary} />
                <Text style={styles.regModalTitle}>Registro de Nuevo Cliente</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsRegisterModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.regModalScroll}
              keyboardShouldPersistTaps="handled"
            >
              {/* Nombre Completo */}
              <CustomInput
                label="Nombre Completo (Titular o Familia)"
                placeholder="Ej. Juan Pérez / Familia Gómez"
                value={regName}
                onChangeText={(t) => {
                  setRegName(t);
                  if (regErrors.name) setRegErrors((p) => ({ ...p, name: '' }));
                }}
                required
                icon="person-outline"
                error={regErrors.name}
              />

              {/* Teléfono / Celular (Será su Usuario de Login) */}
              <CustomInput
                label="Teléfono Celular (Será tu Usuario de Acceso)"
                placeholder="Ej. 987654321"
                value={regPhone}
                onChangeText={(t) => {
                  setRegPhone(t);
                  if (regErrors.phone) setRegErrors((p) => ({ ...p, phone: '' }));
                }}
                keyboardType="phone-pad"
                maxLength={9}
                required
                icon="call-outline"
                error={regErrors.phone}
              />

              {/* Distrito con Combobox Elegante */}
              <Text style={styles.comboboxLabel}>
                Distrito de Entrega en Tacna <Text style={{ color: COLORS.danger }}>*</Text>
              </Text>
              <TouchableOpacity
                style={[styles.districtComboboxPill, regErrors.district ? styles.districtComboboxError : undefined]}
                onPress={() => {
                  hapticImpact('light');
                  setIsDistrictModalOpen(true);
                }}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <Ionicons name="location" size={17} color={COLORS.primary} />
                  <Text style={styles.districtComboboxValue}>
                    {regDistrict || 'Selecciona un distrito'}
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={17} color="#64748B" />
              </TouchableOpacity>
              {regErrors.district ? (
                <Text style={styles.regErrorTextHelper}>{regErrors.district}</Text>
              ) : null}

              {/* Dirección de Entrega */}
              <CustomInput
                label="Dirección de Entrega Exacta"
                placeholder="Ej. Av. Bolognesi 845, Mz. B Lote 12"
                value={regAddress}
                onChangeText={(t) => {
                  setRegAddress(t);
                  if (regErrors.address) setRegErrors((p) => ({ ...p, address: '' }));
                }}
                required
                icon="home-outline"
                error={regErrors.address}
              />

              {/* Contraseña */}
              <CustomInput
                label="Contraseña de Acceso (Mínimo 6 dígitos)"
                placeholder="Crea tu clave o PIN de 6 dígitos"
                value={regPassword}
                onChangeText={(t) => {
                  setRegPassword(t);
                  if (regErrors.password) setRegErrors((p) => ({ ...p, password: '' }));
                }}
                required
                secureTextEntry
                icon="lock-closed-outline"
                error={regErrors.password}
              />

              {/* Confirmación de Contraseña */}
              <CustomInput
                label="Confirmar Contraseña"
                placeholder="Repite tu clave o PIN de 6 dígitos"
                value={regConfirmPassword}
                onChangeText={(t) => {
                  setRegConfirmPassword(t);
                  if (regErrors.confirmPassword) setRegErrors((p) => ({ ...p, confirmPassword: '' }));
                }}
                required
                secureTextEntry
                icon="shield-checkmark-outline"
                error={regErrors.confirmPassword}
              />

              {/* Botón de Confirmación */}
              <TouchableOpacity
                style={[styles.confirmRegBtn, isRegSubmitting && styles.confirmRegBtnDisabled]}
                onPress={handleRegisterClient}
                disabled={isRegSubmitting}
                activeOpacity={0.88}
              >
                {isRegSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                    <Text style={styles.confirmRegBtnText}>Completar Registro y Entrar</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal Desplegable de Selección de Distrito (Combobox) */}
      <Modal
        visible={isDistrictModalOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsDistrictModalOpen(false)}
      >
        <View style={styles.districtModalBackdrop}>
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={() => setIsDistrictModalOpen(false)}
          />
          <View style={styles.districtModalSheet}>
            <View style={styles.districtModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="location" size={18} color={COLORS.primary} />
                <Text style={styles.districtModalTitle}>Distritos de Cobertura Tacna</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsDistrictModalOpen(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 320 }}>
              {availableDistricts.map((d) => {
                const isSelected = regDistrict === d;
                return (
                  <TouchableOpacity
                    key={d}
                    style={[
                      styles.districtOptionItem,
                      isSelected && styles.districtOptionItemActive,
                    ]}
                    onPress={() => {
                      hapticSelection();
                      setRegDistrict(d);
                      if (regErrors.district) setRegErrors((p) => ({ ...p, district: '' }));
                      setIsDistrictModalOpen(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                      size={18}
                      color={isSelected ? COLORS.primary : '#94A3B8'}
                    />
                    <Text
                      style={[
                        styles.districtOptionText,
                        isSelected && styles.districtOptionTextActive,
                      ]}
                    >
                      {d}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
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
    padding: SPACING.lg,
    paddingBottom: 40,
  },
  brandHero: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  logoCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    marginBottom: 10,
  },
  appName: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.secondary,
    letterSpacing: -0.5,
  },
  appTagline: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 20,
    lineHeight: 18,
  },
  loginCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  cardHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.secondary,
  },
  cardHeaderSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 3,
    marginBottom: SPACING.md,
    lineHeight: 16,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: RADIUS.md,
    padding: 10,
    gap: 8,
    marginBottom: 14,
  },
  errorBannerText: {
    fontSize: 12,
    color: COLORS.danger,
    fontWeight: '600',
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 6,
    marginTop: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    height: TOUCH_TARGET.buttonHeight,
    marginBottom: 10,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
    height: '100%',
  },
  passwordToggleBtn: {
    padding: 6,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    height: TOUCH_TARGET.buttonHeight,
    gap: 8,
    elevation: 2,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  registerLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 18,
    paddingVertical: 4,
  },
  registerPromptText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  registerActionLink: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
  },
  /* Modal de Registro de Cliente */
  regModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  regModalCard: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: '90%',
    paddingBottom: 24,
  },
  regModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  regModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.secondary,
  },
  regModalScroll: {
    padding: 18,
  },
  comboboxLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 6,
    marginTop: 6,
  },
  districtComboboxPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    height: TOUCH_TARGET.buttonHeight,
    marginBottom: 10,
  },
  districtComboboxError: {
    borderColor: COLORS.danger,
    backgroundColor: '#FEF2F2',
  },
  districtComboboxValue: {
    fontSize: 13.5,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  regErrorTextHelper: {
    fontSize: 11,
    color: COLORS.danger,
    marginTop: -4,
    marginBottom: 8,
    fontWeight: '600',
  },
  districtModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  districtModalSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 18,
  },
  districtModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 8,
  },
  districtModalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.secondary,
  },
  districtOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: RADIUS.sm,
  },
  districtOptionItemActive: {
    backgroundColor: '#EFF6FF',
  },
  districtOptionText: {
    fontSize: 13.5,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  districtOptionTextActive: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  confirmRegBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    gap: 8,
    elevation: 2,
    marginTop: 6,
  },
  confirmRegBtnDisabled: {
    opacity: 0.6,
  },
  confirmRegBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
