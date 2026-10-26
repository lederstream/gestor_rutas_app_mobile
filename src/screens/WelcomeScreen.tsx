/**
 * ============================================================================
 * SCREEN: WelcomeScreen.tsx
 * Hero landing screen for Gestor de Rutas Móvil with real-time operational overview
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/RootNavigator';
import { useOrders } from '../context/OrderContext';
import { COLORS, CATEGORY_CONFIG } from '../utils/constants';
import { formatCurrency } from '../utils/formatters';
import { CustomButton } from '../components/common/CustomButton';

type Props = NativeStackScreenProps<RootStackParamList, 'WelcomeScreen'>;

export const WelcomeScreen: React.FC<Props> = ({ navigation }) => {
  const { statistics, resetToMockData } = useOrders();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.secondary} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Hero Header */}
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
            Panel de control para conductores, despacho inmediato y navegación de entregas en tiempo real.
          </Text>
        </View>

        {/* Live Operational Metrics Card */}
        <View style={styles.metricsCard}>
          <View style={styles.metricsHeader}>
            <View style={styles.metricsTitleRow}>
              <Ionicons name="pulse" size={18} color={COLORS.primary} />
              <Text style={styles.metricsTitle}>Operación en Vivo</Text>
            </View>
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>Ruta Activa</Text>
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
              <Text style={styles.revenueCaption}>Cobranza Prevista</Text>
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

        {/* Category Capability Showcase */}
        <Text style={styles.sectionTitle}>Sectores de Distribución</Text>
        <View style={styles.categoryGrid}>
          {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
            <View key={key} style={styles.categoryCard}>
              <View
                style={[styles.categoryIconCircle, { backgroundColor: config.bg }]}
              >
                <Ionicons
                  name={config.icon as any}
                  size={20}
                  color={config.color}
                />
              </View>
              <Text style={styles.categoryCardTitle} numberOfLines={1}>
                {config.label.split('(')[0]}
              </Text>
              <Text style={styles.categoryCardUnit}>{config.unitDefault}</Text>
            </View>
          ))}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <CustomButton
            title="Iniciar Ruta del Día (Lista)"
            icon="list-outline"
            size="lg"
            variant="primary"
            onPress={() => navigation.navigate('OrderListScreen')}
            fullWidth
          />

          <CustomButton
            title="Ver Mapa de Entregas (GPS)"
            icon="map-outline"
            size="lg"
            variant="secondary"
            onPress={() => navigation.navigate('MapRouteScreen')}
            style={{ marginTop: 10 }}
            fullWidth
          />

          <View style={[styles.actionRow, { marginTop: 10 }]}>
            <CustomButton
              title="Nuevo Pedido"
              icon="add-circle-outline"
              size="md"
              variant="outline"
              onPress={() => navigation.navigate('CreateOrderScreen')}
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

          <TouchableOpacity
            style={styles.resetButton}
            onPress={resetToMockData}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh-outline" size={14} color={COLORS.textMuted} />
            <Text style={styles.resetButtonText}>
              Restablecer pedidos de ejemplo
            </Text>
          </TouchableOpacity>
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
    paddingBottom: 28,
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
    color: COLORS.textPrimary,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
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
    color: COLORS.success,
  },
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 16,
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
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.border,
  },
  revenueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  revenueCaption: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  revenueValue: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  ratePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 4,
  },
  rateText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.success,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textInverse,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 10,
    marginBottom: 24,
  },
  categoryCard: {
    width: '47.5%',
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  categoryIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  categoryCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textInverse,
    marginBottom: 2,
  },
  categoryCardUnit: {
    fontSize: 11,
    color: '#94A3B8',
  },
  actionsContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  flexOne: {
    flex: 1,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
    marginTop: 6,
  },
  resetButtonText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
});
