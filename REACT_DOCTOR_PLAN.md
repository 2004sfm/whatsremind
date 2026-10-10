# React Doctor - Plan de Refactorización y Auditoría

Este documento sirve como guía operativa para que cualquier agente de IA o desarrollador tome el frontend de `web/` y resuelva las incidencias reportadas por **React Doctor** hasta alcanzar el 100% de calidad.

## Comando de Auditoría
Ejecutar desde la raíz del proyecto:
```bash
npx react-doctor@latest web --no-telemetry -y
```

---

## Bloque 1: Bugs Críticos & Memory Leaks (Prioridad Alta)
*Objetivo:* Eliminar fugas de memoria, timers descontrolados y condiciones de carrera en hooks.

- [ ] **Cleanup de timers / suscripciones:**
  - `web/src/components/Layout.tsx:130`: El efecto que maneja timeouts o eventos no retorna su función de limpieza (`clearTimeout` / `removeEventListener`).
  - `web/src/routes/TemplateManagement.tsx:103`: `setTimeout` dentro de `useEffect` sin `clearTimeout`.
- [ ] **State updates post-await en Effects:**
  - `web/src/App.tsx:26`: `setState` después de una llamada asíncrona dentro de `useEffect`. Puede generar memory leaks si el componente se desmonta antes de resolver.
  - `web/src/routes/ClientManagement.tsx:116`: `setState` post-await.
  - `web/src/routes/SendHistory.tsx:19`: `setState` post-await.
- [ ] **Dependencias faltantes en useEffect (`exhaustive-deps`):**
  - `web/src/routes/ClientManagement.tsx:118`
  - `web/src/routes/Settings.tsx:72` y `110`
  - `web/src/routes/TemplateManagement.tsx:124`

---

## Bloque 2: Arquitectura & Descomposición de Componentes Gigantes (Prioridad Media)
*Objetivo:* Bajar complejidad ciclomática y eliminar antipatrones de sincronización de estado.

- [ ] **Descomponer componentes gigantes (>300 líneas y alta complejidad ciclomática):**
  - `web/src/routes/ClientManagement.tsx` (dividir tabla, filtros y barra superior).
  - `web/src/routes/TemplateManagement.tsx` (extraer editor de plantillas y lista).
  - `web/src/routes/Settings.tsx` (extraer formularios de Meta y YCloud).
  - `web/src/components/ExcelImportModal.tsx` (extraer previsualizador de columnas y mapeo).
  - `web/src/components/Layout.tsx` (extraer sidebar y header).
- [ ] **Eliminar reseteo/sincronización de props a estado:**
  - `web/src/components/ExcelImportModal.tsx:39-47`: Múltiples `setState` escuchando cambios de props en lugar de usar claves (`key`) o estado derivado puro.
- [ ] **Eliminar estado derivado:**
  - `web/src/components/SendProgressPanel.tsx:51`: Valor derivado copiado en `useState`. Calcularlo directamente en el render.

---

## Bloque 3: Rendimiento & Estilos CSS (Prioridad Media-Baja)
*Objetivo:* Evitar recalcular layout completo en animaciones y renderizados innecesarios de listas.

- [ ] **Eliminar `transition: all`:**
  - Reemplazar `transition-all` por propiedades específicas (`transition-colors`, `transition-opacity` o `transition-transform`) en:
    - `web/src/components/SendProgressPanel.tsx:132`
    - `web/src/components/ui/progress.tsx:20`
    - `web/src/routes/Settings.tsx:452`
    - `web/src/routes/SetupWizard.tsx:147`, `164`, `216`
    - `web/src/routes/TemplateManagement.tsx:325`
- [ ] **Eliminar índices de array como `key` en listas:**
  - `web/src/components/ExcelImportModal.tsx:211`, `316`
  - `web/src/components/SendProgressPanel.tsx:132`
  - `web/src/routes/ClientManagement.tsx:524`

---

## Bloque 4: Accesibilidad & Calidad UI (WCAG)
*Objetivo:* Cumplir accesibilidad en botones interactivos.

- [ ] **Icon-only Button sin label accesible:**
  - `web/src/components/Pagination.tsx:22` y `34`: Botones con solo icono que requieren `aria-label` explícito o `<span className="sr-only">`.
- [ ] **Controles sin label asociado:**
  - `web/src/routes/Settings.tsx:441`
- [ ] **Eventos de teclado en elementos interactivos:**
  - `web/src/components/Layout.tsx:181`: Click listener en elemento estático sin soporte de teclado (`onKeyDown`).

---

## Ranking Original — Prioridad "Child-First" (Antes de fixes)

Orden de corrección propuesto (de hojas hacia raíz):

1. **`ExcelImportModal.tsx`** — 7 issues (state reset, array-as-key, JSX duplicado, complejidad)
   - `key={row[0] || i}` en tabla preview
   - `key={reason}` en grupos de error

2. **`SendProgressPanel.tsx`** — 2 issues (derived state, array-as-key)
   - `key={log.phone_number}` en logs en vivo

3. **`Progress.tsx` / `ui/progress.tsx`** — `transition: all` → propiedades específicas

4. **`Pagination.tsx`** — botones icon-only sin `aria-label`

5. **`Layout.tsx`** — timers sin cleanup (`clearTimeout`), eventos keyboard

6. **Rutas (`ClientManagement`, `TemplateManagement`, `Settings`)** — `setState` post-await, `exhaustive-deps`

7. **`App.tsx`** — raíz (único issue restante)

*Este ranking fue la guía inicial antes de aplicar correcciones individuales.*
