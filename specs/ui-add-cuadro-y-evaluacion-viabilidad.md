# Spec: Mejoras de UI — Formulario "Añadir al Cuadro de Obra" y módulo "Evaluación de Viabilidad"

- **Estado:** Implementada
- **Feature/módulo afectado:** modal `add-to-cuadro-modal` · módulo `AnalisisCumplimiento`
  (página `analisis-cumplimiento` · `sidebar.component.ts` · `app.routes.ts` · `edit-cuadro-modal.ts`)
- **Autor:** Diego
- **Fecha:** 2026-07-09

## Objetivo
Pulir la experiencia visual de dos superficies muy usadas por el analista (roles ANALISTA/ADMIN)
**sin alterar su funcionamiento ni su flujo**:
1. El formulario "Añadir al Cuadro de Obra" muestra el **ID** del proceso en vez del **número**,
   rotula el presupuesto de forma técnica y deja editable un valor que en realidad es calculado.
2. El módulo de "Análisis de Cumplimiento" desaprovecha el espacio (los resultados quedan
   apretados en 2/3 del ancho y sus valores largos chocan con la columna de estado) y su nombre
   no comunica bien su propósito.

## Alcance
- **Incluye (RF1, formulario Añadir al Cuadro de Obra):**
  - Mostrar el **número de proceso** (`licitacion.numero`) en lugar del **ID** (`idDelProceso`).
  - Rotular el campo de monto simplemente como **"Presupuesto"** y mostrar su valor con **formato
    de moneda (COP)**.
  - Hacer el campo **Valor SMMLV** de **solo lectura** (se sigue autocalculando desde el monto),
    con el mismo estilo de "campo calculado" que ya se usa en otros formularios.
  - Retoques menores de UI (jerarquía, espaciado) manteniendo intactos campos, validaciones y
    envío.
- **Incluye (RF2, módulo Evaluación de Viabilidad):**
  - **Renombrar** la etiqueta visible del módulo de "Análisis de Cumplimiento" →
    **"Evaluación de Viabilidad"** (título de página, subtítulo, encabezados internos y label del
    sidebar).
  - **Renombrar la ruta** `/analisis-cumplimiento` → **`/evaluacion-viabilidad`** y actualizar
    **todas** sus referencias (definición de ruta, sidebar, navegación desde `edit-cuadro-modal`,
    deep-links) para que el flujo no se rompa.
  - **Redistribuir** el layout para aprovechar el ancho: la configuración (selección de proceso +
    simulación de consorcio) queda como panel lateral compacto/`sticky`; los **resultados del
    análisis ocupan el ancho completo** (no 2/3) cuando existen.
  - **Corregir el choque de valores** en la tabla de resultados (columnas Requerido/Obtenido vs.
    Estado): anchos/wrapping adecuados para que los montos largos no se encimen ni se recorten.
- **No incluye:**
  - Cambios de lógica de negocio: cálculo del análisis, sugerencias de consorcio, cálculo del
    SMMLV o del presupuesto. Solo presentación/rotulado.
  - Renombrar la **carpeta**, la **clase** `AnalisisCumplimiento`, el **selector**
    `app-analisis-cumplimiento` ni el `AnalisisCumplimientoService`. Estos identificadores internos
    se conservan para minimizar el riesgo de romper imports; **sí** se renombra la ruta pública y
    todas sus referencias (ver RF2.1).
  - Cambios en el backend (ninguno).

## Requisitos funcionales

- **RF1.1 — Número de proceso en lugar de ID:** en el bloque de contexto (solo lectura) del modal
  "Añadir al Cuadro de Obra", donde hoy se muestra "ID Proceso" con `licitacion.idDelProceso`, se
  debe mostrar el **número del proceso** (`licitacion.numero`) con un rótulo acorde
  ("Nº de Proceso" / "Número de Proceso").

- **RF1.2 — Rótulo y formato del presupuesto:** el campo hoy rotulado "Monto (Presupuesto)" pasa a
  rotularse **"Presupuesto"**, y su valor se muestra con **formato de moneda COP**. Debe seguir
  siendo editable y alimentando el cálculo del SMMLV (no cambia el flujo de `valueChanges`).

- **RF1.3 — Valor SMMLV de solo lectura:** el campo **Valor SMMLV** se muestra como **solo
  lectura** (calculado a partir del monto), con el estilo visual de campo calculado usado en el
  resto de la app (fondo suave, `cursor-not-allowed`). Su valor sigue derivándose del monto.

- **RF2.1 — Renombrar a "Evaluación de Viabilidad" (textos + ruta):**
  - **Textos visibles:** título `<h1>` y subtítulo de la página; label del sidebar
    (`sidebar.component.ts`): "Análisis" → "Evaluación de Viabilidad"; encabezados internos
    ("Resultados del Análisis" → "Resultados de la Evaluación", "Ejecutar Análisis" → "Ejecutar
    Evaluación").
  - **Ruta:** cambiar el `path` `analisis-cumplimiento` → `evaluacion-viabilidad` en
    `app.routes.ts`, y actualizar **todas** las referencias a la ruta:
    - `sidebar.component.ts` (`route: '/evaluacion-viabilidad'`).
    - `edit-cuadro-modal.ts` (`this.router.navigate(['/evaluacion-viabilidad'], …)`).
    - Comentario de deep-link en `analisis-cumplimiento.ts`.
  - **Se conservan** (para no romper imports): carpeta `pages/AnalisisCumplimiento/…`, clase
    `AnalisisCumplimiento`, selector `app-analisis-cumplimiento`, `templateUrl` y
    `AnalisisCumplimientoService`. Solo cambia el `path` público y sus usos.

- **RF2.2 — Redistribución del espacio:** reorganizar la página para que:
  - El panel de **configuración** (Paso 1: seleccionar proceso + resumen de requisitos, y
    simulación de participación + botón ejecutar) quede como **columna lateral compacta**,
    idealmente `sticky` al hacer scroll.
  - La **lista de empresas** y los **resultados** aprovechen el resto del ancho; cuando hay
    resultados, éstos se presentan a **ancho completo** (no comprimidos en 2/3), eliminando el
    hueco izquierdo que quedaba tras ejecutar.

- **RF2.3 — Legibilidad de la tabla de resultados:** en cada tarjeta de resultado, la tabla de
  indicadores (Indicador · Requerido · Obtenido · Estado) debe distribuir bien sus columnas de modo
  que valores numéricos largos (p. ej. `123'456.789`) **no se encimen ni colisionen** con la
  columna Estado: asignar anchos, permitir `whitespace`/wrapping y alinear la columna Estado sin que
  "empuje" las demás.

## Contratos de datos
Sin cambios de interfaces ni de payloads. Se reutilizan los campos existentes:
- `Licitacion.numero` (ya existe) para RF1.1; el `FormControl` `numeroProceso` ya se alimenta de él.
- `RequisitoLicitacion` y `AnalisisResponse`/`DetalleAnalisis` intactos para RF2.

## Endpoints / servicio
- **Ninguno nuevo ni modificado.** RF1 y RF2 son exclusivamente de presentación (HTML/TS de vista).

## UI / UX
- **RF1 (modal Añadir al Cuadro de Obra):**
  - Bloque de contexto: "Nº de Proceso" (`licitacion.numero`) + "Entidad" (sin cambios).
  - Presupuesto: reutilizar el patrón de moneda ya usado en `requisito-licitacion-modal`
    (`formatCurrency` + `onCurrencyFocus`/`onCurrencyBlur`) o un enfoque equivalente, para mostrar
    el valor formateado como COP y permitir edición cómoda. El listener de SMMLV debe seguir
    disparándose al cambiar el monto.
  - Valor SMMLV: input `readonly` con estilo de campo calculado (p. ej. `bg-gray-100 text-gray-600
    cursor-not-allowed`), mostrando el número con hasta 2 decimales.
  - Mantener grid responsivo y el resto de campos/labels tal cual.
- **RF2 (Evaluación de Viabilidad):**
  - Layout sugerido: `lg:grid-cols-12` con **config** en `lg:col-span-4` (`sticky top-6`) y el área
    de **trabajo/resultados** en `lg:col-span-8`; **al haber resultados**, la sección de resultados
    puede volverse full-bleed dentro del contenedor (ancho completo del área principal) para no
    quedar comprimida. Alternativa aceptable: mover la lista de empresas al panel izquierdo bajo la
    config y dejar toda la columna derecha para resultados.
  - Tabla de indicadores: definir `table-fixed` con anchos por columna (Indicador ancho, Requerido y
    Obtenido medianos con `tabular-nums` y `whitespace-nowrap` controlado o `break-words`), y la
    columna Estado con ancho propio alineada a la derecha/centro; mantener `overflow-x-auto` como
    salvaguarda.
  - Conservar estados: carga (`loadingAnalisis`), vacío ("Listo para analizar") y las sugerencias de
    consorcio con su diseño actual.
- **Accesibilidad:** conservar `label`/`for`, `aria-label` del botón cerrar y contraste; el color no
  debe ser el único indicador de estado (ya hay íconos + texto).

## Criterios de aceptación (Given / When / Then)
- **CA1 (RF1.1):** Dado el modal "Añadir al Cuadro de Obra" para una licitación, entonces el bloque
  de contexto muestra el **número de proceso** (no el ID) con un rótulo "Nº de Proceso".
- **CA2 (RF1.2):** El campo de presupuesto se rotula "Presupuesto" y muestra el valor con formato de
  moneda COP; al editar el monto, el Valor SMMLV se recalcula como hoy.
- **CA3 (RF1.3):** El campo Valor SMMLV no es editable (solo lectura) y refleja el cálculo derivado
  del monto.
- **CA4 (RF1):** El formulario guarda exactamente los mismos datos que antes (número de proceso,
  monto, SMMLV, plazo, anticipo, etc.); no se rompe el envío ni el modo solo-lectura (`readonly`).
- **CA5 (RF2.1):** El sidebar, el título de la página y los encabezados internos muestran
  "Evaluación de Viabilidad" (y variantes coherentes) en lugar de "Análisis de Cumplimiento".
- **CA5.1 (RF2.1 ruta):** La URL del módulo es `/evaluacion-viabilidad`; el link del sidebar navega
  a ella, la navegación desde `edit-cuadro-modal` (`?cuadroId=…&conformacion=1`) sigue funcionando y
  no queda ninguna referencia viva a `/analisis-cumplimiento` en el código.
- **CA6 (RF2.2):** Tras ejecutar la evaluación, los resultados ocupan el ancho disponible sin dejar
  un hueco vacío a la izquierda; la configuración permanece accesible como panel lateral.
- **CA7 (RF2.3):** En un resultado con valores largos (millones), las columnas Requerido/Obtenido no
  se enciman ni colisionan con la columna Estado; el contenido es legible en desktop y hace scroll
  horizontal controlado en pantallas estrechas.

## Notas técnicas
- Mantener convenciones del repo: `standalone` + `OnPush`, `signal`/`computed`, `inject()` con
  campos `private readonly`, Tailwind en template, tipado estricto (sin `any`).
- **RF1.2/1.3:** el `valorSMMLV` ya se calcula en `updateSMMLV()`; para hacerlo `readonly` basta con
  el atributo/estilo en el template (o `disable()` del control) **cuidando** que el valor siga
  viajando en el submit — hoy `onSubmit` usa `this.form.value`; si se usa `disable()`, cambiar a
  `getRawValue()` para no perder el SMMLV. Preferible mantener el control habilitado y solo `readonly`
  en la vista para no tocar el envío.
- **RF2:** cambios en `analisis-cumplimiento.html` (grid/anchos/textos), textos en
  `analisis-cumplimiento.ts`/`sidebar.component.ts`, y el `path` en `app.routes.ts` +
  `edit-cuadro-modal.ts`. No renombrar clase `AnalisisCumplimiento`, selector
  `app-analisis-cumplimiento` ni carpeta. Tras el cambio, un grep de `analisis-cumplimiento` solo
  debe encontrar los identificadores internos (carpeta/clase/selector/templateUrl), nunca la ruta.
- **Implementación:** se realizará con el subagente `angular-frontend` respetando `CLAUDE.md`.
- **Verificación:** `npm run build` (type-check + plantillas) + recorrido manual de CA1–CA7
  (autenticado, backend arriba).

## Decisiones (propuestas — a confirmar en revisión)
1. **Nombre del módulo:** "Evaluación de Viabilidad" (título, subtítulo, encabezados y sidebar).
2. **Alcance del renombre:** ✅ (aclarado por el usuario) se renombra la **ruta** a
   `/evaluacion-viabilidad` y se actualizan **todas** sus referencias; los identificadores internos
   (carpeta, clase, selector, servicio) se conservan para no romper imports.
3. **SMMLV read-only:** se mantiene el control habilitado y solo `readonly` en la vista (sin tocar el
   envío).

## Preguntas abiertas
- Etiqueta exacta del sidebar: ¿"Evaluación de Viabilidad" completo o abreviado "Evaluación" por
  espacio? (Por defecto: "Evaluación de Viabilidad").
