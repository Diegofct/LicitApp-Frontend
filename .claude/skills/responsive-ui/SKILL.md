---
name: responsive-ui
description: Convierte templates de LicitApp en responsive (móvil/tablet/desktop) sin cambiar funcionalidad. Úsala al adaptar cualquier .html de src/app a pantallas pequeñas, al revisar si un template rompe en móvil, o al implementar specs/responsive-global.md. Se activa con "responsive", "móvil", "no cabe en pantalla", "se desborda", "adaptar a tablet", "breakpoints".
---

# Responsive UI en LicitApp

Adapta templates existentes a móvil/tablet/desktop **sin tocar lógica**. El proyecto
ya tiene un patrón responsive consistente en 20 de 25 templates: tu trabajo es
**completarlo**, no inventar uno nuevo.

## Regla nº1: cambio cosmético puro

Este trabajo es **solo de clases Tailwind en el `.html`**. Salvo las tres excepciones
listadas abajo, si te ves editando un `.ts`, párate: estás fuera de alcance.

**Prohibido:**
- Cambiar signals, `computed`, métodos, `inject()`, llamadas a servicios o rutas.
- Añadir/quitar bindings (`[value]`, `(click)`, `formControlName`), `@if`/`@for` que
  cambien qué datos se ven.
- Renombrar clases CSS que el `.ts` referencie por string.
- Borrar columnas, campos, botones o acciones. **Ocultar visualmente ≠ eliminar**:
  todo lo que un usuario puede hacer en desktop debe seguir siendo posible en móvil.
- Refactors "de paso" (extraer componentes, reordenar imports, arreglar tipos).

**Excepciones autorizadas (solo si la spec las lista):**
1. `modern-table.ts` → añadir campos opcionales a `TableColumn` (`hideOnMobile?`, `priority?`).
2. `sidebar.component.ts` → estado del drawer off-canvas.
3. `styles.css` → `@utility` / `@theme` para centralizar un patrón repetido.

Cada excepción es aditiva y retrocompatible: nada existente cambia de comportamiento.

## Flujo por template

Trabaja **un archivo a la vez**. Nunca abras un segundo template sin haber cerrado el anterior.

1. **Lee el `.html` completo** y el `.ts` que lo acompaña (solo para entender, no para editar).
2. **Diagnostica** con la checklist de `references/checklist.md`. Anota archivo:línea de cada problema.
3. **Mapea cada problema a un patrón** de `references/patrones.md` (P1–P9). Si ninguno encaja,
   busca un template de referencia (`login.html`, `seguimiento-list.html`,
   `conformacion-proponente.html`) e imita su solución. **No inventes un patrón nuevo
   sin decirlo explícitamente.**
4. **Aplica con `Edit`**, cambio por cambio. Nunca reescribas el archivo con `Write`:
   un `Write` sobre un template de 900 líneas es cómo se pierde funcionalidad.
5. **Verifica** con la sección de abajo.
6. **Reporta**: archivo, qué patrón aplicaste, y a qué breakpoint cambia el layout.

## Mobile-first, siempre

Tailwind es mobile-first: la clase sin prefijo es el estado móvil, las variantes
**añaden** desde ese ancho hacia arriba.

```html
<!-- MAL: piensa en desktop y parchea hacia abajo -->
<div class="grid-cols-3 sm:grid-cols-1">

<!-- BIEN: base = móvil, se ensancha al subir -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
```

Breakpoints del proyecto (Tailwind v4 por defecto, sin `@theme` custom):
`sm:640 · md:768 · lg:1024 · xl:1280`. **No uses `2xl:`** (0 usos en el repo).
`md:768` es el umbral principal — coincide con el que usa el sidebar en JS.

Objetivos de verificación: **390px** (móvil), **768px** (tablet), **1280px** (desktop).

## Las cinco trampas de este repo

Son la causa del 70% de los desbordes. Reconócelas antes de tocar clases.

### 1. `min-w-0` es prerrequisito de `overflow-x-auto`
Un hijo flex/grid tiene `min-width:auto` por defecto y **se niega a encogerse** por
debajo de su contenido. El `overflow-x-auto` del hijo no sirve de nada si el padre
se estira: el desborde sube hasta el `<body>`. `shell.component.html:9,11` ya tiene
`min-w-0` correctamente — no lo quites nunca. Si un contenedor tuyo desborda,
añade `min-w-0` al padre flex antes de tocar el hijo.

### 2. Estilos inline ganan a cualquier clase
`modern-table.html:11-12,28-29` aplica `[style.width]` / `[style.min-width]` desde
`TableColumn.width`. Ninguna variante `md:` puede sobrescribir eso. Si la tabla no
encoge, el arreglo está en cómo se aplica el binding, no en añadir clases.

### 3. Un modal necesita las tres piezas o el footer se pierde
`max-h` sin `flex flex-col`, o `max-h` puesto en el `<form>` en vez de en el panel,
deja header y footer **fuera** del cálculo de altura y el botón "Guardar" queda
inalcanzable. Ver P8 en `references/patrones.md`.

### 4. Padding anidado se acumula
`p-4` (página) + `p-6` (card) + `p-8` (panel interno) = 144px perdidos de 390px.
Escala **cada nivel**: `p-4 sm:p-6 md:p-8` fuera, `p-4 sm:p-6` dentro, `p-4 sm:p-8`
en el más interno.

### 5. `overflow-y-auto` a secas también activa el scroll horizontal
Por especificación CSS, si un eje es `visible` y el otro no, **el `visible` se computa
como `auto`**. Poner solo `overflow-y-auto` convierte `overflow-x` en `auto` y aparece
una barra horizontal en cuanto algo desborde a lo ancho — aunque ese desborde fuera
intencional y estuviera recortado por un ancestro.

Caso real: el `<ul>` del sidebar. Las etiquetas de navegación se ocultan con
`opacity-0`, que **no quita ancho**, así que cada enlace mide ~200px intrínsecos. Al
colapsar el sidebar a `w-20` (80px) apareció una barra horizontal dentro del menú.

Decide el eje horizontal de forma explícita:
- Desborde intencional y ya oculto por diseño → `overflow-y-auto overflow-x-hidden`.
- Desborde no deseado (contenido real que el usuario debe poder ver) → deja el `auto`:
  una barra es mejor que recortar datos.

## Nunca hagas esto para "arreglar" el responsive

| Antipatrón | Por qué no | Qué hacer |
|---|---|---|
| `overflow-hidden` en un contenedor que desborda | Oculta contenido; el usuario pierde datos | `overflow-x-auto` + `min-w-0` en el padre |
| `scale-75` o `zoom` en móvil | Rompe accesibilidad y áreas táctiles | Reducir padding/tipografía con variantes |
| `hidden` sin alternativa móvil | Elimina funcionalidad de facto | `hidden md:table-cell` + la misma info en una vista card `md:hidden` |
| `w-[390px]` u otros anchos duros | Solo funciona en un dispositivo | `w-full max-w-md` |
| `100vh` | En Safari/Chrome móvil incluye la barra de URL | `100dvh` o `h-screen` heredado del shell |
| Media queries en CSS suelto | El repo es Tailwind-only, se desincroniza | Variantes en el template |
| Tocar el `.ts` "porque es más fácil" | Sale del alcance, rompe el contrato de la spec | Resolverlo en clases, o escalarlo |

## Áreas táctiles

Todo control interactivo debe tener ≥44×44px reales en móvil. Un `<button>` con
solo un icono `<i class="bx bx-trash">` y `p-1` mide ~28px: súbelo a `p-2.5 sm:p-2`
o dale `w-full md:w-10` (patrón P6, el más maduro del repo).

## Verificación

Obligatorio antes de reportar cada archivo:

```bash
npm run build   # falla si rompiste el template
npm test        # los tests de comportamiento deben seguir verdes
```

Además, confirma manualmente:
- [ ] Ninguna acción de desktop desapareció en móvil.
- [ ] Cero scroll horizontal en el `<body>` a 390px (el scroll interno de tablas sí es válido).
- [ ] Cada modal muestra su footer con los botones a 390px y en landscape (667×375).
- [ ] El `.ts` no aparece en `git diff` (salvo excepción autorizada por la spec).

Si un cambio responsive **exige** tocar lógica, no lo hagas: detente, reporta el
caso y deja que se decida si entra en la spec. Es preferible dejar un template a
medias que romper un flujo de trabajo en producción.

## Referencias

- `references/patrones.md` — catálogo P1–P9 con ejemplos reales del repo (copia y adapta).
- `references/checklist.md` — checklist de diagnóstico y de aceptación por template.
- `specs/responsive-global.md` — el contrato SDD: alcance, orden de fases y criterios de aceptación.
  **Si esa spec existe y está aprobada, manda sobre esta skill.**
