---
name: ui-architecture
description: "Trigger: create component, layout, ui, styles, frontend, design, CSS, Tailwind, utility classes, shadcn, cn(), Button, Dialog, Sheet, button, modal, form actions, cta, primary button, destructive button."
---

# UI Architecture & Design Guidelines (WhatsRemind)

WhatsRemind uses a clean component architecture based on Tailwind CSS, shadcn/ui (Radix UI primitives), and a strict Button & Modal hierarchy.

---

## 1. Typography & Casing Rules (MANDATORY)

- **Casing (Mayúsculas y Minúsculas) - ESTRICTO:**
  - **NUNCA** uses ALL CAPS (todo mayúsculas) ni all lowercase para botones, títulos o labels.
  - Usa siempre **Sentence case** (ej. "Enviar recordatorio", "Guardar cambios") o **Title Case** según corresponda.
- **Font Stack:** Mantener tipografía limpia y legible para datos tabulares y números telefónicos. Utilizar clases semánticas de texto (`text-muted-foreground`, `font-medium`, `text-sm`, etc.).
- **Prohibición:** Evitar valores arbitrarios de colores hexadecimales en `className` (ej. `bg-[#128c7e]`). Utilizar siempre las clases semánticas de Tailwind / Shadcn (`bg-primary`, `text-destructive`, `bg-muted`, etc.).

---

## 2. Component Architecture & `cn()` Conventions

- **`@/components/ui/`**: Primitivas reutilizables de bajo nivel basadas en shadcn/Radix (ej. `button.tsx`, `dialog.tsx`, `input.tsx`, `badge.tsx`). No contienen lógica de negocio.
- **`@/components/`**: Componentes de dominio y composición (ej. `ExcelImportModal.tsx`, `SendProgressPanel.tsx`, `Layout.tsx`).
- **`@/lib/utils.ts`**: El único lugar donde se define `cn()`. Nunca redefinir fuera de aquí:

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

- **Regla estricta:** NUNCA concatenes clases con template literals (`${a} ${b}`) ni `.join(' ')`. Usa siempre `cn(...)`.
- Todo componente en `components/ui/` debe aceptar y propagar la prop `className`.

---

## 3. Modales & Layout Patterns (UX)

- **Estructura de Modales (Dialog):**
  - **Encabezados:** Alinear título e icono de forma clara y accesible.
  - **Botones de acción (Responsive):**
    - Desktop: Alineados a la derecha (`sm:justify-end`).
    - Mobile: Apilados a ancho completo con orden invertido (`flex-col-reverse` para que Cancelar quede abajo).
    - Clases recomendadas:
      ```tsx
      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 pt-4">
        <Button variant="ghost" className="w-full sm:w-auto">Cancelar</Button>
        <Button className="w-full sm:w-auto">Confirmar</Button>
      </div>
      ```

---

## 4. Button System & Jerarquía

| Variante | Acciones Comunes | Regla de Uso |
| :--- | :--- | :--- |
| **Default / Primary** (`default`) | Enviar mensajes, Importar, Guardar | **Máximo 1 por vista o modal.** Destaca la acción principal. |
| **Secondary** (`secondary`) | Ver historial, Exportar, Mapear | Acciones secundarias importantes sin competir visualmente con la primaria. |
| **Destructive** (`destructive`) | Desactivar cliente, Limpiar base de datos | Acciones irreversibles o destructivas en modales de confirmación. |
| **Ghost** (`ghost`) | Cancelar, Cerrar, Volver | Acciones neutras o de escape. |
| **Outline** (`outline`) | Acciones neutras con borde | Alternativa a ghost cuando se necesita delimitación visual. |

### Reglas de UX para Botones
1. **Orden en diálogos:** `[ Cancelar (Ghost/Outline) ]` a la izquierda/abajo, `[ Confirmar (Primary/Destructive) ]` a la derecha/arriba.
2. **Un solo botón primario:** Nunca coloques dos botones primarios compitiendo en el mismo diálogo.
3. **Flujo de confirmación en dos pasos:**
   - Paso 1 (Gatillo): Botón sutil (ej. icono o ghost).
   - Paso 2 (Modal): Botón `destructive` confirmado junto a un `ghost` para cancelar.
4. **Estado de Carga (Loading):** Añadir prop `disabled={isLoading}`, mostrar spinner (Lucide `Loader2` con `animate-spin`) y texto descriptivo (ej. "Enviando...").
5. **Accesibilidad en Botones con solo Icono:** TODO botón que solo contenga un icono DEBE incluir un `aria-label` explícito o `<span className="sr-only">Descripción</span>` para cumplir con React Doctor y estándares WCAG.
