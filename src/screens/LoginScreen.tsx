/**
 * ============================================================================
 * SCREEN: LoginScreen.tsx
 * Pantalla de Inicio de Sesión Corporativo Seguro con Control de Roles (RBAC)
 * ============================================================================
 */

import React, { useState } from 'react';
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
import { hapticImpact, hapticSelection, hapticNotification } from '../utils/haptics';

export const LoginScreen: React.FC = () => {
  const { login, registerUser } = useAuth();
  const { addCustomer } = useCustomers();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDemoSheetOpen, setIsDemoSheetOpen] = useState(false);

  // Estados del Modal de Auto-Registro de Clientes
  const [isRegisterModalVisible, setIsRegisterModalVisible] = useState(false);
  const [regName, setRegName] = useState('');
  const [regCustomerType, setRegCustomerType] = useState<CustomerType>('B2C');
  const [regPhone, setRegPhone] = useState('');
  const [regDistrict, setRegDistrict] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regErrors, setRegErrors] = useState<Record<string, string>>({});
  const [isRegSubmitting, setIsRegSubmitting] = useState(false);

  const handleRegisterClient = async () => {
    const errs: Record<string, string> = {};
    if (!regName.trim()) errs.name = 'Ingresa tu nombre o razón social';
    if (!regPhone.trim()) errs.phone = 'Ingresa un teléfono o celular de contacto';
    if (!regDistrict.trim()) errs.district = 'Indica el distrito o zona de entrega';
    if (!regAddress.trim()) errs.address = 'Indica tu dirección exacta de entrega';
    if (!regUsername.trim() || regUsername.trim().length < 3) {
      errs.username = 'Crea un usuario de al menos 3 caracteres';
    }
    if (!regPassword.trim() || regPassword.trim().length < 3) {
      errs.password = 'La contraseña debe tener al menos 3 caracteres';
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
        phone: regPhone.trim(),
        deliveryAddress: regAddress.trim(),
        district: regDistrict.trim(),
        customerType: regCustomerType,
        latitude: coords.latitude,
        longitude: coords.longitude,
      });

      // 2. Registrar cuenta de acceso en el sistema de autenticación
      const newAccount = {
        id: `user-cust-${Date.now()}`,
        username: regUsername.trim().toLowerCase(),
        password: regPassword.trim(),
        name: regName.trim(),
        phone: regPhone.trim(),
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

  // Helper para rellenar campos en modo desarrollo/pruebas sin bypassear la autenticación
  const handleSelectDemoCredentials = (userValue: string, passValue: string) => {
    hapticSelection();
    setIdentifier(userValue);
    setPassword(passValue);
    setErrorMessage(null);
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

            {/* Campo: Usuario / Correo */}
            <Text style={styles.inputLabel}>Usuario o Correo Electrónico</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="person-outline"
                size={20}
                color={COLORS.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.textInput}
                placeholder="Ej. distribuidor o donpepe@bodega.com"
                placeholderTextColor={COLORS.textMuted}
                value={identifier}
                onChangeText={(val) => {
                  setIdentifier(val);
                  if (errorMessage) setErrorMessage(null);
                }}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
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

            {/* Aviso de RBAC Inteligente */}
            <View style={styles.rbacNoticeRow}>
              <Ionicons name="shield-checkmark-outline" size={16} color={COLORS.primary} />
              <Text style={styles.rbacNoticeText}>
                Acceso RBAC: El sistema detectará automáticamente tu perfil (Distribuidor, Cliente o Admin).
              </Text>
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
          </View>

          {/* Tarjeta de Auto-Registro para Nuevos Clientes (B2B / B2C) */}
          <View style={styles.registerBox}>
            <View style={styles.registerBoxHeader}>
              <Ionicons name="sparkles" size={18} color={COLORS.primary} />
              <Text style={styles.registerBoxTitle}>¿Eres un nuevo cliente o negocio?</Text>
            </View>
            <Text style={styles.registerBoxDesc}>
              Regístrate en 1 minuto como Comercio (B2B) u Hogar (B2C) para realizar pedidos directos.
            </Text>
            <TouchableOpacity
              style={styles.registerBoxBtn}
              onPress={() => {
                hapticImpact('light');
                setIsRegisterModalVisible(true);
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="person-add-outline" size={16} color={COLORS.primary} />
              <Text style={styles.registerBoxBtnText}>Registrarme como Cliente</Text>
            </TouchableOpacity>
          </View>

          {/* Acordeón de Cuentas de Demostración para Pruebas Rápidas */}
          <View style={styles.demoHelperContainer}>
            <TouchableOpacity
              style={styles.demoHelperHeader}
              onPress={() => {
                setIsDemoSheetOpen(!isDemoSheetOpen);
                hapticImpact('light');
              }}
              activeOpacity={0.8}
            >
              <View style={styles.demoHelperHeaderLeft}>
                <Ionicons name="key-outline" size={16} color={COLORS.secondary} />
                <Text style={styles.demoHelperTitle}>
                  Credenciales de Demostración para Pruebas
                </Text>
              </View>
              <Ionicons
                name={isDemoSheetOpen ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>

            {isDemoSheetOpen && (
              <View style={styles.demoHelperBody}>
                <Text style={styles.demoHelperDesc}>
                  Toca una cuenta para completar automáticamente el formulario y probar la autenticación real:
                </Text>

                {/* Cuenta Distribuidor */}
                <TouchableOpacity
                  style={styles.demoCredentialItem}
                  onPress={() => handleSelectDemoCredentials('distribuidor', '123')}
                  activeOpacity={0.7}
                >
                  <View style={styles.demoItemBadgeDist}>
                    <Ionicons name="bicycle" size={14} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.demoItemTitle}>Rol: Distribuidor / Conductor</Text>
                    <Text style={styles.demoItemDetails}>
                      Usuario: <Text style={styles.boldText}>distribuidor</Text> • Clave: <Text style={styles.boldText}>123</Text>
                    </Text>
                    <Text style={styles.demoItemSub}>Carlos Mendoza (Camión 02)</Text>
                  </View>
                  <Ionicons name="copy-outline" size={16} color={COLORS.primary} />
                </TouchableOpacity>

                {/* Cuenta Cliente 1 */}
                <TouchableOpacity
                  style={styles.demoCredentialItem}
                  onPress={() => handleSelectDemoCredentials('cliente', '123')}
                  activeOpacity={0.7}
                >
                  <View style={styles.demoItemBadgeClient}>
                    <Ionicons name="storefront" size={14} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.demoItemTitle}>Rol: Cliente Final</Text>
                    <Text style={styles.demoItemDetails}>
                      Usuario: <Text style={styles.boldText}>cliente</Text> • Clave: <Text style={styles.boldText}>123</Text>
                    </Text>
                    <Text style={styles.demoItemSub}>Bodega Don Pepe (Tacna Cercado)</Text>
                  </View>
                  <Ionicons name="copy-outline" size={16} color={COLORS.primary} />
                </TouchableOpacity>

                {/* Cuenta Cliente 2 */}
                <TouchableOpacity
                  style={styles.demoCredentialItem}
                  onPress={() => handleSelectDemoCredentials('restaurante', '123')}
                  activeOpacity={0.7}
                >
                  <View style={styles.demoItemBadgeClient}>
                    <Ionicons name="restaurant" size={14} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.demoItemTitle}>Rol: Cliente Final (Restaurante)</Text>
                    <Text style={styles.demoItemDetails}>
                      Usuario: <Text style={styles.boldText}>restaurante</Text> • Clave: <Text style={styles.boldText}>123</Text>
                    </Text>
                    <Text style={styles.demoItemSub}>Restaurante El Buen Sabor</Text>
                  </View>
                  <Ionicons name="copy-outline" size={16} color={COLORS.primary} />
                </TouchableOpacity>

                {/* Cuenta Administrador */}
                <TouchableOpacity
                  style={styles.demoCredentialItem}
                  onPress={() => handleSelectDemoCredentials('admin', 'admin')}
                  activeOpacity={0.7}
                >
                  <View style={styles.demoItemBadgeAdmin}>
                    <Ionicons name="settings-sharp" size={14} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.demoItemTitle}>Rol: Administrador General</Text>
                    <Text style={styles.demoItemDetails}>
                      Usuario: <Text style={styles.boldText}>admin</Text> • Clave: <Text style={styles.boldText}>admin</Text>
                    </Text>
                    <Text style={styles.demoItemSub}>Gestión de Cuentas y Flota</Text>
                  </View>
                  <Ionicons name="copy-outline" size={16} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
            )}
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
              <Text style={styles.regSubtitle}>
                Crea tu cuenta para comprar y solicitar despachos a tu domicilio o local comercial.
              </Text>

              {/* Selector de Perfil B2B vs B2C */}
              <Text style={styles.regFieldLabel}>¿Qué tipo de cliente eres? *</Text>
              <View style={styles.regTypeRow}>
                <TouchableOpacity
                  style={[
                    styles.regTypeBtn,
                    regCustomerType === 'B2B' && styles.regTypeBtnActiveB2B,
                  ]}
                  onPress={() => {
                    setRegCustomerType('B2B');
                    hapticSelection();
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="storefront"
                    size={16}
                    color={regCustomerType === 'B2B' ? '#1D4ED8' : COLORS.textSecondary}
                  />
                  <Text
                    style={[
                      styles.regTypeText,
                      regCustomerType === 'B2B' && styles.regTypeTextActiveB2B,
                    ]}
                  >
                    Negocio (B2B)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.regTypeBtn,
                    regCustomerType === 'B2C' && styles.regTypeBtnActiveB2C,
                  ]}
                  onPress={() => {
                    setRegCustomerType('B2C');
                    hapticSelection();
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="person"
                    size={16}
                    color={regCustomerType === 'B2C' ? '#047857' : COLORS.textSecondary}
                  />
                  <Text
                    style={[
                      styles.regTypeText,
                      regCustomerType === 'B2C' && styles.regTypeTextActiveB2C,
                    ]}
                  >
                    Hogar (B2C)
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Nombre o Razón Social */}
              <CustomInput
                label="Nombre Completo o Razón Social"
                placeholder={
                  regCustomerType === 'B2B'
                    ? 'Ej. Bodega La Esquina / Restaurante El Sol'
                    : 'Ej. Juan Pérez / Familia Gómez'
                }
                value={regName}
                onChangeText={(t) => {
                  setRegName(t);
                  if (regErrors.name) setRegErrors((p) => ({ ...p, name: '' }));
                }}
                required
                icon={regCustomerType === 'B2B' ? 'business-outline' : 'person-outline'}
                error={regErrors.name}
              />

              {/* Teléfono / Celular */}
              <CustomInput
                label="Teléfono Celular / WhatsApp"
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

              {/* Distrito */}
              <CustomInput
                label="Distrito o Ciudad"
                placeholder="Ej. Tacna, Pocollay, Gregorio Albarracín..."
                value={regDistrict}
                onChangeText={(t) => {
                  setRegDistrict(t);
                  if (regErrors.district) setRegErrors((p) => ({ ...p, district: '' }));
                }}
                required
                icon="navigate-circle-outline"
                error={regErrors.district}
              />

              {/* Chips Rápidos de Distritos */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {AVAILABLE_DISTRICTS.slice(0, 6).map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.regDistChip, regDistrict === d && styles.regDistChipActive]}
                    onPress={() => setRegDistrict(d)}
                  >
                    <Text style={[styles.regDistChipText, regDistrict === d && styles.regDistChipTextActive]}>
                      {d}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Dirección de Entrega */}
              <CustomInput
                label="Dirección de Entrega"
                placeholder="Ej. Av. Bolognesi 845, Int. 2"
                value={regAddress}
                onChangeText={(t) => {
                  setRegAddress(t);
                  if (regErrors.address) setRegErrors((p) => ({ ...p, address: '' }));
                }}
                required
                icon="location-outline"
                error={regErrors.address}
              />

              {/* Credenciales de Acceso */}
              <View style={styles.regCredentialsBox}>
                <Text style={styles.regCredentialsTitle}>Crea tus Credenciales de Acceso:</Text>
                
                <CustomInput
                  label="Nombre de Usuario"
                  placeholder="Ej. mimercado / maria123"
                  value={regUsername}
                  onChangeText={(t) => {
                    setRegUsername(t);
                    if (regErrors.username) setRegErrors((p) => ({ ...p, username: '' }));
                  }}
                  required
                  icon="at-outline"
                  error={regErrors.username}
                />

                <CustomInput
                  label="Contraseña"
                  placeholder="Mínimo 3 caracteres"
                  value={regPassword}
                  onChangeText={(t) => {
                    setRegPassword(t);
                    if (regErrors.password) setRegErrors((p) => ({ ...p, password: '' }));
                  }}
                  required
                  icon="lock-closed-outline"
                  error={regErrors.password}
                />
              </View>

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
  rbacNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: RADIUS.md,
    padding: 10,
    gap: 8,
    marginTop: 6,
    marginBottom: 16,
  },
  rbacNoticeText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '600',
    flex: 1,
    lineHeight: 15,
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
  registerBox: {
    marginTop: 18,
    backgroundColor: '#EFF6FF',
    borderRadius: RADIUS.md,
    padding: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  registerBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  registerBoxTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
  },
  registerBoxDesc: {
    fontSize: 11,
    color: COLORS.textSecondary,
    lineHeight: 16,
    marginBottom: 10,
  },
  registerBoxBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    paddingVertical: 10,
    gap: 6,
  },
  registerBoxBtnText: {
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
  regSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 14,
    lineHeight: 17,
  },
  regFieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.secondary,
    marginBottom: 8,
  },
  regTypeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  regTypeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  regTypeBtnActiveB2B: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  regTypeBtnActiveB2C: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
  },
  regTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  regTypeTextActiveB2B: {
    color: '#1D4ED8',
    fontWeight: '800',
  },
  regTypeTextActiveB2C: {
    color: '#047857',
    fontWeight: '800',
  },
  regDistChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  regDistChipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: COLORS.primary,
  },
  regDistChipText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  regDistChipTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  regCredentialsBox: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 4,
    marginBottom: 14,
  },
  regCredentialsTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.secondary,
    marginBottom: 10,
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
  /* Helper de Demostración */
  demoHelperContainer: {
    marginTop: 20,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  demoHelperHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8FAFC',
  },
  demoHelperHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  demoHelperTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.secondary,
  },
  demoHelperBody: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 8,
  },
  demoHelperDesc: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 4,
    lineHeight: 15,
  },
  demoCredentialItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.sm,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  demoItemBadgeDist: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoItemBadgeClient: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoItemBadgeAdmin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#475569',
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoItemTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  demoItemDetails: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  demoItemSub: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  boldText: {
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
});
