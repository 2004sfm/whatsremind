# WsRemind (WhatsApp Collection Client)

WsRemind es una aplicación de escritorio nativa diseñada para automatizar la cobranza y envío de recordatorios masivos a través de la API oficial de WhatsApp Cloud. Está optimizada para administradores de condominios y gestores de cobranza que manejan datos a través de hojas de cálculo (Excel).

## 🚀 Características Principales

- **Importación Inteligente de Excel (.xlsx):** Procesa múltiples hojas simultáneamente, permitiendo mapear columnas de forma dinámica.
- **Visor Multi-Hoja (Dashboard):** Navegación fluida e instantánea entre las distintas hojas importadas sin mezclar historiales.
- **Cobranza Masiva:** Envío concurrente y asíncrono usando la API oficial de Meta sin riesgo de bloqueos por automatización no autorizada.
- **Gestor de Plantillas Nativo:** Sincronización, previsualización y creación de plantillas enriquecidas directamente desde la interfaz, conectada a Meta Graph API. Soporta validación de variables (Spintax) y parámetros en tiempo real.
- **Regla Anti-Spam (24h):** Mecanismo de prevención de envío duplicado. La aplicación audita automáticamente a quién se le ha enviado un mensaje en las últimas 24 horas para evitar molestias al cliente.
- **Seguridad Robusta & Offline-First:** Cifrado de grado militar (AES-256-GCM) local para las credenciales. Base de datos SQLite local ultra-rápida. Cero servidores intermediarios; la app se comunica directamente con Meta.
- **Traductor de Errores y "Token Guardian":** Un proceso en segundo plano verifica constantemente la salud de la conexión con Meta, bloqueando preventivamente la interfaz y traduciendo los errores técnicos de la Graph API a lenguaje natural para el usuario.

## 🛠 Stack Tecnológico

- **Core & Backend:** Rust + Tauri v2
- **Frontend:** React + Vite + TypeScript
- **Estilos:** Tailwind CSS + shadcn/ui
- **Base de Datos:** SQLite (vía `rusqlite` en Rust)
- **Cifrado:** `aes-gcm` (RustCrypto)

## 📦 Desarrollo y Ejecución

Asegúrate de tener instalados **Node.js**, **pnpm**, y el toolchain de **Rust**.

```bash
# Instalar dependencias del Frontend
pnpm install

# Levantar el entorno de desarrollo (Abre la app de escritorio en modo Debug)
pnpm tauri dev

# Compilar para producción (Genera los instaladores .deb / .AppImage / .msi)
pnpm tauri build
```

## 🔒 Privacidad de Datos

WsRemind fue diseñado bajo el principio de "Tus datos son tuyos". Ningún número de teléfono, nombre de inquilino o balance de deuda sale de tu computadora, excepto para ser transmitido directamente a los servidores cifrados de WhatsApp en el momento del envío. No hay telemetría ni bases de datos en la nube.

## Autor

Desarrollado con ❤️ por **famtiago**.

## Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.
