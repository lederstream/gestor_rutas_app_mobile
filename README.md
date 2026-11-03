# 🚚 RutaPro Mobile / DistriExpress
### Sistema de Gestión Logística, Distribución Inmediata y Ruteo de Última Milla

Solución móvil integral desarrollada en **React Native con Expo y TypeScript**, concebida para operadores logísticos locales, distribuidores de mercancía y repartidores de última milla en Lima Metropolitana.

---

## 🎯 1. Descripción del Problema y Solución Técnica

### El Problema Logístico
En las operaciones de reparto urbano de alta rotación (agua purificada, gas GLP, panadería y productos químicos de limpieza), los conductores enfrentan:
* Pérdida de tiempo por rutas desordenadas y falta de geolocalización inmediata de clientes.
* Inconsistencias en el arqueo de caja (efectivo, transferencias y pagos digitales como Yape/Plin).
* Falta de control sobre envases retornables vacíos recuperados en ruta (bidones de 20L y balones de gas).
* Fallos de conectividad en zonas periféricas que bloquean aplicaciones que dependen de servidores externos.

### La Solución Implementada
**RutaPro Mobile** resuelve esta problemática mediante una arquitectura orientada a la autonomía operativa:
* **Persistencia y Estado 100% In-Memory:** Gestión predecible del estado mediante Context API + `useReducer`, eliminando bloqueos por latencia de red.
* **Geocodificación y Ruteo Instantáneo:** Mapa de coordenadas distritales sin consumo de cuotas de red externas, con apertura directa hacia Google Maps (`https://www.google.com/maps/dir/?api=1&destination=LAT,LNG`).
* **Hoja de Ruta y Manifiesto de Carga:** Agrupamiento de pedidos por distrito, cálculo de peso físico a bordo en bodega móvil y conciliación de cobranza en vivo.

---

## 🏗️ 2. Arquitectura de Software y Modularidad (`src/`)

El código sigue una estricta separación de responsabilidades por capas (Layered Architecture):

```text
src/
├── models/                     # Entidades del Dominio e Interfaces TypeScript
│   ├── Order.ts                # Modelo de Pedido, Filtros, Estados y Estadísticas
│   ├── Customer.ts             # Modelo de Cliente y Libreta de Direcciones
│   ├── Product.ts              # Catálogo de Productos y Servicios
│   └── User.ts                 # Modelo de Usuario y Roles (RBAC)
├── context/                    # Capa de Estado Global (Context API + useReducer)
│   ├── OrderContext.tsx        # Provider de Pedidos con selectores y enriquecimiento dinámico
│   ├── orderReducer.ts         # Reducer puro (ADD_ORDER, UPDATE_ORDER, CHANGE_STATUS, DELETE_ORDER)
│   ├── CustomerContext.tsx     # Provider de Clientes y Direcciones
│   ├── ProductContext.tsx      # Provider de Catálogo de Productos
│   └── AuthContext.tsx         # Provider de Autenticación y Control de Sesión
├── screens/                    # Vistas y Pantallas Desacopladas
│   ├── WelcomeScreen.tsx       # Tablero Ejecutivo y KPIs de la Jornada
│   ├── OrderListScreen.tsx     # Tablero de Despachos con Buscador y Filtros
│   ├── CreateOrderScreen.tsx   # Asistente Guiado de Pedidos con Validación en Rojo
│   ├── OrderDetailScreen.tsx   # Auditoría de Despacho, Liquidación y Google Maps
│   ├── RouteSummaryModalOrScreen.tsx # Manifiesto de Carga y Arqueo Financiero
│   ├── MapRouteScreen.tsx      # Visualización de Ruta Interactiva en Mapa
│   ├── CustomerListScreen.tsx  # Gestión de Cartera de Clientes
│   ├── CustomerFormScreen.tsx  # Registro y Edición de Clientes
│   ├── ProductListScreen.tsx   # Gestión del Catálogo de Productos
│   └── ProductFormScreen.tsx   # Registro y Edición de Productos
├── components/                 # Componentes Atómicos y Especializados
│   ├── common/
│   │   ├── CustomButton.tsx    # Botón ergonómico con feedback táctil y variantes
│   │   ├── CustomInput.tsx     # Input con validación visual en texto rojo
│   │   ├── Header.tsx          # Cabecera desacoplada con navegación
│   │   └── LocationPickerModal.tsx # Selector interactivo de coordenadas
│   └── orders/
│       ├── OrderCard.tsx       # Tarjeta de despacho con acciones rápidas
│       ├── StatusBadge.tsx     # Chip semántico de estado (Pendiente, En Ruta, Entregado)
│       ├── PriorityBadge.tsx   # Chip de urgencia logística (Urgente, Alta, Normal)
│       └── OrderFilterBar.tsx  # Barra segmentada con conteo de pedidos en tiempo real
├── services/
│   └── geocodingService.ts     # Geocodificación instantánea in-memory para distritos de Lima
└── utils/
    ├── constants.ts            # Tokens de diseño, colores, configuración de categorías y distritos
    ├── formatters.ts           # Formateadores puros (S/., Fechas, Teléfonos y Estadísticas)
    ├── haptics.ts              # Feedback vibratorio nativo
    ├── mockData.ts             # Datos operativos iniciales en memoria
    └── priorityHelper.ts       # Algoritmo de urgencia dinámica según tiempo transcurrido
```

---

## 🛠️ 3. Tecnologías y Librerías Utilizadas

* **Framework Principal:** React Native 0.76.7 + Expo SDK 52
* **Lenguaje:** TypeScript 5.3.3 (Strict Mode)
* **Gestión de Estado:** React Context API + `useReducer` (In-Memory State Management)
* **Navegación:** React Navigation v6 (`@react-navigation/native-stack`) con rutas 100% tipadas
* **Mapas y Coordenadas:** `react-native-maps` + `Linking API` (Google Maps URL scheme)
* **Iconografía y UI:** `@expo/vector-icons` (Ionicons) + `react-native-safe-area-context`
* **Feedback Táctil:** `expo-haptics`

---

## 📋 4. Requisitos Previos del Entorno

1. **Node.js:** Versión 18.x o 20.x (LTS recomendada).
2. **npm:** Versión 9.x o superior (incluido con Node.js).
3. **Dispositivo de Pruebas:**
   * Dispositivo móvil físico con la aplicación **Expo Go** instalada (disponible en Google Play Store y Apple App Store), o
   * Emulador de Android (Android Studio) / Simulador de iOS (Xcode en macOS).

---

## 🚀 5. Instrucciones de Instalación y Ejecución

1. **Clonar o situarse en el directorio del proyecto:**
   ```bash
   cd "d:/PROYECTOS DEVELOPER/gestor_rutas_app_mobile"
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Iniciar el servidor de desarrollo de Expo:**
   ```bash
   npx expo start
   ```

4. **Despliegue y Visualización:**
   * **En Dispositivo Móvil:** Abre la app **Expo Go** y escanea el código QR mostrado en la terminal.
   * **En Emulador Android:** Presiona la tecla `a` en la terminal de Expo.
   * **En Simulador iOS:** Presiona la tecla `i` en la terminal de Expo.
   * **En Navegador Web:** Presiona la tecla `w` en la terminal de Expo.

---

## 🧪 6. Guía Paso a Paso para Probar el Ciclo CRUD Completo en Memoria

Para verificar la robustez del sistema y el cumplimiento de los requerimientos técnicos, ejecuta el siguiente flujo:

### Paso 1: Autenticación y Carga Inicial en Memoria
1. En la pantalla de bienvenida o inicio de sesión, ingresa con las credenciales de operador:
   * **Usuario:** `distribuidor`
   * **Contraseña:** `123`
2. Observa el **Tablero Principal**: la aplicación carga inmediatamente en memoria los pedidos iniciales (`mockData`) de agua, gas, panadería y limpieza con sus métricas en vivo.

### Paso 2: Crear un Nuevo Pedido (CREATE)
1. Presiona el botón flotante **`+`** o selecciona **"Generar Pedido"**.
2. **Prueba de Validación en Rojo:**
   * En el Paso 1, selecciona el modo **"Nuevo / Manual"**.
   * Intenta presionar **"Continuar al Paso 2"** con los campos vacíos.
   * **Verificación:** Observa cómo aparecen los mensajes de validación **en texto color rojo directamente debajo de cada input** (Nombre, Teléfono de 9 dígitos, Distrito y Dirección), bloqueando el avance.
   * Completa los datos requeridos (ej. Cliente: *Bodega San Martín*, Teléfono: *987112233*, Distrito: *Miraflores*, Dirección: *Av. Larco 450*).
   * Pulsa **"Continuar al Paso 2"**.
3. **Selección de Productos y Carga:**
   * Agrega productos del catálogo (ej. Bidones de Agua 20L o Balones de Gas) utilizando los botones táctiles `+`.
   * Presiona **"Continuar al Paso 3"**.
4. **Cobro y Confirmación:**
   * Elige el método de pago (Efectivo / Yape) y la prioridad.
   * Presiona **"Confirmar y Despachar Pedido"**. El pedido queda registrado inmutablemente en el estado global.

### Paso 3: Filtrado y Búsqueda Reactiva (READ)
1. Ingresa a la **"Hoja de Ruta"** (`OrderListScreen`).
2. Escribe en la barra de búsqueda el nombre del cliente creado (*San Martín*) o el distrito (*Miraflores*): la lista se filtra en tiempo real.
3. Alterna entre los chips de estado (**TODOS**, **PENDIENTES**, **EN RUTA**, **ENTREGADOS**) para comprobar el recuento reactivo.

### Paso 4: Transición de Estados y Google Maps (UPDATE)
1. Presiona directamente sobre la tarjeta del pedido para acceder a `OrderDetailScreen`.
2. **Apertura de Google Maps:**
   * Presiona el botón **"Abrir en Google Maps"**.
   * **Verificación:** La aplicación invoca `Linking.openURL` con el esquema directo `https://www.google.com/maps/dir/?api=1&destination=LAT,LNG`.
3. **Transición a "En Ruta" y "Entregado":**
   * Presiona **"Despachar a Ruta"** (el estado cambia a `IN_TRANSIT`).
   * Presiona **"Confirmar Entrega Conforme"**. Se despliega el diálogo nativo de confirmación (`Alert.alert`). Al aceptar, el estado pasa a `DELIVERED` y se actualiza el arqueo financiero.

### Paso 5: Eliminación Segura de Pedido (DELETE)
1. En la pantalla de detalle del pedido, presiona el icono de la papelera en la barra superior.
2. **Verificación:** Se despliega un diálogo nativo `Alert.alert` con las opciones **"Cancelar"** y **"Eliminar"**.
3. Pulsa **"Eliminar"**: el pedido se remueve del estado inmutable y la vista regresa a la lista con los KPIs actualizados.

---

## 👤 7. Nota de Desarrollo

* **Modalidad:** Proyecto desarrollado de manera individual.
* **Estándar de Calidad:** Arquitectura modular desacoplada, tipado estricto con TypeScript, validación de formularios en tiempo real, manejo inmutable del estado en memoria y compatibilidad total garantizada con **Expo Go**.
