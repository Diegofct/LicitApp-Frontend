# Checklist responsive por template

Recórrela **entera** sobre cada `.html` antes de editar. Anota `archivo:línea` de cada hallazgo.

## A. Diagnóstico

### Contenedor y espaciado
- [ ] ¿El contenedor raíz escala el padding? (`p-4 sm:p-6 md:p-8` — P1)
- [ ] ¿Hay padding anidado acumulado? (`p-4` + `p-6` + `p-8` = 144px perdidos de 390px)
- [ ] ¿Títulos `text-3xl`/`text-5xl` sin variante? → `text-2xl sm:text-3xl`

### Flex
- [ ] ¿`flex justify-between` con título + botón sin `flex-col md:flex-row`? (P2)
- [ ] ¿Filas de botones sin `flex-col-reverse sm:flex-row`? (P8)
- [ ] ¿Grupos de chips/badges/filtros sin `flex-wrap`?
- [ ] ¿Hijos flex con texto largo sin `min-w-0` + `truncate`? (P9)
- [ ] ¿Iconos/avatares sin `shrink-0` que se aplastan?
- [ ] ¿Algún `flex-shrink-0` que impide encoger a un bloque ancho? (caso `pagination:18`)

### Grid
- [ ] ¿`grid-cols-N` (N≥2) sin variante y con contenido de texto? (P3/P4)
- [ ] Excepción válida: `grid-cols-12` cuyos hijos sí usan `col-span-X md:col-span-Y` (P6)

### Anchos y altos duros
- [ ] ¿`w-[NNNpx]`, `min-w-[NNNpx]`, `h-[NNNpx]` sin `max-w-full` ni variante?
- [ ] ¿`w-80`/`w-96` a secas? → `w-full lg:w-80 xl:w-96` (P7)
- [ ] ¿Atributos `width`/`height` en `<svg>` que no encogen?
- [ ] ¿`100vh` en vez de `100dvh`? (en móvil incluye la barra de URL)
- [ ] ¿`max-h-[400px]` fijo que supera el viewport en landscape (375px de alto)?

### Tablas
- [ ] ¿La tabla está envuelta en `overflow-x-auto`?
- [ ] ¿El padre flex de ese wrapper tiene `min-w-0`? (sin esto el `overflow-x-auto` no sirve)
- [ ] ¿La suma de anchos de columna supera ~1.500px? → P10
- [ ] ¿Padding de celda `px-6` fijo? → `px-3 sm:px-6`

### Modales
- [ ] ¿El panel tiene `max-h-[90dvh]` **y** `flex flex-col` **y** `overflow-hidden`? (P8)
- [ ] ¿El `max-h` está en el panel y no en el `<form>` o en un hijo?
- [ ] ¿El body tiene `flex-1 overflow-y-auto` y header/footer `shrink-0`?
- [ ] ¿El header del modal apila título largo + botón X sin empujarlo fuera?
- [ ] ¿Hay contenido de longitud variable (`whitespace-pre-line`, `@for` sobre N items) sin scroll?

### Interacción
- [ ] ¿Botones de solo icono con área táctil <44px? → `p-2.5 sm:p-2` o `w-full md:w-10`
- [ ] ¿Dropdowns `absolute` que se salen del viewport a 390px?
- [ ] ¿Tabs con labels largos que envuelven a 3-4 filas? → `flex-nowrap overflow-x-auto`

### Overflow
- [ ] ¿Algún `overflow-y-auto` **sin** `overflow-x-*` explícito? El eje horizontal se
      computa a `auto` solo (trampa nº5) → decide si va `overflow-x-hidden` o se deja
- [ ] ¿Hay hijos que se ocultan con `opacity-0` en vez de `w-0`/`hidden`? Siguen
      ocupando ancho y desbordan al colapsar el contenedor

### Estilos fuera de Tailwind
- [ ] ¿Bloques `<style>` dentro del template? → mover a `styles.css`
- [ ] ¿`[style.width]` / `[style.min-width]` inline? (ganan a cualquier clase — trampa nº2)
- [ ] ¿Archivo `.css` de componente con reglas de layout?

## B. Aceptación (antes de reportar el archivo)

### Funcionalidad intacta — lo más importante
- [ ] `git diff` **no** muestra ningún `.ts` (salvo excepción autorizada por la spec)
- [ ] `git diff` del `.html` no añade ni quita bindings (`(click)`, `[value]`, `formControlName`)
- [ ] `git diff` del `.html` no añade ni quita `@if` / `@for` que cambien qué datos se muestran
- [ ] Toda columna, campo, botón o acción de desktop sigue accesible en móvil (oculta ≠ eliminada)
- [ ] Ningún `overflow-hidden` nuevo que recorte contenido

### Layout
- [ ] **390px**: cero scroll horizontal en `<body>` (el scroll interno de tablas sí es válido)
- [ ] **390px**: ningún texto cortado a media palabra ni superpuesto
- [ ] **768px**: el layout intermedio no queda ni apretado ni con huecos raros
- [ ] **1280px**: **idéntico a antes del cambio** — si desktop cambió, te pasaste de alcance
- [ ] **Landscape 667×375**: los modales muestran su footer con los botones

### Build
- [ ] `npm run build` pasa
- [ ] `npm test` pasa (mismos tests verdes que antes)

## C. Reporte

Por cada archivo cerrado, indica:
1. Ruta del template.
2. Patrones aplicados (P1–P10) y a qué breakpoint cambia el layout.
3. Hallazgos que **no** arreglaste y por qué (típicamente: requerían tocar `.ts`).
