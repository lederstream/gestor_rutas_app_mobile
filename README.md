# 🚚 Gestor de Rutas Móvil
### Sistema de Logística y Distribución Inmediata
> **Evaluación Académica:** Desarrollo de Aplicaciones Móviles 1  
> **Tecnologías:** React Native + Expo SDK 52 + TypeScript (Strict Mode)

---

## 📖 1. Descripción del Proyecto
**Gestor de Rutas Móvil** es una solución integral de ruteo y gestión de entregas inmediatas diseñada para operadores logísticos locales y repartidores de última milla en Lima Metropolitana. La aplicación atiende cuatro rubros de alta rotación:
1. **Agua de Mesa Purificada:** Bidones de 20L retornables y packs descartables de 7L.
2. **Gas Licuado de Petróleo (GLP):** Balones domésticos de 10kg y comerciales de 45kg.
3. **Insumos de Panadería:** Sacos de harina especial de 50kg, cajas de manteca vegetal y levadura.
4. **Productos de Limpieza:** Galoneras de 4L de lejía industrial, detergentes líquidos y desinfectantes.

---

## 🏗️ 2. Arquitectura de Software y Principios SOLID

El proyecto sigue una **arquitectura desacoplada por capas (Layered Architecture)** con separación estricta de responsabilidades (SoC):

```text
src/
├── models/                     # Capa de Dominio (Entidades, Interfaces y Tipos Fuertes)
│   └── Order.ts
├── utils/                      # Capa de Utilidades y Constantes
│   ├── constants.ts            # Design System (Tokens de color, iconos, catálogo base)
│   ├── formatters.ts           # Formateadores (Moneda S/., Fechas, Teléfonos, Métricas)
│   └── mockData.ts             # Datos operativos realistas en memoria
├── context/                    # Capa de Estado (State Management 100% In-Memory)
│   ├── OrderContext.tsx        # Provider y Custom Hook useOrders con selectores memoizados
│   └── orderReducer.ts         # Reducer puro con acciones inmutables y predecibles
├── components/                 # Capa de Presentación Modular
│   ├── common/                 # Componentes Atómicos Reutilizables
│   │   ├── CustomButton.tsx    # Botón con múltiples variantes, tamaños e iconos
│   │   ├── CustomInput.tsx     # Input con icono, validación visual y botón limpiar
│   │   └── Header.tsx          # Barra superior con navegación y acciones
│   └── orders/                 # Componentes de Negocio Especializados
│       ├── OrderCard.tsx       # Tarjeta de despacho con metadatos y botones rápidos
│       ├── StatusBadge.tsx     # Insignia de estado (Pendiente, En Ruta, Entregado, Cancelado)
│       ├── PriorityBadge.tsx   # Insignia de urgencia (Urgente, Alta, Normal)
│       └── OrderFilterBar.tsx  # Pestañas segmentadas con conteo en tiempo real
├── screens/                    # Vistas / Pantallas de la Aplicación
│   ├── WelcomeScreen.tsx       # Pantalla de bienvenida con KPIs y acceso directo
│   ├── OrderListScreen.tsx     # Tablero principal de despachos con buscador y filtros
│   ├── CreateOrderScreen.tsx   # Formulario con validación estricta y presets por rubro
│   ├── OrderDetailScreen.tsx   # Auditoría de pedido, contacto con cliente y transiciones
│   └── RouteSummaryModalOrScreen.tsx # Manifiesto, carga en bodega móvil y arqueo
└── navigation/                 # Capa de Ruteo
    └── RootNavigator.tsx       # Stack Navigator tipado con NativeStackScreenProps
```

### Aplicación de Principios SOLID:
- **S (Single Responsibility):** Cada componente y archivo cumple una única función bien delimitada (por ejemplo, `formatters.ts` solo formatea y calcula métricas; `StatusBadge.tsx` solo representa visualmente el estado del pedido).
- **O (Open/Closed):** El sistema de categorías, prioridades y estados se define mediante mapas de configuración (`CATEGORY_CONFIG`, `STATUS_CONFIG`), permitiendo agregar nuevos rubros (ej. Hielo en cubos) sin modificar la lógica interna de los componentes.
- **L (Liskov Substitution):** Todas las variantes de componentes comunes (`CustomButton`, `CustomInput`) respetan el contrato de sus interfaces base sin efectos secundarios inesperados.
- **I (Interface Segregation):** Interfaces claras y granulares (`OrderItem`, `Order`, `OrderFilter`, `OrderStatistics`, `RouteLoadItem`). Ningún componente depende de propiedades innecesarias.
- **D (Dependency Inversion):** Los componentes de UI consumen abstracciones a través del hook personalizado `useOrders()`, eliminando el acoplamiento directo a la implementación interna del estado o almacenamiento.

---

## 📱 3. Pantallas y Funcionalidades

### 1. `WelcomeScreen` (Bienvenida y Tablero General)
- Hero banner con identidad formal de **Gestor de Rutas**.
- Métricas operativas en vivo (Total pedidos, En ruta activa, Entregados, Cobranza prevista en S/. y Efectividad %).
- Tarjetas de exhibición de rubros atendidos (Agua, Gas, Panadería, Limpieza).
- Acceso directo a iniciar ruta, crear pedido o ver la hoja de ruta.
- Botón de reinicio de datos de prueba para demostraciones.

### 2. `OrderListScreen` (Tablero de Despachos en Tiempo Real)
- Listado optimizado con `FlatList` (`keyExtractor`, `removeClippedSubviews`, `initialNumToRender`).
- Buscador reactivo por cliente, código de pedido, dirección o teléfono celular.
- Barra de filtros segmentada (`OrderFilterBar`) con conteo dinámico por estado (Todos, Pendientes, En Ruta, Entregados, Cancelados).
- Filtro desplegable por categoría de producto.
- Acciones rápidas directamente sobre la tarjeta del pedido ("Despachar a Ruta", "Confirmar Entrega").
- Botón de acción flotante (FAB) para emitir un nuevo despacho.

### 3. `CreateOrderScreen` (Registro y Asignación de Pedidos)
- Selector visual de rubro que precarga automáticamente productos típicos y precios sugeridos.
- Controlador numérico de cantidades con cálculo automático de totales en S/.
- Validaciones en tiempo real con mensajes de error visuales:
  - Nombre / Razón social (mínimo 3 caracteres).
  - Teléfono celular peruano (exactamente 9 dígitos numéricos).
  - Dirección exacta y selección de distrito de Lima.
  - Precio unitario positivo y cálculo automático de total.
- Configuración de prioridad (Normal, Alta, Urgente) y modalidad de pago (Efectivo, Yape/Plin, Tarjeta POS, Transferencia).
- Asignación de unidad/conductor y horario programado.

### 4. `OrderDetailScreen` (Auditoría, Liquidación y Transiciones)
- Desglose exhaustivo del pedido, código de seguimiento e historial de fechas.
- Botones de acción directa: **Llamada telefónica** y **Envío de WhatsApp** directo al cliente con mensaje preconfigurado.
- Tabla detallada de artículos, cantidades, precio unitario y total.
- Control de transiciones de estado:
  - `Pendiente` ➔ `En Ruta` ➔ `Entregado` (con confirmación de pago y fecha/hora de entrega).
  - Opción de cancelación con diálogo de seguridad.
  - Eliminación del pedido si se requiere.

### 5. `RouteSummaryModalOrScreen` (Manifiesto de Carga y Arqueo)
- **Barra de Progreso Operativo:** Porcentaje de avance de entregas de la ruta.
- **Capacidad Física en Bodega Móvil:** Conteo agregado de unidades físicas por categoría (ej. cuántos bidones de 20L, balones de gas o sacos de harina están a bordo del vehículo).
- **Paradas por Distrito:** Agrupamiento de pedidos por distrito (Surco, San Borja, Miraflores, Ate, etc.) para optimizar el recorrido.
- **Arqueo de Caja y Cobranza:** Desglose del dinero recibido en Efectivo, Yape/Plin y Bancos/POS, así como el saldo pendiente por liquidar en calle.
- Función de compartir manifiesto completo mediante `Share API` nativo.

---

## 🚀 4. Instrucciones de Instalación y Ejecución

1. **Clonar o abrir el repositorio en la terminal:**
   ```bash
   cd "d:/PROYECTOS DEVELOPER/gestor_rutas_app_mobile"
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Iniciar el servidor de desarrollo Expo:**
   ```bash
   npx expo start
   ```

4. **Ejecución:**
   - **En Dispositivo Físico:** Escanea el código QR mostrado en la consola con la aplicación **Expo Go** (disponible gratis en Google Play y Apple App Store).
   - **En Emulador Android:** Presiona la tecla `a` en la terminal.
   - **En Simulador iOS:** Presiona la tecla `i` en la terminal.
   - **En Web:** Presiona la tecla `w` en la terminal.
