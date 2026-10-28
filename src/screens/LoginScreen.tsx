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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { COLORS, SPACING, RADIUS, TOUCH_TARGET } from '../utils/constants';
import { hapticImpact, hapticSelection } from '../utils/haptics';

export const LoginScreen: React.FC = () => {
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDemoSheetOpen, setIsDemoSheetOpen] = useState(false);

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

          {/* Ayuda y Soporte */}
          <View style={styles.supportBox}>
            <Text style={styles.supportText}>
              ¿No tienes una cuenta aún? Los nuevos clientes y distribuidores son dados de alta por el Administrador de la flota.
            </Text>
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
                    <Text style={styles.demoItemSub}>Bodega Don Pepe (San Borja)</Text>
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
  supportBox: {
    marginTop: 18,
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  supportText: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 16,
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
