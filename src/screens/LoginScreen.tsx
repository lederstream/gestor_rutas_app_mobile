/**
 * ============================================================================
 * SCREEN: LoginScreen.tsx
 * Pantalla de Inicio de Sesión y Selección de Rol (Distribuidor vs Cliente)
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { UserRole, DEMO_PROFILES } from '../models/User';
import { COLORS, SPACING, RADIUS, TOUCH_TARGET } from '../utils/constants';
import { hapticImpact, hapticSelection } from '../utils/haptics';

export const LoginScreen: React.FC = () => {
  const { loginWithDemoProfile, login } = useAuth();

  const [selectedRole, setSelectedRole] = useState<UserRole>('DISTRIBUTOR');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [district, setDistrict] = useState('');
  const [isManualFormVisible, setIsManualFormVisible] = useState(false);

  const handleManualLogin = () => {
    if (!name.trim() || name.trim().length < 2) {
      Alert.alert('Nombre requerido', 'Por favor ingresa tu nombre o razón social.');
      return;
    }
    if (!phone.trim() || phone.replace(/\D/g, '').length < 6) {
      Alert.alert('Teléfono requerido', 'Ingresa un número telefónico de contacto válido.');
      return;
    }

    login({
      name,
      phone,
      role: selectedRole,
      deliveryAddress: selectedRole === 'CLIENT' ? deliveryAddress : undefined,
      district: selectedRole === 'CLIENT' ? district : undefined,
    });
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
          {/* Logo y Branding */}
          <View style={styles.brandHero}>
            <View style={styles.logoCircle}>
              <Ionicons name="cube" size={36} color={COLORS.primary} />
            </View>
            <Text style={styles.appName}>Gestor de Rutas</Text>
            <Text style={styles.appTagline}>
              Logística, Distribución de Carga y Portal de Clientes
            </Text>
          </View>

          {/* Selector de Rol */}
          <Text style={styles.sectionTitle}>¿Cómo deseas ingresar?</Text>
          <View style={styles.roleTabsRow}>
            <TouchableOpacity
              style={[
                styles.roleCard,
                selectedRole === 'DISTRIBUTOR' && styles.roleCardActive,
              ]}
              onPress={() => {
                setSelectedRole('DISTRIBUTOR');
                hapticSelection();
              }}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.roleIconCircle,
                  selectedRole === 'DISTRIBUTOR' && { backgroundColor: COLORS.primary },
                ]}
              >
                <Ionicons
                  name="bicycle"
                  size={22}
                  color={selectedRole === 'DISTRIBUTOR' ? '#FFFFFF' : COLORS.primary}
                />
              </View>
              <Text
                style={[
                  styles.roleTitle,
                  selectedRole === 'DISTRIBUTOR' && styles.roleTitleActive,
                ]}
              >
                Distribuidor
              </Text>
              <Text style={styles.roleSub}>Chofer / Repartidor</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.roleCard,
                selectedRole === 'CLIENT' && styles.roleCardActive,
              ]}
              onPress={() => {
                setSelectedRole('CLIENT');
                hapticSelection();
              }}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.roleIconCircle,
                  selectedRole === 'CLIENT' && { backgroundColor: COLORS.primary },
                ]}
              >
                <Ionicons
                  name="storefront"
                  size={22}
                  color={selectedRole === 'CLIENT' ? '#FFFFFF' : COLORS.primary}
                />
              </View>
              <Text
                style={[
                  styles.roleTitle,
                  selectedRole === 'CLIENT' && styles.roleTitleActive,
                ]}
              >
                Cliente Final
              </Text>
              <Text style={styles.roleSub}>Negocio / Hogar</Text>
            </TouchableOpacity>
          </View>

          {/* Acceso Rápido con Perfiles de Demostración */}
          <View style={styles.quickAccessSection}>
            <View style={styles.quickAccessHeader}>
              <Ionicons name="flash" size={16} color="#D97706" />
              <Text style={styles.quickAccessTitle}>Acceso Rápido en 1 Toque (Demo)</Text>
            </View>

            {selectedRole === 'DISTRIBUTOR' ? (
              <TouchableOpacity
                style={styles.demoProfileCard}
                onPress={() => loginWithDemoProfile('user-dist-1')}
                activeOpacity={0.8}
              >
                <View style={styles.demoAvatar}>
                  <Text style={{ fontSize: 20 }}>👨‍✈️</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.demoProfileName}>Carlos Mendoza</Text>
                  <Text style={styles.demoProfileDetails}>
                    Conductor Principal • Camión 02 (Placa BZ-492)
                  </Text>
                </View>
                <View style={styles.enterBadge}>
                  <Text style={styles.enterBadgeText}>INGRESAR</Text>
                  <Ionicons name="arrow-forward" size={12} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
            ) : (
              <View style={{ gap: 8 }}>
                <TouchableOpacity
                  style={styles.demoProfileCard}
                  onPress={() => loginWithDemoProfile('user-cust-1')}
                  activeOpacity={0.8}
                >
                  <View style={styles.demoAvatar}>
                    <Text style={{ fontSize: 20 }}>🏪</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.demoProfileName}>Bodega Don Pepe</Text>
                    <Text style={styles.demoProfileDetails}>
                      Cliente Frecuente • San Borja (Av. Javier Prado)
                    </Text>
                  </View>
                  <View style={styles.enterBadge}>
                    <Text style={styles.enterBadgeText}>INGRESAR</Text>
                    <Ionicons name="arrow-forward" size={12} color="#FFFFFF" />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.demoProfileCard}
                  onPress={() => loginWithDemoProfile('user-cust-2')}
                  activeOpacity={0.8}
                >
                  <View style={styles.demoAvatar}>
                    <Text style={{ fontSize: 20 }}>🍽️</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.demoProfileName}>Restaurante El Buen Sabor</Text>
                    <Text style={styles.demoProfileDetails}>
                      Cliente Frecuente • Miraflores (Av. Benavides)
                    </Text>
                  </View>
                  <View style={styles.enterBadge}>
                    <Text style={styles.enterBadgeText}>INGRESAR</Text>
                    <Ionicons name="arrow-forward" size={12} color="#FFFFFF" />
                  </View>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Formulario Manual Opcional */}
          <TouchableOpacity
            style={styles.manualToggleBtn}
            onPress={() => {
              setIsManualFormVisible(!isManualFormVisible);
              hapticImpact('light');
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.manualToggleText}>
              {isManualFormVisible
                ? 'Ocultar Formulario Personalizado'
                : 'O ingresar con mis propios datos'}
            </Text>
            <Ionicons
              name={isManualFormVisible ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={COLORS.primary}
            />
          </TouchableOpacity>

          {isManualFormVisible && (
            <View style={styles.manualCard}>
              <Text style={styles.inputLabel}>
                {selectedRole === 'DISTRIBUTOR'
                  ? 'Nombre del Conductor / Repartidor *'
                  : 'Nombre del Cliente o Negocio *'}
              </Text>
              <TextInput
                style={styles.inputField}
                placeholder="Ej. Roberto Quispe"
                placeholderTextColor={COLORS.textMuted}
                value={name}
                onChangeText={setName}
              />

              <Text style={styles.inputLabel}>Teléfono / WhatsApp *</Text>
              <TextInput
                style={styles.inputField}
                placeholder="Ej. 987654321"
                placeholderTextColor={COLORS.textMuted}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />

              {selectedRole === 'CLIENT' && (
                <>
                  <Text style={styles.inputLabel}>Ciudad o Distrito *</Text>
                  <TextInput
                    style={styles.inputField}
                    placeholder="Ej. San Borja, Surco, Miraflores..."
                    placeholderTextColor={COLORS.textMuted}
                    value={district}
                    onChangeText={setDistrict}
                  />

                  <Text style={styles.inputLabel}>Dirección de Entrega *</Text>
                  <TextInput
                    style={styles.inputField}
                    placeholder="Ej. Calle Los Sauces 120"
                    placeholderTextColor={COLORS.textMuted}
                    value={deliveryAddress}
                    onChangeText={setDeliveryAddress}
                  />
                </>
              )}

              <TouchableOpacity
                style={styles.submitLoginBtn}
                onPress={handleManualLogin}
                activeOpacity={0.88}
              >
                <Text style={styles.submitLoginBtnText}>
                  Ingresar como {selectedRole === 'DISTRIBUTOR' ? 'Distribuidor' : 'Cliente'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
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
    paddingVertical: SPACING.xl,
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
    marginBottom: 12,
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
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
    marginTop: 10,
  },
  roleTabsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: SPACING.xl,
  },
  roleCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
    elevation: 2,
  },
  roleCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#F8FBFF',
  },
  roleIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  roleTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  roleTitleActive: {
    color: COLORS.primary,
  },
  roleSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  quickAccessSection: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.lg,
    elevation: 2,
  },
  quickAccessHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  quickAccessTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400E',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  demoProfileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.md,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  demoAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  demoProfileName: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  demoProfileDetails: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  enterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    gap: 4,
  },
  enterBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  manualToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  manualToggleText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  manualCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 6,
    marginTop: 8,
  },
  inputField: {
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.textPrimary,
    minHeight: 46,
  },
  submitLoginBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    height: TOUCH_TARGET.buttonHeight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    elevation: 3,
  },
  submitLoginBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
