/**
 * ============================================================================
 * SCREEN: WelcomeScreen.tsx
 * Panel de inicio 100% dinámico para cualquier negocio y conductor
 * ============================================================================
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/RootNavigator';
import { useOrders } from '../context/OrderContext';
import { COLORS } from '../utils/constants';
import { formatCurrency } from '../utils/formatters';
import { CustomButton } from '../components/common/CustomButton';

type Props = NativeStackScreenProps<RootStackParamList, 'WelcomeScreen'>;

export const WelcomeScreen: React.FC<Props> = ({ navigation }) => {
  const { orders, statistics, clearAllOrders } = useOrders();

  const handleClearAll = () => {
    Alert.alert(
      'Limpiar Lista de Pedidos',
      '¿Deseas vaciar la lista de pedidos de tu teléfono? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, Vaciar Todo',
          style: 'destructive',
          onPress: () => clearAllOrders(),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.secondary} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Encabezado Principal */}
        <View style={styles.heroBanner}>
          <View style={styles.logoBadge}>
            <Ionicons name="navigate" size={32} color={COLORS.primary} />
          </View>
          <View style={styles.taglineBadge}>
            <Ionicons name="radio-outline" size={12} color={COLORS.accent} />
            <Text style={styles.taglineText}>SISTEMA DE RUTAS Y NAVEGACIÓN GPS</Text>
          </View>
          <Text style={styles.heroTitle}>Gestor de Rutas</Text>
          <Text style={styles.heroSubtitle}>
            Panel de control para conductores y despachos en cualquier ciudad o zona.
          </Text>
        </View>

        {/* Métricas en Vivo (si existen pedidos) */}
        {orders.length > 0 ? (
          <View style={styles.metricsCard}>
            <View style={styles.metricsHeader}>
              <View style={styles.metricsTitleRow}>
                <Ionicons name="pulse" size={18} color={COLORS.primary} />
                <Text style={styles.metricsTitle}>Operación del Día</Text>
              </View>
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>Activo</Text>
              </View>
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{statistics.totalOrders}</Text>
                <Text style={styles.statLabel}>Total Pedidos</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={[styles.statValue, { color: COLORS.statusInTransit }]}>
                  {statistics.inTransitOrders}
                </Text>
                <Text style={styles.statLabel}>En Ruta</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={[styles.statValue, { color: COLORS.statusDelivered }]}>
                  {statistics.deliveredOrders}
                </Text>
                <Text style={styles.statLabel}>Entregados</Text>
              </View>
            </View>

            <View style={styles.revenueRow}>
              <View>
                <Text style={styles.revenueCaption}>Cobranza Total Prevista</Text>
                <Text style={styles.revenueValue}>
                  {formatCurrency(statistics.pendingCollection + statistics.totalRevenue)}
                </Text>
              </View>
              <View style={styles.ratePill}>
                <Ionicons name="speedometer-outline" size={14} color={COLORS.success} />
                <Text style={styles.rateText}>
                  {statistics.completedDeliveriesRate}% Efectividad
                </Text>
              </View>
            </View>
          </View>
        ) : (
          /* Tarjeta de Inicio Limpio (Sin datos demo) */
          <View style={styles.emptyWelcomeCard}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="sparkles-outline" size={28} color={COLORS.primary} />
            </View>
            <Text style={styles.emptyWelcomeTitle}>Tu aplicación está lista</Text>
            <Text style={styles.emptyWelcomeDesc}>
              Agrega tus propios productos o servicios, precios libres y clientes en cualquier
              ciudad. Visualiza todos tus puntos de entrega juntos en el mapa GPS.
            </Text>
          </View>
        )}

        {/* Acciones Principales */}
        <View style={styles.actionsContainer}>
          <CustomButton
            title="Crear Nuevo Pedido / Servicio"
            icon="add-circle"
            size="lg"
            variant="primary"
            onPress={() => navigation.navigate('CreateOrderScreen')}
            fullWidth
          />

          <CustomButton
            title="Ver Mapa de Entregas (GPS)"
            icon="map-outline"
            size="lg"
            variant="secondary"
            onPress={() => navigation.navigate('MapRouteScreen')}
            style={{ marginTop: 12 }}
            fullWidth
          />

          <View style={[styles.actionRow, { marginTop: 12 }]}>
            <CustomButton
              title="Lista de Pedidos"
              icon="list-outline"
              size="md"
              variant="outline"
              onPress={() => navigation.navigate('OrderListScreen')}
              style={styles.flexOne}
            />
            <CustomButton
              title="Hoja de Carga"
              icon="clipboard-outline"
              size="md"
              variant="outline"
              onPress={() => navigation.navigate('RouteSummaryModalOrScreen')}
              style={styles.flexOne}
            />
          </View>

          {orders.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={handleClearAll}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={14} color={COLORS.danger} />
              <Text style={styles.clearButtonText}>Vaciar todos los pedidos</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.secondary,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  heroBanner: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
    alignItems: 'center',
    backgroundColor: COLORS.secondary,
  },
  logoBadge: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(56, 189, 248, 0.4)',
    marginBottom: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  taglineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.25)',
    gap: 6,
    marginBottom: 12,
  },
  taglineText: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.textInverse,
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
  },
  metricsCard: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    marginBottom: 24,
  },
  metricsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  metricsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.secondary,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#065F46',
  },
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#F1F5F9',
  },
  revenueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  revenueCaption: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  revenueValue: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  ratePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  rateText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  emptyWelcomeCard: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyWelcomeTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.secondary,
    marginBottom: 6,
  },
  emptyWelcomeDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  actionsContainer: {
    paddingHorizontal: 16,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  flexOne: {
    flex: 1,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    marginTop: 10,
  },
  clearButtonText: {
    fontSize: 12,
    color: COLORS.danger,
    fontWeight: '700',
  },
});
