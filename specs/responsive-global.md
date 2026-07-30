# Spec: Responsive global del proyecto

- **Estado:** Implementada (con una desviación registrada en «Estado de implementación»)
- **Feature/módulo afectado:** Transversal (Shell, componentes compartidos y las 8 rutas autenticadas)
- **Autor:** Diego
- **Fecha:** 2026-07-29

## Objetivo

La aplicación hoy solo es usable en desktop. Adaptarla a móvil (≥390px), tablet (768px)
y desktop (≥1280px) para que ANALISTA y ADMIN puedan consultar licitaciones, revisar
cumplimiento y registrar seguimiento desde un celular o tablet en campo.

**Este ajuste es exclusivamente de presentación.** No cambia funcionalidad, datos,
endpoints, permisos ni flujos de trabajo. Si un cambio responsive exige tocar lógica,
queda fuera de alcance y se escala.

## Alcance

### Incluye
- Los 25 templates `.html` de `src/app/**` + los 3 templates inline en `.ts`
  (`confirm-modal`, `alert-modal`, `indicador-valor`).
- Sidebar como drawer off-canvas en <768px (hoy roba 80–256px permanentes).
- `modern-table`, `pagination` y `tabs`: arreglo de raíz con efecto en cascada.
- Los 6 modales sin `max-h`/scroll interno (2 son bugs funcionales reales: el footer
  con "Guardar" queda fuera de pantalla).
- `sidebar.component.css`: `100vh` → `100dvh`.
- Mover el `<style>` inline de `analizar-pliego-modal.html:168-177` a `styles.css`.

### No incluye
- Rediseño visual, cambios de paleta, tipografía o jerarquía de información en desktop.
- Nuevas funcionalidades, campos, columnas o pantallas.
- Cambios en servicios, interfaces de dominio, rutas, guards o roles.
- Limpieza de clases muertas (`font-roboto`, `animate-in`, `fade-in`, `zoom-in-95`):
  **detectadas en la auditoría, pero van en spec aparte** para no mezclar deudas.
- PWA, service worker, gestos táctiles o layouts específicos de app nativa.
- Tests E2E de viewport (se verifica manualmente en los 3 anchos objetivo).

## Requisitos funcionales

- **RF1 — Sin scroll horizontal.** A 390px ninguna pantalla produce scroll horizontal
  en el `<body>`. El scroll horizontal **interno** de una tabla (dentro de su
  `overflow-x-auto`) sí es válido y esperado.
- **RF2 — Navegación móvil.** En <768px el sidebar se comporta como drawer superpuesto
  (`fixed`, backdrop, `z-index` sobre el contenido), no empuja el contenido, y se cierra
  al navegar o al tocar el backdrop. En ≥768px mantiene el comportamiento actual
  (columna con colapso `w-64`/`w-20`).
- **RF3 — Modales completos.** Todo modal muestra header, body con scroll y footer con
  sus botones a 390px y en landscape (667×375). Ninguna acción queda fuera del viewport.
- **RF4 — Tablas legibles.** Las tablas de `cuadro-de-obra` (18 columnas, ≈4.344px) y
  `licitaciones` (9 columnas, ≈2.092px) son consultables en móvil sin perder información:
  columnas secundarias ocultas o vista card, con el dato siempre accesible.
- **RF5 — Paridad funcional.** Toda acción disponible en desktop sigue disponible en
  móvil. Ocultar visualmente ≠ eliminar.
- **RF6 — Desktop intacto.** A 1280px el resultado es visualmente idéntico al estado
  previo. Cualquier diferencia en desktop es un defecto de esta spec.
- **RF7 — Áreas táctiles.** Todo control interactivo mide ≥44×44px reales en móvil.

## Contratos de datos

**Ninguna interfaz cambia.** La implementación no necesitó el `hideOnMobile?: boolean`
que se había previsto en `TableColumn`: los anchos inline de `modern-table` se
neutralizan por debajo de `md` con variantes `max-md:*!` (ver «Notas técnicas»), lo
que deja `modern-table.ts`, `cuadro-de-obra.ts` y `licitaciones.ts` **sin tocar**.

No se añadió el campo por no introducir API muerta.

## Endpoints / servicio

Ninguno. Esta spec no consume, modifica ni añade llamadas HTTP.

## UI / UX

### Breakpoints
Tailwind v4 por defecto, sin `@theme` custom: `sm:640 · md:768 · lg:1024 · xl:1280`.
No se usa `2xl:`. El umbral principal es `md:768`, que coincide con el que ya usa el
sidebar en JS (`sidebar.component.ts:67-71`).

Anchos objetivo de verificación: **390px** (iPhone), **768px** (tablet), **1280px** (desktop),
más **667×375** (landscape móvil) para modales.

### Patrones
Se aplican los patrones **ya existentes** en el repo, catalogados como P1–P10 en
`.claude/skills/responsive-ui/references/patrones.md`. No se introducen patrones nuevos
salvo P10 (tabla ancha en móvil), que esta spec autoriza explícitamente.

Referencias canónicas del repo: `login.html` (cero deuda), `seguimiento-list.html`,
`seguimiento-detail.html`, `conformacion-proponente.html`.

### Estados
Carga, vacío, error y éxito conservan su comportamiento y su copy. Solo cambia su
disposición (p. ej. un skeleton de 3 columnas pasa a 1 en móvil).

## Fases de implementación

Cada fase es un lote verificable y commiteable por separado. **No se avanza a la
siguiente sin cerrar la anterior** (`npm run build` + `npm test` + revisión visual).

| Fase | Alcance | Efecto |
|---|---|---|
| **0** | `styles.css` (`@utility` para el shell de modal), `sidebar.component.css` (`100dvh`), mover `<style>` inline de `analizar-pliego-modal` | Base |
| **1** | `sidebar.component.{html,ts,css}` + `shell.component.html` + botón hamburguesa en `header.component.html` | Cascada sobre las 8 rutas autenticadas |
| **2** | `pagination.html` (5 instancias en 3 páginas) y `tabs.html` (2 páginas) | Máximo ROI, esfuerzo bajo |
| **3** | `modern-table.{html,ts}` + `TableColumn.hideOnMobile` en `cuadro-de-obra.ts` y `licitaciones.ts` | Resuelve las 2 tablas peores |
| **4** | Modales rotos: `requisito-licitacion-modal`, `confirm-presentacion-modal`, los 4 inline de `usuarios.html`, el de `resultados.html:318`, `alert-modal.ts` | Corrige 2 bugs funcionales |
| **5** | Páginas: `cuadro-de-obra` → `analisis-cumplimiento` → `empresa-form` → `usuarios` → `resultados` → `empresa-list` → `seguimiento-*` → `licitaciones` | De mayor a menor deuda |
| **6** | Modales ya correctos: ajustes finos de header y padding (`add-proceso`, `add-to-cuadro`, `edit-cuadro`, `registrar-evento`, `analizar-pliego`) | Pulido |

`login.html` y `app.html` no requieren trabajo.

## Criterios de aceptación (Given / When / Then)

- **CA1:** Dado cualquier ruta autenticada, cuando se abre a 390px de ancho, entonces
  el `<body>` no presenta scroll horizontal y ningún texto aparece cortado o superpuesto.
- **CA2:** Dado un viewport <768px, cuando el usuario pulsa el botón de menú, entonces
  el sidebar aparece **superpuesto** sobre el contenido con backdrop, y al seleccionar
  una opción navega y se cierra automáticamente.
- **CA3:** Dado un viewport ≥768px, cuando se carga cualquier ruta, entonces el sidebar
  se comporta exactamente como antes de este cambio (columna, colapso `w-64`/`w-20`).
- **CA4:** Dado el modal "Requisitos de Licitación" a 390px, cuando se abre, entonces
  los botones "Cancelar" y "Guardar Requisitos" son visibles y pulsables sin scroll de página.
- **CA5:** Dado cualquiera de los 14 modales en landscape 667×375, cuando se abre,
  entonces header y footer permanecen fijos y solo el body scrollea.
- **CA6:** Dada la tabla de Cuadro de Obra a 390px, cuando se carga, entonces se puede
  consultar cada proceso y **todos los datos de las 18 columnas siguen siendo accesibles**
  (por scroll interno, vista card o expansión).
- **CA7:** Dada la paginación a 390px, cuando hay más de 5 páginas, entonces los
  controles existentes (anterior · números · siguiente) caben en pantalla y siguen
  siendo pulsables. *Corregido respecto al borrador: el componente no tiene botones
  de «primera/última» y añadirlos sería funcionalidad nueva, fuera de alcance.*
- **CA8:** Dado cualquier control interactivo (botón, icono, checkbox) a 390px, cuando
  se mide su área táctil, entonces es ≥44×44px.
- **CA9:** Dado el proyecto a 1280px, cuando se compara con `develop` antes del cambio,
  entonces **no hay diferencia visual perceptible** en ninguna pantalla.
- **CA10:** Dado el repositorio al terminar cada fase, cuando se ejecuta `npm test` y
  `npm run build`, entonces ambos pasan sin errores nuevos.
- **CA11:** Dado el `git diff` completo de esta spec, cuando se revisa, entonces los
  únicos `.ts` modificados son los cuatro de «Excepciones de alcance», y en todos los
  casos el cambio es **aditivo** (una salida nueva, un método nuevo) o **solo clases**
  dentro de un template inline. Ningún signal, servicio, ruta o binding existente cambia.

## Notas técnicas

### Excepciones de alcance autorizadas
La regla general es "solo clases Tailwind en `.html`". Estas son las excepciones
realmente usadas, todas aditivas y retrocompatibles:

1. `sidebar.component.ts` — método nuevo `onNavigate()` para cerrar el drawer al
   navegar en <768px. No cambia ningún estado existente.
2. `header.component.ts` — salida nueva `@Output() menuToggle`. **Añadida durante la
   implementación**: RF2 exige un botón de menú alcanzable cuando el drawer está fuera
   de pantalla, y el hamburger vivía dentro del propio sidebar. `<app-header>` sin
   listener sigue compilando igual.
3. `alert-modal.ts` / `confirm-modal.ts` — **solo clases** dentro de sus templates
   inline (son los dos únicos modales sin archivo `.html`).
4. `styles.css` y `sidebar.component.css` — según Fase 0.

`shell.component.ts` **no** se tocó: el sidebar ya expone un `toggle()` público, así
que el header lo invoca a través de una referencia de plantilla (`#sidebar`). Eso
mantiene el sidebar como única fuente de verdad del estado y evita que el espejo
`isSidebarOpen` del shell se desincronice de `open()`.

### Trampas identificadas en la auditoría
- **`min-w-0` es prerrequisito de `overflow-x-auto`.** `shell.component.html:9,11` ya lo
  tiene bien puesto: **no quitarlo**. Sin él, ningún wrapper con scroll funciona.
- **Los estilos inline ganan a las clases.** `modern-table.html:11-12,28-29` aplica
  `[style.min-width]` desde el `.ts`; ninguna variante `md:` puede sobrescribirlo.
- **El padding se acumula**: `p-4` + `p-6` + `p-8` = 144px perdidos de 390px en
  `empresa-form.html:1,317,545`.
- **`100vh` en móvil** incluye la barra de URL de Safari/Chrome → usar `100dvh`.

### Signals / OnPush
El estado del drawer se maneja con `signal()` y se deriva con `computed()`, siguiendo
`CLAUDE.md`. No se introducen `BehaviorSubject` ni suscripciones manuales para estado de vista.

### Riesgo principal
Los templates grandes (`empresa-form.html`, 931 líneas; `analisis-cumplimiento.html`, 474)
se editan **con `Edit` puntual, nunca con `Write` completo**: una reescritura es la vía
más probable de perder funcionalidad silenciosamente.

### Herramienta de ejecución
La skill `.claude/skills/responsive-ui/` codifica el *cómo* (patrones, checklist,
antipatrones). Esta spec define el *qué* y el *hasta dónde*. **Ante conflicto, manda la spec.**

---

## Estado de implementación

Fases 0 a 6 ejecutadas. `npm run build` pasa; `npm test` mantiene el mismo resultado
que antes del cambio (3 pasan, 1 falla: `app.spec.ts > should render title`, test de
scaffold de Angular que busca un `<h1>Hello…` inexistente — **fallo preexistente**,
sin relación con esta spec).

### Desviación: RF4 en su lectura fuerte (vista card / columnas ocultas)

Lo implementado para las tablas grandes fue **neutralizar los anchos inline por debajo
de `md`** (`max-md:w-auto! max-md:min-w-32!`) y bajar el padding de celda a
`px-3 sm:px-6`. Con eso la tabla de Cuadro de Obra pasa de ~4.344px a ~2.100px y las
18 columnas siguen siendo consultables por scroll interno, que es exactamente lo que
**CA6 y RF1 admiten**.

**No se construyó** la vista card en móvil ni el ocultado de columnas. Razones:
- Ocultar columnas *sin* vista card violaría CA6 (perdería datos en móvil).
- Una vista card genérica obliga a duplicar el `@switch` de `modern-table.html`
  (link/badge/action/default) o a convertir la tabla en bloques apilados con CSS.
  Es un rediseño de la presentación móvil con riesgo real de regresión sobre las dos
  páginas más pesadas del sistema, y excede "únicamente que sea responsive".

Queda como candidato a **spec aparte** (`responsive-tabla-movil.md`), a decidir después
de validar en dispositivo si 2.100px de scroll horizontal es aceptable en la práctica.

### Regresión detectada en revisión y corregida
El `overflow-y-auto` añadido al `<ul>` del sidebar (Fase 1, para el desborde de ítems
en landscape) provocaba **una barra de scroll horizontal en desktop al colapsar el
sidebar**. Causa: por spec CSS, con un eje en `visible` y el otro no, el `visible` se
computa a `auto`; y las etiquetas de navegación se ocultan con `opacity-0`, que no quita
ancho, así que a `w-20` desbordaban. Corregido con `overflow-x-hidden` (el mismo
recorte que ya aplicaba el host). Documentado como trampa nº5 en la skill.

En la misma revisión se completó la Fase 6 en 4 modales que el `sed` original no había
alcanzado por orden de clases distinto: `p-4 sm:p-6` en el body y `shrink-0` +
apilado móvil en el footer de `add-proceso`, `add-to-cuadro`, `edit-cuadro` y
`registrar-evento`.

### Pendiente menor, deliberado
- `alert-modal` y `confirm-modal` scrollean el panel completo en vez de fijar el footer:
  no tienen header/footer separados, así que P8 completo no aplica.
- Los modales de `usuarios.html` mantienen sus botones dentro del `<form>` scrolleable
  (sacarlos rompería el `ngSubmit`). Son alcanzables; no quedan fuera del viewport.
- Clases muertas (`font-roboto`, `animate-in`, `fade-in`, `zoom-in-95`) siguen ahí:
  están explícitamente fuera de alcance y van en spec propia.
