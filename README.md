# Gestor de Rutas Móvil - Sistema de Reparto y Logística

Aplicación móvil desarrollada en **React Native con Expo y TypeScript** para la gestión logística de despachos, pedidos y ruteo en tiempo real. Proyecto desarrollado de forma **individual** para la **Escuela de Tecnología**.

El sistema opera completamente **en memoria (in-memory)** utilizando `Context API` y `useReducer`, cumpliendo con el requisito de no requerir una base de datos externa para su funcionamiento.

---

## 1. Descripción del Caso y Objetivo

### Caso de Uso
En el rubro de distribución urbana (agua en bidones, gas en balones, insumos de panadería y productos de limpieza), los repartidores y choferes suelen manejar sus entregas en papeles o chats de mensajería desordenados, provocando pérdidas de pedidos, confusión con los envases retornables y retrasos en las rutas.

### Objetivo
Digitalizar el flujo operativo diario del repartidor en una sola app:
- Registrar pedidos con validación de datos en tiempo real.
- Organizar la hoja de ruta según el estado de cada entrega.
- Navegar a la dirección del cliente abriendo directamente Google Maps con sus coordenadas.
- Gestionar cobros (efectivo / Yape) y control de envases vacíos devueltos.

---

## 2. Requisitos Previos

Para ejecutar la aplicación localmente, asegúrate de tener instalado:

- **Node.js**: Versión 18.x o 20.x LTS recomendada.
- **npm**: Versión 9 o superior (incluido con Node).
- **JDK (Java Development Kit)**: Versión 17 (necesaria para Android SDK / Gradle).
- **Android Studio**: Con Android SDK Platform 34 y un emulador configurado (o un celular Android con modo depuración USB activado).
- **Xcode** *(Opcional, solo en macOS)*: Para compilar en el simulador de iOS.
- **Expo Go**: Aplicación móvil instalada en tu teléfono físico (disponible gratis en Google Play y App Store).

---

## 3. Instalación

1. Clona el repositorio en tu máquina:
   ```bash
   git clone https://github.com/lederstream/gestor_rutas_app_mobile.git
   cd gestor_rutas_app_mobile
   ```

2. Instala las dependencias del proyecto:
   ```bash
   npm install
   ```

---

## 4. Ejecución del Proyecto

### Opción 1: Con Expo Go (Recomendado para pruebas rápidas)
Es la manera más rápida y directa de probar la app en tu teléfono físico:
```bash
npm start
```
*(También puedes usar `npx expo start -c` si deseas limpiar la caché)*.

- **En celular físico**: Abre la app **Expo Go** y escanea el código QR que se dibuja en la terminal.
- **En emulador Android**: Con el emulador encendido, presiona la tecla `a` en la terminal.
- **En simulador iOS**: Presiona la tecla `i` en la terminal.

### Opción 2: Ejecución Nativa en Android
Si deseas compilar directamente el binario nativo:
```bash
npx react-native run-android
```
*(o también: `npx expo run:android`)*

### Opción 3: Ejecución Nativa en iOS (macOS)
```bash
npx react-native run-ios
```
*(o también: `npx expo run:ios`)*

---

## 5. Estructura y Arquitectura del Proyecto

El código está organizado en carpetas modulares dentro de `src/`, manteniendo separada la interfaz de la lógica de negocio:

```text
src/
├── models/         # Interfaces y modelos TypeScript (Order, Customer, Product, User)
├── context/        # Estado global en memoria (OrderContext, AuthContext, CustomerContext, ProductContext)
│   └── orderReducer.ts # Reducer con acciones puras (ADD, UPDATE, CHANGE_STATUS, DELETE)
├── screens/        # Vistas principales de la aplicación:
│   ├── LoginScreen.tsx        # Inicio de sesión por roles
│   ├── WelcomeScreen.tsx      # Panel principal con resumen y KPIs
│   ├── OrderListScreen.tsx    # Hoja de ruta con buscador y filtros
│   ├── CreateOrderScreen.tsx  # Formulario asistido para nuevos pedidos
│   ├── OrderDetailScreen.tsx  # Detalle del despacho, cambio de estado y GPS
│   ├── RouteSummaryModalOrScreen.tsx # Manifiesto de carga y arqueo de caja
│   ├── CustomerListScreen.tsx # Gestión de clientes
│   ├── ProductListScreen.tsx  # Gestión de productos
│   └── ProfileScreen.tsx      # Perfil de usuario y ajustes
├── components/     # Componentes reutilizables:
│   ├── common/     # CustomButton, CustomInput (con mensajes en rojo), Header, etc.
│   └── orders/     # OrderCard, StatusBadge, PriorityBadge, OrderFilterBar
├── services/       # Geocodificación local y servicios de soporte
└── utils/          # Constantes, colores, formateadores (S/.) y mockData inicial
```

---

## 6. Guía para Probar el Flujo CRUD

La aplicación cuenta con datos precargados en memoria para poder probar inmediatamente todas las operaciones del CRUD:

### Cuentas de acceso rápido (Login)
- **Chofer / Distribuidor**: Usuario `distribuidor` | Clave `123`
- **Administrador**: Usuario `admin` | Clave `123`
- **Cliente**: Usuario `cliente` | Clave `123`
*(También se puede ingresar usando el número de celular registrado).*

---

### Flujo de Prueba Paso a Paso:

### 1. CREATE (Crear un nuevo pedido)
1. Inicia sesión como **distribuidor** o pulsa en **"Generar Pedido"** (botón `+` flotante).
2. **Prueba de validación:** Si dejas campos obligatorios vacíos y pulsas continuar, el sistema mostrará los mensajes de error en **color rojo debajo de cada input**.
3. Selecciona o ingresa los datos del cliente (Nombre, Teléfono, Distrito y Dirección).
4. En el paso 2, añade productos al carrito (por ejemplo, 2 Bidones de Agua de 20L).
5. En el paso 3, selecciona el método de pago (Efectivo / Yape) y la prioridad.
6. Pulsa en **"Confirmar y Despachar Pedido"**. El pedido aparecerá de inmediato en la lista.

### 2. READ (Listar y Filtrar)
1. Ve a la pantalla **Hoja de Ruta** (`OrderListScreen`).
2. Escribe en el buscador el nombre del cliente o distrito: la lista responderá en tiempo real.
3. Toca los filtros superiores (**Todos**, **Pendientes**, **En Ruta**, **Entregados**) para ver cómo se agrupan los pedidos y sus contadores.

### 3. UPDATE (Actualizar estado y ver detalle)
1. Toca cualquier pedido de la lista para entrar a su pantalla de detalle (`OrderDetailScreen`).
2. **GPS:** Pulsa el botón **"Abrir en Google Maps"** para comprobar que se abre el navegador/app con las coordenadas exactas de la entrega.
3. Cambia el estado del pedido:
   - Presiona **"Despachar a Ruta"** (pasa de *Pendiente* a *En Ruta*).
   - Presiona **"Confirmar Entrega Conforme"**. Aparecerá una confirmación nativa. Al confirmar, el pedido pasa a *Entregado* y se suma a la recaudación del día.

### 4. DELETE (Eliminar pedido)
1. Dentro del detalle de un pedido, presiona el ícono del **tacho de basura** en la barra superior.
2. La aplicación abrirá un diálogo nativo de confirmación (`Alert.alert`) preguntando si estás seguro.
3. Pulsa **"Eliminar"**: el pedido se retirará del estado en memoria y volverás a la lista con los contadores actualizados.

---

## 7. Datos de la Entrega

- **Institución:** Escuela de Tecnología  
- **Modalidad:** Proyecto Individual  
- **Desarrollador:** Leder / Integrante individual  
- **Repositorio:** [github.com/lederstream/gestor_rutas_app_mobile](https://github.com/lederstream/gestor_rutas_app_mobile)
