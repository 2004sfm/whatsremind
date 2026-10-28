# WhatsRemind

WhatsRemind es un gestor local y autónomo para el envío de recordatorios masivos y cobranzas por WhatsApp a partir de hojas de cálculo de Excel (.xlsx). Diseñado para administradores de condominios, colegios y gestores de cobranza, opera bajo una arquitectura *offline-first* con SQLite local, sin servidores intermediarios y con soporte para múltiples motores de envío oficiales y locales.

---

## 🚀 Características Principales

### 📱 Soporte Multi-Motor de WhatsApp
* **Meta Cloud API (Oficial):** Integración nativa con Meta Graph API v21 para cuentas corporativas oficiales (WABA).
* **YCloud API (Oficial):** Soporte oficial para plantillas y mensajes empresariales vía YCloud API v2 con filtrado estricto por cuenta WABA.
* **GOWA (WhatsApp Web / No Oficial):** Conexión local multi-dispositivo vía Web / código de emparejamiento usando un binario local en Go (`whatsmeow`), sin depender de servicios en la nube de terceros.
* **Evolution API:** En desarrollo (arquitectura preparada con alertas de bajo mantenimiento).

### 📊 Importación y Sincronización Inteligente de Excel (.xlsx)
* **Detección Automática de Encabezados:** Algoritmo heurístico que asigna automáticamente columnas de apartamento/código, nombre, teléfono(s) y balance de deuda.
* **Soporte para Doble Teléfono:** Admite mapeo de dos columnas de teléfono o separación automática si vienen en la misma celda delimitados por barra (`/`), coma (`,`) o punto y coma (`;`).
* **Sincronización Atómica y Anti-Fantasmas:** Inserción y actualización transaccional en SQLite con clave única `(codigo, hoja)`. Las filas que ya no existan en el nuevo archivo se desactivan automáticamente sin perder el histórico.
* **Dashboard Multi-Hoja:** Navegación fluida e instantánea entre las distintas torres o grupos del condominio.

### 📨 Motor de Envío Masivo y Seguridad
* **Plantillas y Previsualización Dinámica:** Panel interactivo con previsualización en tiempo real, selector de variables (`{{0}}` para saludo matutino/vespertino, código, deuda, nombre) y renderizado responsive adaptado al tema (Dark/Light).
* **Doble Envío con Deduplicación:** Despacho individualizado a los teléfonos principal y secundario del cliente con registros independientes en el log de auditoría. Si ambos números son idénticos, se deduplican automáticamente para no saturar al cliente.
* **Protección Anti-Baneo y Throttle Inteligente:** 
  * *GOWA:* Retardo aleatorio de 20 a 45 segundos entre envíos para proteger la línea frente a bloqueos de WhatsApp.
  * *Meta / YCloud:* Despacho ultrarrápido (100 ms) conforme a los límites de la API oficial.
* **Regla Anti-Spam (24h):** Auditoría previa de destinatarios notificados en las últimas 24 horas con advertencia preventiva antes del lanzamiento de la campaña.
* **Monitor en Vivo:** Barra de progreso en tiempo real con conteo exacto de envíos, fallos, registro de respuestas de API y botón de detención/cancelación inmediata.

### 🔒 Privacidad y Almacenamiento Local (Offline-First)
* Base de datos local ultra-rápida SQLite (`bun:sqlite` + Drizzle ORM con modo WAL activo).
* Cero telemetría externa. Las credenciales, datos de clientes y sesiones de WhatsApp residen exclusivamente en tu equipo.

---

## 🛠 Stack Tecnológico

| Componente | Tecnologías |
|---|---|
| **Runtime & Monorepo** | [Bun](https://bun.sh/) (Workspaces) |
| **Backend (`api/`)** | [ElysiaJS](https://elysiajs.com/), [Drizzle ORM](https://orm.drizzle.team/), `bun:sqlite`, Libphonenumber-js, XLSX |
| **Frontend (`web/`)** | React 19, [Vite](https://vitejs.dev/), TypeScript, [Tailwind CSS](https://tailwindcss.com/), [shadcn/ui](https://ui.shadcn.com/), Lucide Icons |
| **Motor Local WhatsApp** | GOWA (`bin/whatsapp`, Go + Whatsmeow) supervisado automáticamente |

---

## 📂 Estructura del Proyecto

```text
whatsremind/
├── api/                      # Backend REST API con ElysiaJS y Drizzle
│   ├── src/
│   │   ├── db/               # Esquema y conexión SQLite (PRAGMA WAL)
│   │   ├── jobs/             # Worker de envío masivo en background
│   │   ├── providers/        # Adaptadores (Meta, YCloud, GOWA)
│   │   ├── routes/           # Rutas (canales, clientes, mensajes, plantillas, excel)
│   │   └── supervisor/       # Gestor y monitor del proceso GOWA
│   └── data.sqlite           # Base de datos local
├── bin/                      # Binarios de utilitarios locales (GOWA)
├── storages/                 # Base de datos de sesiones locales de WhatsApp
├── web/                      # Frontend SPA con React + Vite + Tailwind
│   └── src/
│       ├── components/       # Componentes visuales y modales (shadcn/ui)
│       ├── hooks/            # Hooks de sincronización, canales y estado de APIs
│       ├── lib/              # Cliente IPC/HTTP y utilidades de mapeo
│       └── routes/           # Vistas (Clientes, Historial, Plantillas, Configuración)
└── package.json              # Configuración del monorepo
```

---

## ⚡ Inicio Rápido

### Prerrequisitos
* [Bun](https://bun.sh/) (v1.2 o superior) instalado en el sistema.

### 1. Instalación de dependencias
```bash
bun install
```

### 2. Ejecutar en entorno de desarrollo
Inicia concurrentemente tanto la API (puerto `3001`) como la interfaz web (puerto `5173`):
```bash
bun run dev
```

O si deseas levantarlos por separado:
```bash
bun run dev:api    # Levanta el backend con autoreload
bun run dev:web    # Levanta el frontend en Vite
```

### 3. Compilación para producción
```bash
bun run build:api  # Empaqueta el backend en api/dist/index.js
bun run build:web  # Chequeo estricto con tsc y compilación en web/dist/
```

### 4. Pruebas y verificación de código
```bash
# Pruebas unitarias y de integración en backend
bun test --cwd api

# Auditoría de salud y linters de React
npx react-doctor@latest web --no-telemetry -y
```

---

## ⚙️ Motores de Envío y Configuración

El motor de envío se puede alternar en cualquier momento desde la pantalla de **Configuración**:

| Motor | Requisitos | Caso de uso recomendado |
|---|---|---|
| **Meta Cloud API** | Access Token, Phone Number ID, WABA ID | Empresas que ya cuentan con cuenta verificada en Meta for Developers. |
| **YCloud API** | API Key, Número emisor verificado en YCloud | Empresas que utilizan YCloud como BSP oficial de WhatsApp. |
| **GOWA (WhatsApp Web)** | Escanear código QR o código de vinculación | Líneas locales de WhatsApp Business o estándar sin costos por mensaje de Meta. |

---

## 📄 Licencia

Este proyecto se encuentra bajo la Licencia MIT. Consulta el archivo [LICENSE](LICENSE) para más información.
