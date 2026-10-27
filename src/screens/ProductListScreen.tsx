/**
 * ============================================================================
 * SCREEN: ProductListScreen.tsx
 * Sección "Mis Productos": Catálogo de productos y servicios con precios y unidades
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
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/RootNavigator';
import { useProducts } from '../context/ProductContext';
import { Product } from '../models/Product';
import { ProductCategory } from '../models/Order';
import { COLORS, CATEGORY_CONFIG } from '../utils/constants';
import { formatCurrency } from '../utils/formatters';
import { Header } from '../components/common/Header';

type Props = NativeStackScreenProps<RootStackParamList, 'ProductListScreen'>;

export const ProductListScreen: React.FC<Props> = ({ navigation }) => {
  const { products, deleteProduct } = useProducts();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Filtrado reactivo de productos
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Filtro de categoría
      if (selectedCategory !== 'ALL' && p.category !== selectedCategory) {
        return false;
      }
      // Filtro de texto
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = p.name.toLowerCase().includes(query);
        const matchesDesc = p.description?.toLowerCase().includes(query);
        const matchesCode = p.code?.toLowerCase().includes(query);
        return matchesName || matchesDesc || matchesCode;
      }
      return true;
    });
  }, [products, searchQuery, selectedCategory]);

  const handleDelete = (product: Product) => {
    Alert.alert(
      'Eliminar Producto',
      `¿Deseas eliminar "${product.name}" del catálogo?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, Eliminar',
          style: 'destructive',
          onPress: () => deleteProduct(product.id),
        },
      ]
    );
  };

  const CATEGORY_EMOJIS: Record<string, string> = {
    WATER: '💧',
    GAS: '🔥',
    BAKERY: '🥖',
    CLEANING: '🧴',
    GENERAL: '📦',
  };

  const categoriesAvailable: { key: string; label: string }[] = [
    { key: 'ALL', label: '✨ Todos' },
    { key: 'WATER', label: '💧 Agua' },
    { key: 'GAS', label: '🔥 Gas GLP' },
    { key: 'BAKERY', label: '🥖 Panadería' },
    { key: 'CLEANING', label: '🧴 Limpieza' },
    { key: 'GENERAL', label: '📦 General' },
  ];

  const renderProductItem = ({ item }: { item: Product }) => {
    const config = CATEGORY_CONFIG[item.category as ProductCategory] || {
      label: 'Producto',
      icon: 'cube-outline',
      color: COLORS.primary,
      bg: '#EFF6FF',
    };

    const emoji = CATEGORY_EMOJIS[item.category] || '📦';

    return (
      <View style={styles.card}>
        <View style={styles.cardMain}>
          {/* Icono de categoría con Emoji */}
          <View style={[styles.iconBox, { backgroundColor: config.bg, borderWidth: 1, borderColor: '#E2E8F0' }]}>
            <Text style={{ fontSize: 24 }}>{emoji}</Text>
          </View>

          {/* Información del Producto */}
          <View style={styles.infoContent}>
            <View style={styles.titleRow}>
              <Text style={styles.productName} numberOfLines={2}>
                {item.name}
              </Text>
              <Text style={styles.priceTag}>{formatCurrency(item.price)}</Text>
            </View>

            {item.description ? (
              <Text style={styles.descriptionText} numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}

            <View style={styles.metaRow}>
              <View style={styles.unitPill}>
                <Ionicons name="scale-outline" size={12} color={COLORS.textSecondary} />
                <Text style={styles.unitText}>{item.unit || 'Unidad'}</Text>
              </View>

              {item.code ? (
                <View style={styles.codePill}>
                  <Text style={styles.codeText}>{item.code}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {/* Acciones de la tarjeta */}
        <View style={styles.cardFooter}>
          <TouchableOpacity
            style={styles.newOrderLink}
            onPress={() => navigation.navigate('CreateOrderScreen')}
          >
            <Ionicons name="add-circle-outline" size={15} color={COLORS.primary} />
            <Text style={styles.newOrderLinkText}>Generar Pedido</Text>
          </TouchableOpacity>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => navigation.navigate('ProductFormScreen', { productId: item.id })}
            >
              <Ionicons name="pencil-outline" size={17} color={COLORS.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => handleDelete(item)}
            >
              <Ionicons name="trash-outline" size={17} color={COLORS.danger} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

      <Header
        title="Mis Productos"
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
        rightActionIcon="add-circle"
        onRightActionPress={() => navigation.navigate('ProductFormScreen')}
      />

      {/* Barra de Búsqueda */}
      <View style={styles.topBar}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre, código o descripción..."
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

        {/* Filtros horizontales por categoría */}
        <View style={styles.filterScrollWrapper}>
          <FlatList
            data={categoriesAvailable}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.key}
            renderItem={({ item }) => {
              const isActive = selectedCategory === item.key;
              return (
                <TouchableOpacity
                  style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                  onPress={() => setSelectedCategory(item.key)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      isActive && styles.categoryChipTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>

        <View style={styles.counterRow}>
          <Text style={styles.counterText}>
            {filteredProducts.length}{' '}
            {filteredProducts.length === 1 ? 'producto en catálogo' : 'productos en catálogo'}
          </Text>
          <TouchableOpacity
            style={styles.addBtnQuick}
            onPress={() => navigation.navigate('ProductFormScreen')}
          >
            <Ionicons name="add" size={16} color={COLORS.primary} />
            <Text style={styles.addBtnQuickText}>Nuevo Producto</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Lista de productos */}
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        renderItem={renderProductItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="cube-outline" size={42} color={COLORS.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No se encontraron productos' : 'Catálogo Vacío'}
            </Text>
            <Text style={styles.emptyDescription}>
              {searchQuery
                ? 'Prueba con otra palabra clave o agrega un nuevo producto.'
                : 'Registra tus productos o servicios con su precio unitario para armar pedidos con un solo clic.'}
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => navigation.navigate('ProductFormScreen')}
            >
              <Ionicons name="add-circle" size={16} color={COLORS.textInverse} />
              <Text style={styles.emptyButtonText}>Agregar Primer Producto</Text>
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
  topBar: {
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
  filterScrollWrapper: {
    marginTop: 10,
  },
  categoryChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryChipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: COLORS.primary,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  categoryChipTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  counterText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
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
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  productName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  priceTag: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
  },
  descriptionText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
    lineHeight: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  unitPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  unitText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  codePill: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  codeText: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '700',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  newOrderLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  newOrderLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    padding: 6,
    borderRadius: 8,
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
