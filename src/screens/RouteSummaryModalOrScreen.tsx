/**
 * ============================================================================
 * SCREEN: RouteSummaryModalOrScreen.tsx
 * Dispatch Manifest, Physical Truck Load Capacity & Route Financial Reconciliation
 * ============================================================================
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/RootNavigator';
import { useOrders } from '../context/OrderContext';
import { COLORS } from '../utils/constants';
import { formatCurrency } from '../utils/formatters';
import { Header } from '../components/common/Header';
import { CustomButton } from '../components/common/CustomButton';
import { hapticImpact, hapticNotification, hapticSelection } from '../utils/haptics';

type Props = NativeStackScreenProps<
  RootStackParamList,
  'RouteSummaryModalOrScreen'
>;

export const RouteSummaryModalOrScreen: React.FC<Props> = ({ navigation }) => {
  const { orders, statistics, routeLoad } = useOrders();

  // Group active orders by district
  const districtStops = useMemo(() => {
    const counts: Record<string, { total: number; pending: number }> = {};
    orders.forEach((o) => {
      if (!counts[o.district]) {
        counts[o.district] = { total: 0, pending: 0 };
      }
      counts[o.district].total += 1;
      if (o.status === 'PENDING' || o.status === 'IN_TRANSIT') {
        counts[o.district].pending += 1;
      }
    });
    return Object.entries(counts).sort((a, b) => b[1].total - a[1].total);
  }, [orders]);

  // Total de envases retornables devueltos a bordo
  const totalReturnedContainers = useMemo(() => {
    return orders.reduce((acc, o) => acc + (o.returnedContainers || 0), 0);
  }, [orders]);

  // Estimación de peso total de carga física en kg (para no exceder capacidad del vehículo)
  const estimatedPayloadKg = useMemo(() => {
    let weight = 0;
    orders.forEach((o) => {
      if (o.status !== 'CANCELLED') {
        o.items.forEach((item) => {
          const name = item.name.toLowerCase();
          const qty = item.quantity;
          if (name.includes('20l')) weight += qty * 20;
          else if (name.includes('7l')) weight += qty * 7;
          else if (name.includes('10kg') || name.includes('10k')) weight += qty * 15;
          else if (name.includes('45kg') || name.includes('45k')) weight += qty * 65;
          else if (name.includes('50kg')) weight += qty * 50;
          else if (name.includes('15kg')) weight += qty * 15;
          else if (name.includes('4l')) weight += qty * 4.5;
          else weight += qty * 2;
        });
      }
    });
    return Math.round(weight);
  }, [orders]);

  // Cash and Digital Collections Breakdown
  const financialBreakdown = useMemo(() => {
    let cash = 0;
    let yape = 0;
    let cardOrBank = 0;

    orders.forEach((o) => {
      if (o.status === 'DELIVERED') {
        if (o.paymentMethod === 'CASH') cash += o.totalAmount;
        else if (o.paymentMethod === 'YAPE_PLIN') yape += o.totalAmount;
        else cardOrBank += o.totalAmount;
      }
    });

    return { cash, yape, cardOrBank };
  }, [orders]);

  // Share / Export Manifest
  const handleShareManifest = async () => {
    const textLines = [
      '📋 *HOJA DE RUTA Y MANIFIESTO - GESTOR DE RUTAS*',
      `Fecha: ${new Date().toLocaleDateString('es-PE')}`,
      `Total Despachos: ${statistics.totalOrders} pedidos`,
      `Entregados: ${statistics.deliveredOrders} | En Ruta: ${statistics.inTransitOrders}`,
      `Efectividad: ${statistics.completedDeliveriesRate}%`,
      '',
      '📦 *CARGA ACTIVA EN VEHÍCULO:*',
      ...routeLoad.map(
        (load) => `• ${load.label.split('(')[0]}: ${load.totalQuantity} ${load.unit}`
      ),
      '',
      '💰 *LIQUIDACIÓN ECONÓMICA:*',
      `Total Recaudado: ${formatCurrency(statistics.totalRevenue)}`,
      `Por Cobrar en Calle: ${formatCurrency(statistics.pendingCollection)}`,
    ];

    try {
      await Share.share({
        message: textLines.join('\n'),
        title: 'Manifiesto de Ruta - Gestor de Rutas',
      });
    } catch {
      Alert.alert(
        'Manifiesto Generado',
        'El resumen de ruta fue copiado para su distribución.'
      );
    }
  };

  const handleCloseShift = () => {
    Alert.alert(
      'Cierre de Turno Logístico',
      `¿Deseas cerrar la jornada actual?\nTotal Entregados: ${statistics.deliveredOrders}\nRecaudación: ${formatCurrency(statistics.totalRevenue)}`,
      [
        { text: 'Continuar Ruta', style: 'cancel' },
        {
          text: 'Confirmar Cierre',
          onPress: () => {
            Alert.alert(
              '¡Turno Finalizado!',
              'Los datos han quedado consolidados en la memoria de operaciones.'
            );
            navigation.navigate('WelcomeScreen');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      <Header
        title="Manifiesto y Hoja de Ruta"
        subtitle="Consolidado de carga, flota y liquidación"
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
        rightActionIcon="share-social-outline"
        onRightActionPress={handleShareManifest}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Progress Completion Card */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeaderRow}>
            <Text style={styles.progressTitle}>Avance General de Despacho</Text>
            <Text style={styles.progressPercentText}>
              {statistics.completedDeliveriesRate}%
            </Text>
          </View>

          {/* Custom Styled Progress Bar */}
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.min(statistics.completedDeliveriesRate, 100)}%` },
              ]}
            />
          </View>

          <View style={styles.progressStatsRow}>
            <View style={styles.progressStatCol}>
              <Text style={styles.progressStatNum}>
                {statistics.deliveredOrders} / {statistics.totalOrders}
              </Text>
              <Text style={styles.progressStatLabel}>Entregas Concluidas</Text>
            </View>
            <View style={styles.progressStatCol}>
              <Text style={[styles.progressStatNum, { color: COLORS.statusInTransit }]}>
                {statistics.inTransitOrders}
              </Text>
              <Text style={styles.progressStatLabel}>En Tránsito</Text>
            </View>
            <View style={styles.progressStatCol}>
              <Text style={[styles.progressStatNum, { color: COLORS.statusPending }]}>
                {statistics.pendingOrders}
              </Text>
              <Text style={styles.progressStatLabel}>Por Iniciar</Text>
            </View>
          </View>
        </View>

        {/* Physical Truck Load Manifest */}
        <Text style={styles.sectionTitle}>
          Carga Física en Vehículo (Capacidad)
        </Text>
        <View style={styles.loadCard}>
          <Text style={styles.loadSubtitle}>
            Unidades físicas activas en bodega móvil asignadas a la ruta
          </Text>

          <View style={styles.loadGrid}>
            {routeLoad.map((item) => {
              return (
                <View key={item.category} style={styles.loadBox}>
                  <View
                    style={[
                      styles.loadIconCircle,
                      { backgroundColor: '#EFF6FF' },
                    ]}
                  >
                    <Ionicons
                      name="cube-outline"
                      size={20}
                      color={COLORS.primary}
                    />
                  </View>
                  <Text style={styles.loadQuantity}>{item.totalQuantity}</Text>
                  <Text style={styles.loadUnitText}>{item.unit}</Text>
                  <Text style={styles.loadCategoryLabel} numberOfLines={1}>
                    {item.label}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Peso estimado y envases retornables */}
          <View style={styles.loadSummaryExtraRow}>
            <View style={styles.weightBadge}>
              <Ionicons name="scale-outline" size={15} color="#0284C7" />
              <Text style={styles.weightBadgeText}>
                Peso Estimado: ~{estimatedPayloadKg} kg a bordo
              </Text>
            </View>

            {totalReturnedContainers > 0 && (
              <View style={styles.returnedBadge}>
                <Ionicons name="repeat-outline" size={15} color="#059669" />
                <Text style={styles.returnedBadgeText}>
                  {totalReturnedContainers} envases vacíos recuperados
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Geographical Route Breakdown by District */}
        <Text style={styles.sectionTitle}>Paradas por Distrito / Zona</Text>
        <View style={styles.districtCard}>
          {districtStops.map(([distName, counts], idx) => (
            <View key={distName} style={styles.districtRow}>
              <View style={styles.districtInfoLeft}>
                <View style={styles.districtIndexBadge}>
                  <Text style={styles.districtIndexText}>{idx + 1}</Text>
                </View>
                <Text style={styles.districtName}>{distName}</Text>
              </View>

              <View style={styles.districtCountsRight}>
                <View style={styles.totalStopsPill}>
                  <Text style={styles.totalStopsText}>
                    {counts.total} {counts.total === 1 ? 'parada' : 'paradas'}
                  </Text>
                </View>
                {counts.pending > 0 && (
                  <View style={styles.pendingStopsPill}>
                    <Text style={styles.pendingStopsText}>
                      {counts.pending} activa
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Financial Reconciliation & Arqueo */}
        <Text style={styles.sectionTitle}>Arqueo y Liquidación Económica</Text>
        <View style={styles.financialCard}>
          <View style={styles.finRow}>
            <View style={styles.finLeft}>
              <Ionicons name="cash-outline" size={18} color={COLORS.success} />
              <Text style={styles.finLabel}>Efectivo Recaudado</Text>
            </View>
            <Text style={styles.finAmount}>
              {formatCurrency(financialBreakdown.cash)}
            </Text>
          </View>

          <View style={styles.finDivider} />

          <View style={styles.finRow}>
            <View style={styles.finLeft}>
              <Ionicons
                name="phone-portrait-outline"
                size={18}
                color={COLORS.primary}
              />
              <Text style={styles.finLabel}>Digital (Yape / Plin)</Text>
            </View>
            <Text style={styles.finAmount}>
              {formatCurrency(financialBreakdown.yape)}
            </Text>
          </View>

          <View style={styles.finDivider} />

          <View style={styles.finRow}>
            <View style={styles.finLeft}>
              <Ionicons name="card-outline" size={18} color={COLORS.accent} />
              <Text style={styles.finLabel}>POS / Transferencias Bancarias</Text>
            </View>
            <Text style={styles.finAmount}>
              {formatCurrency(financialBreakdown.cardOrBank)}
            </Text>
          </View>

          <View style={[styles.finDivider, { height: 1.5, backgroundColor: COLORS.border }]} />

          <View style={styles.finTotalRow}>
            <View>
              <Text style={styles.finTotalLabel}>Total Cobrado en Turno</Text>
              <Text style={styles.finPendingNotice}>
                Pendiente por liquidar: {formatCurrency(statistics.pendingCollection)}
              </Text>
            </View>
            <Text style={styles.finTotalValue}>
              {formatCurrency(statistics.totalRevenue)}
            </Text>
          </View>
        </View>

        {/* Action Controls */}
        <View style={styles.actionsContainer}>
          <CustomButton
            title="Compartir Hoja de Ruta"
            icon="share-social-outline"
            size="md"
            variant="outline"
            onPress={handleShareManifest}
            fullWidth
          />
          <CustomButton
            title="Cerrar Jornada Logística"
            icon="flag-outline"
            size="lg"
            variant="secondary"
            onPress={handleCloseShift}
            style={{ marginTop: 10 }}
            fullWidth
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  progressCard: {
    backgroundColor: COLORS.secondary,
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  progressHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textInverse,
  },
  progressPercentText: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.accent,
  },
  progressBarBg: {
    height: 10,
    backgroundColor: '#334155',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.success,
    borderRadius: 5,
  },
  progressStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  progressStatCol: {
    alignItems: 'center',
    flex: 1,
  },
  progressStatNum: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textInverse,
  },
  progressStatLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  loadCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
    elevation: 2,
    shadowColor: COLORS.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
  },
  loadSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 14,
  },
  loadGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  loadBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 12,
    alignItems: 'center',
  },
  loadIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  loadQuantity: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  loadUnitText: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  loadCategoryLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginTop: 2,
  },
  districtCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
    elevation: 2,
    shadowColor: COLORS.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
  },
  districtRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  districtInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  districtIndexBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  districtIndexText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  districtName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  districtCountsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  totalStopsPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  totalStopsText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  pendingStopsPill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pendingStopsText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '700',
  },
  financialCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
    elevation: 2,
    shadowColor: COLORS.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
  },
  finRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  finLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  finLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  finAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  finDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 6,
  },
  finTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  finTotalLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  finPendingNotice: {
    fontSize: 11,
    color: COLORS.statusPending,
    fontWeight: '600',
    marginTop: 2,
  },
  finTotalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.success,
  },
  actionsContainer: {
    marginTop: 4,
  },
  loadSummaryExtraRow: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 6,
  },
  weightBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  weightBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
  },
  returnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  returnedBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
});
