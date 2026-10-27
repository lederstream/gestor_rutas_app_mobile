/**
 * ============================================================================
 * SCREEN: ProductFormScreen.tsx
 * Formulario para Crear o Editar Producto en el Catálogo
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/RootNavigator';
import { useProducts } from '../context/ProductContext';
import { ProductCategory } from '../models/Order';
import { COLORS } from '../utils/constants';
import { Header } from '../components/common/Header';
import { CustomInput } from '../components/common/CustomInput';
import { CustomButton } from '../components/common/CustomButton';

type Props = NativeStackScreenProps<RootStackParamList, 'ProductFormScreen'>;

const PRESET_UNITS = [
  'Unidad',
  'Bidón 20L',
  'Balón 10kg',
  'Balón 45kg',
  'Saco 50kg',
  'Galonera 4L',
  'Caja',
  'Kg',
  'Bolsa 15kg',
  'Litro',
  'Servicio',
];

const PRESET_CATEGORIES: { key: ProductCategory; label: string; icon: string }[] = [
  { key: 'GENERAL', label: 'General / Otro', icon: 'cube-outline' },
  { key: 'WATER', label: 'Agua de Mesa', icon: 'water-outline' },
  { key: 'GAS', label: 'Gas GLP', icon: 'flame-outline' },
  { key: 'BAKERY', label: 'Panadería', icon: 'basket-outline' },
  { key: 'CLEANING', label: 'Limpieza', icon: 'sparkles-outline' },
];

export const ProductFormScreen: React.FC<Props> = ({ route, navigation }) => {
  const productId = route.params?.productId;
  const isEditing = Boolean(productId);
  const { addProduct, updateProduct, getProductById } = useProducts();

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [unit, setUnit] = useState('Unidad');
  const [category, setCategory] = useState<ProductCategory>('GENERAL');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (productId) {
      const existing = getProductById(productId);
      if (existing) {
        setName(existing.name);
        setPrice(existing.price.toString());
        setUnit(existing.unit);
        setCategory(existing.category);
        setCode(existing.code || '');
        setDescription(existing.description || '');
      }
    }
  }, [productId, getProductById]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim() || name.trim().length < 2) {
      newErrors.name = 'Ingresa el nombre del producto o servicio';
    }

    const parsedPrice = parseFloat(price);
    if (!price || isNaN(parsedPrice) || parsedPrice <= 0) {
      newErrors.price = 'Ingresa un precio unitario válido mayor a 0';
    }

    if (!unit.trim()) {
      newErrors.unit = 'Indica la unidad de medida';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) {
      Alert.alert('Datos Incompletos', 'Por favor revisa los campos señalados en rojo.');
      return;
    }

    const numericPrice = parseFloat(price);

    if (isEditing && productId) {
      const existing = getProductById(productId);
      if (existing) {
        updateProduct({
          ...existing,
          name: name.trim(),
          price: numericPrice,
          unit: unit.trim(),
          category,
          code: code.trim() || undefined,
          description: description.trim() || undefined,
        });
        Alert.alert('Éxito', 'Producto actualizado correctamente.', [
          { text: 'Aceptar', onPress: () => navigation.goBack() },
        ]);
      }
    } else {
      addProduct({
        name: name.trim(),
        price: numericPrice,
        unit: unit.trim(),
        category,
        code: code.trim() || undefined,
        description: description.trim() || undefined,
      });
      Alert.alert('Éxito', 'Producto agregado al catálogo.', [
        { text: 'Aceptar', onPress: () => navigation.goBack() },
      ]);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.secondary} />

      <Header
        title={isEditing ? 'Editar Producto' : 'Nuevo Producto'}
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <CustomInput
          label="Nombre del Producto o Servicio *"
          placeholder="Ej. Bidón de Agua Purificada 20L"
          value={name}
          onChangeText={setName}
          error={errors.name}
          icon="cube-outline"
        />

        <View style={styles.twoColumnRow}>
          <View style={styles.flexOne}>
            <CustomInput
              label="Precio Unitario (S/) *"
              placeholder="Ej. 16.00"
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
              error={errors.price}
              icon="cash-outline"
            />
          </View>

          <View style={styles.flexOne}>
            <CustomInput
              label="Código SKU (Opcional)"
              placeholder="Ej. AGU-20L"
              value={code}
              onChangeText={(text) => setCode(text.toUpperCase())}
              icon="barcode-outline"
            />
          </View>
        </View>

        {/* Unidad de Medida */}
        <CustomInput
          label="Unidad de Medida / Presentación *"
          placeholder="Ej. Bidón 20L, Caja, Kg, Unidad"
          value={unit}
          onChangeText={setUnit}
          error={errors.unit}
          icon="scale-outline"
        />

        <View style={styles.chipsContainer}>
          <Text style={styles.chipsLabel}>Unidades frecuentes:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {PRESET_UNITS.map((u) => (
              <TouchableOpacity
                key={u}
                style={[styles.chip, unit === u && styles.chipActive]}
                onPress={() => setUnit(u)}
              >
                <Text style={[styles.chipText, unit === u && styles.chipTextActive]}>
                  {u}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Categoría Logística */}
        <Text style={styles.categoryTitle}>Categoría Logística</Text>
        <View style={styles.categoriesGrid}>
          {PRESET_CATEGORIES.map((cat) => {
            const isSelected = category === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                style={[styles.categoryOption, isSelected && styles.categoryOptionSelected]}
                onPress={() => setCategory(cat.key)}
              >
                <Ionicons
                  name={cat.icon as any}
                  size={18}
                  color={isSelected ? COLORS.primary : COLORS.textSecondary}
                />
                <Text
                  style={[
                    styles.categoryOptionText,
                    isSelected && styles.categoryOptionTextSelected,
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Descripción */}
        <CustomInput
          label="Descripción o Detalles (Opcional)"
          placeholder="Ej. Marca, especificaciones, recomendaciones de traslado..."
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          icon="document-text-outline"
        />

        {/* Botón Guardar */}
        <CustomButton
          title={isEditing ? 'Actualizar Producto' : 'Guardar Producto'}
          icon="checkmark-circle"
          variant="primary"
          size="lg"
          onPress={handleSave}
          style={{ marginTop: 20 }}
          fullWidth
        />
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
  twoColumnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  flexOne: {
    flex: 1,
  },
  chipsContainer: {
    marginBottom: 16,
  },
  chipsLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
    marginBottom: 6,
  },
  chip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  chipTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  categoryTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  categoryOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#EFF6FF',
  },
  categoryOptionText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  categoryOptionTextSelected: {
    color: COLORS.primary,
    fontWeight: '700',
  },
});
