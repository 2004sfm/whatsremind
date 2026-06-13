# Notas para el Manual de Usuario

Este documento es un borrador en constante evolución. Aquí anotaremos reglas de negocio, limitaciones técnicas de Meta y flujos de trabajo que deberán ser explicados a los usuarios finales en el manual definitivo de la aplicación.

## 1. Gestión de Plantillas y Variables
*   **Formato de Variables:** En la creación de plantillas, las variables dinámicas siempre deben escribirse entre llaves dobles numéricas y secuenciales: `{{1}}`, `{{2}}`, `{{3}}`.
*   **Prohibición de Repetición:** Por reglas estrictas de Meta, **NO** se puede repetir el mismo número de variable en el texto (ej. "Hola {{1}}, ¿cómo estás {{1}}?"). Si se necesita el mismo dato dos veces, se deben usar variables secuenciales (ej. `{{1}}` y `{{2}}`).
*   **Mapeo Diferido:** En la pantalla de creación de plantillas no se define de qué tipo es la variable (Nombre, Deuda, etc.). El usuario simplemente crea el "molde". Más adelante, en la pantalla de "Envío de Campaña", el sistema le pedirá al usuario que conecte cada variable (`{{1}}`, `{{2}}`) con la columna correspondiente de su archivo Excel. Es allí donde se pueden asignar múltiples variables a la misma columna (por ejemplo, asignar la columna "Nombre" tanto a `{{1}}` como a `{{2}}`).
