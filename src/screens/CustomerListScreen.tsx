/**
 * ============================================================================
 * SCREEN: CustomerListScreen.tsx
 * Sección "Mis Clientes": Directorio de clientes con contacto rápido y generación de pedido
 * ============================================================================
 */

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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/RootNavigator';
import { useCustomers } from '../context/CustomerContext';
import { useOrders } from '../context/OrderContext';
import { Customer } from '../models/Customer';
import { COLORS } from '../utils/constants';
import { Header } from '../components/common/Header';

type Props = NativeStackScreenProps<RootStackParamList, 'CustomerListScreen'>;

export const CustomerListScreen: React.FC<Props> = ({ navigation }) => {
  const { customers, deleteCustomer } = useCustomers();
  const { orders } = useOrders();
  const [searchQuery, setSearchQuery] = useState('');

  // Filtrado reactivo de clientes
  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;
    const query = searchQuery.toLowerCase().trim();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.phone.includes(query) ||
        c.deliveryAddress.toLowerCase().includes(query) ||
        c.district.toLowerCase().includes(query)
    );
  }, [customers, searchQuery]);

  // Contar pedidos asociados a un cliente
  const getOrderCountForCustomer = (customerName: string, customerId?: string) => {
    return orders.filter(
      (o) =>
        (customerId && o.customerId === customerId) ||
        o.customerName.toLowerCase() === customerName.toLowerCase()
    ).length;
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
    const message = encodeURIComponent(`Hola ${name}, le saludamos de Gestor de Rutas.`);
    Linking.openURL(`https://wa.me/${prefix}${cleanPhone}?text=${message}`).catch(() => {
      Alert.alert('WhatsApp', `Enviar mensaje a ${phone}`);
    });
  };

  // Confirmar eliminación
  const handleDelete = (customer: Customer) => {
    Alert.alert(
      'Eliminar Cliente',
      `¿Estás seguro de eliminar a "${customer.name}" de tu lista de clientes?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, Eliminar',
          style: 'destructive',
          onPress: () => deleteCustomer(customer.id),
        },
      ]
    );
  };

  // Generar nuevo pedido rápido para este cliente
  const handleCreateOrder = (customer: Customer) => {
    navigation.navigate('CreateOrderScreen', {
      initialCustomerId: customer.id,
      initialLatitude: customer.latitude,
      initialLongitude: customer.longitude,
    });
  };

  const renderCustomerItem = ({ item }: { item: Customer }) => {
    const orderCount = getOrderCountForCustomer(item.name, item.id);
    const hasGps = Boolean(item.latitude && item.longitude);

    return (
      <View style={styles.card}>
        {/* Cabecera de la tarjeta */}
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.name.substring(0, 2).toUpperCase()}
            </Text>
          </View>

          <View style={styles.headerInfo}>
            <Text style={styles.customerName} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={styles.tagRow}>
              <View style={styles.districtBadge}>
                <Ionicons name="location-sharp" size={11} color={COLORS.primary} />
                <Text style={styles.districtText}>{item.district}</Text>
              </View>

              {hasGps ? (
                <View style={styles.gpsBadgeSuccess}>
                  <Ionicons name="navigate-circle" size={12} color={COLORS.success} />
                  <Text style={styles.gpsBadgeText}>GPS Listo</Text>
                </View>
              ) : (
                <View style={styles.gpsBadgeNone}>
                  <Ionicons name="navigate-outline" size={12} color={COLORS.textMuted} />
                  <Text style={styles.gpsBadgeNoneText}>Sin GPS</Text>
                </View>
              )}
            </View>
          </View>

          {/* Menú de acciones secundarias */}
          <View style={styles.headerRightActions}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => navigation.navigate('CustomerFormScreen', { customerId: item.id })}
            >
              <Ionicons name="pencil-outline" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => handleDelete(item)}
            >
              <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Dirección y Referencia */}
        <View style={styles.addressSection}>
          <View style={styles.detailRow}>
            <Ionicons name="home-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.addressText} numberOfLines={2}>
              {item.deliveryAddress}
            </Text>
          </View>

          {item.addressReference ? (
            <View style={[styles.detailRow, { marginTop: 4 }]}>
              <Ionicons name="information-circle-outline" size={14} color={COLORS.accent} />
              <Text style={styles.referenceText} numberOfLines={1}>
                Ref: {item.addressReference}
              </Text>
            </View>
          ) : null}

          {item.notes ? (
            <View style={[styles.detailRow, { marginTop: 4 }]}>
              <Ionicons name="chatbox-ellipses-outline" size={14} color={COLORS.warning} />
              <Text style={styles.notesText} numberOfLines={1}>
                {item.notes}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Barra de Contacto y Acción Principal */}
        <View style={styles.cardFooter}>
          <View style={styles.contactButtons}>
            <TouchableOpacity
              style={styles.callButton}
              onPress={() => handleCall(item.phone, item.name)}
            >
              <Ionicons name="call" size={14} color={COLORS.primary} />
              <Text style={styles.callButtonText}>{item.phone}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.waButton}
              onPress={() => handleWhatsApp(item.phone, item.name)}
            >
              <Ionicons name="logo-whatsapp" size={15} color="#16A34A" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.newOrderButton}
            onPress={() => handleCreateOrder(item)}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle" size={16} color={COLORS.textInverse} />
            <Text style={styles.newOrderButtonText}>Crear Pedido</Text>
          </TouchableOpacity>
        </View>

        {orderCount > 0 && (
          <View style={styles.orderHistoryPill}>
            <Ionicons name="cube-outline" size={11} color={COLORS.textMuted} />
            <Text style={styles.orderHistoryText}>
              {orderCount} {orderCount === 1 ? 'pedido registrado' : 'pedidos registrados'}
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.secondary} />
      
      <Header
        title="Mis Clientes"
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
        rightActionIcon="person-add"
        onRightActionPress={() => navigation.navigate('CustomerFormScreen')}
      />

      {/* Buscador y Resumen */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por cliente, teléfono o distrito..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.statsBar}>
          <Text style={styles.statsText}>
            {filteredCustomers.length}{' '}
            {filteredCustomers.length === 1 ? 'cliente encontrado' : 'clientes registrados'}
          </Text>
          <TouchableOpacity
            style={styles.addBtnQuick}
            onPress={() => navigation.navigate('CustomerFormScreen')}
          >
            <Ionicons name="add" size={16} color={COLORS.primary} />
            <Text style={styles.addBtnQuickText}>Nuevo</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Lista de clientes */}
      <FlatList
        data={filteredCustomers}
        keyExtractor={(item) => item.id}
        renderItem={renderCustomerItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="people-outline" size={42} color={COLORS.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No se encontraron clientes' : 'Aún no tienes clientes'}
            </Text>
            <Text style={styles.emptyDescription}>
              {searchQuery
                ? 'Intenta con otro término de búsqueda o registra un nuevo cliente.'
                : 'Registra tus clientes con su dirección y teléfono para generar pedidos en 1 toque.'}
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => navigation.navigate('CustomerFormScreen')}
            >
              <Ionicons name="person-add" size={16} color={COLORS.textInverse} />
              <Text style={styles.emptyButtonText}>Registrar Primer Cliente</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  searchContainer: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  statsText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  addBtnQuick: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
  },
  addBtnQuickText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  listContent: {
    padding: 16,
    paddingBottom: 36,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
  },
  headerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  districtBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
  },
  districtText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  gpsBadgeSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  gpsBadgeText: {
    fontSize: 10,
    color: COLORS.success,
    fontWeight: '700',
  },
  gpsBadgeNone: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  gpsBadgeNoneText: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  iconBtn: {
    padding: 6,
    borderRadius: 8,
  },
  addressSection: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  addressText: {
    fontSize: 13,
    color: COLORS.textPrimary,
    flex: 1,
    lineHeight: 18,
  },
  referenceText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    flex: 1,
  },
  notesText: {
    fontSize: 12,
    color: '#B45309',
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
    gap: 10,
  },
  contactButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 4,
  },
  callButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  waButton: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newOrderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 5,
  },
  newOrderButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textInverse,
  },
  orderHistoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  orderHistoryText: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textInverse,
  },
});
