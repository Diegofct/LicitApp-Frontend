# Catálogo de patrones responsive de LicitApp (P1–P9)

Estos patrones **ya existen en el repo**. Al adaptar un template, copia el patrón
correspondiente en vez de improvisar. Cada uno cita archivos reales donde verlo.

Distribución de breakpoints en el repo: `md:` 47% · `sm:` 32% · `lg:` 19% · `xl:` 2% · `2xl:` 0%.

**Templates de referencia canónicos:**
- `pages/Login/login.html` — 100% responsive, cero deuda.
- `pages/Seguimiento/seguimiento-list.html` y `seguimiento-detail.html` — mejor densidad/adaptación.
- `components/conformacion-proponente/conformacion-proponente.html` — mejor formulario dinámico.

---

## P1 — Contenedor de página

```html
<div class="p-4 sm:p-6 md:p-8">
```

Usado en: `licitaciones:1`, `empresa-list:1`, `analisis-cumplimiento:1`, `resultados:1`,
`seguimiento-list:1`, `seguimiento-detail:1`, `empresa-form:1`. Variante `p-4 sm:p-6 lg:p-8` en `usuarios:1`.

Pendiente: `cuadro-de-obra.html:1` tiene `p-6` fijo.

---

## P2 — Cabecera de página (título + acción)

```html
<div class="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
  <div>
    <h1 class="text-2xl sm:text-3xl font-bold">Título</h1>
    <p class="text-sm text-gray-500">Descripción</p>
  </div>
  <button class="w-full md:w-auto ...">Acción</button>
</div>
```

Usado en: `resultados:6`, `seguimiento-list:4`. Variantes: `md:items-center` (`empresa-list:3`),
`sm:` en vez de `md:` (`usuarios:3`, `empresa-form:3`).

El botón a `w-full` en móvil y `md:w-auto` en desktop es lo que evita que se comprima a dos líneas.
Títulos: escala `text-2xl sm:text-3xl` (el repo lo tiene solo en `empresa-form:765`; es el objetivo).

---

## P3 — Grid de cards

```html
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
```

Usado en: `empresa-list:42`. Variantes según densidad:
- KPIs: `grid-cols-1 md:grid-cols-3 lg:grid-cols-4` (`resultados:26`)
- Métricas compactas: `grid-cols-2 md:grid-cols-3` (`resultados:80`)
- Badges/contadores: `grid-cols-2 sm:grid-cols-4` (`seguimiento-detail:41`)
- Cards densas: `md:grid-cols-2 xl:grid-cols-3 gap-5` (`seguimiento-list:117`)

Regla: contenido con texto largo empieza en `grid-cols-1`; números cortos pueden empezar en `grid-cols-2`.

---

## P4 — Grid de formulario (el patrón dominante: 19 usos)

```html
<div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
  <div class="space-y-1">…</div>
  <div class="space-y-1">…</div>
  <div class="space-y-1 md:col-span-2"><!-- campo ancho completo --></div>
</div>
```

Usado en: `add-proceso-modal:30,46,53,67,137,172,179`, `requisito-licitacion-modal:63,92`,
`empresa-form:324,438,515,553,679`.

Nunca dejes `grid-cols-2` sin variante en un formulario: a 390px cada celda queda a ~145px
y las razones sociales se cortan. Pendiente: `edit-cuadro-modal:18`.

---

## P5 — Layout de 12 columnas con aside

```html
<div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
  <aside class="lg:col-span-4 lg:sticky lg:top-6 lg:self-start">…</aside>
  <section class="lg:col-span-8 min-w-0">…</section>
</div>
```

Usado en: `analisis-cumplimiento:7,10,132`. Variante para barras de filtro:
`md:grid-cols-12` con `md:col-span-5/3/2/2` (`seguimiento-list:18,20,35,50,59`).

`sticky` solo desde el breakpoint donde hay dos columnas: en móvil apilado, un aside
sticky tapa el contenido.

---

## P6 — Fila de FormArray sobre 12 columnas (patrón más maduro del repo)

```html
<div class="grid grid-cols-12 gap-3 items-start">
  <div class="col-span-12 md:col-span-7">…</div>              <!-- campo principal -->
  <div class="col-span-8  md:col-span-3">…</div>              <!-- campo numérico -->
  <div class="col-span-4  md:col-span-2 flex md:justify-end items-end">
    <button class="w-full md:w-10 h-10 ...">                  <!-- acción -->
      <i class="bx bx-trash"></i>
    </button>
  </div>
</div>
```

Usado en: `conformacion-proponente:202,204,277,298,305`.

Aquí `grid-cols-12` **sin variante en el padre** es correcto: la adaptación vive en los
hijos (`col-span-12` → `md:col-span-7`). El botón `w-full md:w-10` resuelve el área
táctil en móvil y vuelve a icono cuadrado en desktop.

---

## P7 — Dos paneles con aside sticky

```html
<div class="flex flex-col lg:flex-row gap-8">
  <div class="flex-1 min-w-0 space-y-8">…</div>
  <div class="w-full lg:w-80 xl:w-96">
    <div class="lg:sticky lg:top-6 rounded-3xl p-4 sm:p-6 lg:p-8">…</div>
  </div>
</div>
```

Usado en: `empresa-form:541,544,596,597` y `:667,670,750,751`.

`w-full lg:w-80 xl:w-96` es la forma correcta de un panel de ancho fijo. Nunca `w-80` a secas.
Ojo con el padding anidado: `p-8` dentro de un container que ya tiene `p-6` y `p-4`.

---

## P8 — Modal: shell + footer

El panel necesita **las tres piezas juntas** o el footer queda fuera del viewport.

```html
<!-- wrapper: centra y da margen al borde de pantalla -->
<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
  <!-- panel: max-h + flex-col + overflow-hidden -->
  <div class="w-full max-w-2xl max-h-[90dvh] flex flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
    <!-- header: NO crece -->
    <div class="shrink-0 px-4 sm:px-6 py-4 border-b flex items-start justify-between gap-3">
      <div class="min-w-0">
        <h3 class="text-lg sm:text-xl font-semibold truncate">Título</h3>
        <p class="text-xs text-gray-500">Subtítulo</p>
      </div>
      <button class="shrink-0 p-2" (click)="cerrar()"><i class="bx bx-x"></i></button>
    </div>

    <!-- body: el ÚNICO que scrollea -->
    <div class="flex-1 overflow-y-auto px-4 sm:px-6 py-4">…</div>

    <!-- footer: NO crece, botones apilados en móvil -->
    <div class="shrink-0 px-4 sm:px-6 py-4 border-t flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
      <button class="w-full sm:w-auto ...">Cancelar</button>
      <button class="w-full sm:w-auto ...">Guardar</button>
    </div>
  </div>
</div>
```

Correcto ya en: `add-proceso-modal:1,2,21,201`, `add-to-cuadro-modal:1,2,15,121`,
`edit-cuadro-modal:1,2,13,122`, `registrar-evento-modal:2,8,34,117`, `analizar-pliego-modal:1,2,21`.
Footer P8 ya aplicado en: `registrar-evento-modal:117`, `confirm-presentacion-modal:75,138`,
`conformacion-proponente:383`, `confirm-modal.ts:18`.

`flex-col-reverse` en móvil pone la acción primaria arriba (más cerca del pulgar) manteniendo
el orden lógico del DOM para lectores de pantalla.

**Errores a corregir:** `max-h` en el `<form>` en vez de en el panel
(`requisito-licitacion-modal:2,55`), o panel sin `max-h` ni `flex-col`
(`usuarios:140,258,355,463`, `resultados:318`, `confirm-presentacion-modal:8`, `alert-modal.ts:53`).

---

## P9 — Ocultar, truncar y desbordar

**Ocultar por breakpoint (siempre con alternativa):**
```html
<div class="hidden sm:flex">…</div>       <!-- header:13 -->
<span class="hidden sm:inline-flex">…</span>  <!-- resultados:167 -->
<div class="hidden lg:flex">…</div> <div class="flex lg:hidden">…</div>  <!-- login:3,47 -->
```

**Truncar (requiere `min-w-0` en el hijo flex):**
```html
<div class="flex items-center gap-3">
  <i class="bx bx-buildings shrink-0"></i>
  <div class="min-w-0">
    <p class="truncate">{{ razonSocial }}</p>
  </div>
</div>
```
Usado en: `shell:9,11`, `conformacion:68,81,133,219,255`, `seguimiento-detail:21,129`,
`seguimiento-list:126`, `resultados:322,326`, `empresa-form:61,160,166`, `analisis:362,370`.
`shrink-0` en avatares/iconos: `conformacion:65,78,85,130,212,252`, `seguimiento-list:132`.

**Tabla con scroll horizontal:**
```html
<div class="overflow-x-auto">
  <table class="min-w-full">…</table>
</div>
```
Usado en: `modern-table:4-5`, `usuarios:45-46`, `resultados:197-198`, `analisis-cumplimiento:243-244`.
Pendiente: `analisis-cumplimiento:146-147` (solo tiene `overflow-y-auto`).

**Padding de card escalado:**
`p-4 sm:p-5` (`seguimiento-list:17`) · `p-5 sm:p-6` (`seguimiento-detail:19`) ·
`px-5 sm:px-6` (`resultados:158`) · `p-6 md:p-8` (`empresa-form:54`) ·
`p-6 md:p-8 lg:p-10` (`empresa-form:317`).

---

## P10 — Tabla ancha en móvil (patrón nuevo, requiere la spec)

Cuando una tabla suma miles de píxeles (`cuadro-de-obra` ≈ 4.344px, `licitaciones` ≈ 2.092px),
el scroll horizontal solo no basta. Dos salidas, en orden de preferencia:

**A. Ocultar columnas secundarias, conservando el dato en la vista card.**
```html
<th class="hidden md:table-cell">…</th>
<td class="hidden md:table-cell">…</td>
```

**B. Vista card en móvil + tabla en desktop.** Misma fuente de datos, dos presentaciones:
```html
<div class="md:hidden space-y-3">   <!-- cards --> </div>
<div class="hidden md:block overflow-x-auto"> <table>…</table> </div>
```

Ambas exigen que el `min-width` inline de `modern-table.html:11-12,28-29` deje de aplicarse
por debajo de `md`. Eso toca `modern-table.ts` → **solo bajo excepción autorizada por la spec**.
También baja el padding de celda: `px-3 sm:px-6` en vez de `px-6` fijo (48px por celda × 18 columnas).
