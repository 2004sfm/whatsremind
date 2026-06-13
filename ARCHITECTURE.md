# Estándares y Arquitectura del Proyecto (WsRemind)

Este documento centraliza las decisiones de arquitectura, patrones de diseño y reglas de estilo establecidas a lo largo del desarrollo. Todo nuevo código o contribución debe adherirse a estas reglas para mantener la integridad técnica y visual de la aplicación.

## 1. Arquitectura de Base de Datos (SQLite)

Hemos decidido utilizar un **Patrón de Fotografía (Snapshot)** en lugar de un modelo relacional tradicional (CRM Centralizado) para el manejo de clientes.

- **Identidad Primaria:** La identidad única de un registro en la base de datos está dada por el código del apartamento y la hoja del Excel (`UNIQUE(code, sheet_name)`). No usamos el teléfono ni el nombre como llave primaria.
- **Aislamiento de Historias:** Modificar un número telefónico en Febrero NO alterará el historial inmutable de Enero. Esto previene cobrarle deudas viejas a inquilinos nuevos.
- **Filas Fantasma:** El importador de Rust está diseñado para saltar silenciosamente las filas del Excel que están en blanco, exceptuando si les falta el teléfono, marcándolas como `is_sendable = false`.

## 2. Motor de Envío y Graph API (Meta)

- **Worker de Fondo (Tauri Async):** Los envíos masivos se procesan en hilos concurrentes utilizando `tokio::sync::watch` para permitir la cancelación instantánea del lote sin bloquear la interfaz de usuario de React.
- **Spintax:** Se aplican reglas de Spintax al vuelo `{Hola|Buenos días}` para diversificar los mensajes de cobranza y reducir riesgos de ban.
- **Token Guardian:** El frontend hace un `polling` silencioso cada 5 minutos comprobando la validez del token de Meta sin saturar la red. Si el token expira o es revocado, la UI bloquea automáticamente cualquier intento de envío o gestión de plantillas.
- **Capa de Traducción de Errores:** La aplicación no vomita el JSON crudo de Meta al usuario final. Cualquier excepción (`OAuthException`, `401`, etc.) es capturada por la función utilitaria `parseMetaError`, la cual la convierte en texto amigable ("Tu sesión ha expirado").

## 3. Escala Tipográfica y UI/UX

Toda la aplicación utiliza un "Design System" estricto basado en Tailwind CSS. Está prohibido el uso de estilos CSS globales.

- **Título de Pantalla (View Title - `h1`):** `text-2xl font-bold tracking-tight text-slate-900 dark:text-white`
- **Títulos de Sección (`h2`):** `text-lg font-semibold tracking-tight text-slate-900 dark:text-white`
- **Métricas Destacadas:** `text-3xl font-bold tracking-tight`
- **Modos Visuales (Empty States):** Toda pantalla o tabla que carezca de datos o falle en conexión DEBE renderizar una Tarjeta de Estado Vacío en el centro, reemplazando alertas intrusivas o páginas rotas.

## 4. Puente de Comunicación (IPC)

- **Delegación de Responsabilidades:** TypeScript (React) funciona únicamente como una capa de presentación "tonta". Todo el peso del procesamiento lógico, validaciones de archivos, parsing de Excel y cálculos recaen sobre los Comandos de Rust (`#[tauri::command]`).
- **Interfaces Estrictas:** Toda llamada al backend de Rust mediante `invoke` debe estar tipada y exportada en el archivo `src/lib/ipc.ts`. Prohibido usar `invoke` directamente dentro de React.

## 5. Gestión de Secretos

- Las credenciales (Token Permanente, Phone ID, WABA ID) JAMÁS deben guardarse en `localStorage`.
- Se guardan en almacenamiento seguro local y encriptadas con `AES-256-GCM` (RustCrypto).
