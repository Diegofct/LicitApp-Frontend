# Spec: Ajustes al Cuadro de Obra y al formulario de Requisitos de Licitación

- **Estado:** Implementada
- **Feature/módulo afectado:** Cuadro de Obra (tabla y servicio) · modal `add-to-cuadro-modal` ·
  modal `requisito-licitacion-modal` · componente reutilizable `modern-table`
- **Autor:** Diego
- **Fecha:** 2026-07-07

## Objetivo
Mejorar la operación diaria del analista (roles ANALISTA/ADMIN) sobre el Cuadro de Obra:
(1) marcar visualmente con qué procesos la empresa **sí se presenta** y con cuáles **no**,
(2) simplificar la tabla quitando la eliminación accidental, (3) dar señal visual de qué
procesos ya tienen requisitos cargados, y (4) hacer el formulario de "Añadir al Cuadro de
Obra" y el de "Requisitos de Licitación" más rápidos y consistentes (sufijos por defecto,
precarga de datos ya digitados, índices financieros como select y ajustes de rótulos).

## Alcance
- **Incluye:**
  - Resaltado de fondo por fila en el Cuadro de Obra según "nos presentamos: Sí / No".
  - Eliminación del botón de borrar registro del Cuadro de Obra.
  - Cambio de color del botón de Requisitos cuando el proceso ya tiene requisitos guardados.
  - En "Añadir al Cuadro de Obra": campos Plazo (meses) y Anticipo (%) que solo reciben el
    número, con el texto "meses" y el símbolo "%" fijos por UI. Ambos pasan a numéricos.
  - En "Requisitos de Licitación": precarga por defecto de % Anticipo y Plazo (meses) desde
    el registro del Cuadro de Obra; índices financieros como `select`; eliminación del campo
    N; y renombrar el rótulo de la capacidad residual.
- **No incluye:**
  - Rediseño general del Cuadro de Obra ni de la paginación/tabs.
  - Cambios en la lógica de cálculo de la capacidad residual (se mantiene la fórmula actual;
    solo cambia el rótulo).
  - Persistencia server-side de la marca "Sí/No" (se resuelve con `localStorage`).

## Requisitos funcionales

- **RF1 — Marcar "nos presentamos: Sí / No" por fila (resaltado):** el usuario debe poder
  marcar cada fila del Cuadro de Obra como **Sí nos presentamos** o **No nos presentamos**,
  con un color de fondo distinto para cada caso (análogo al "Revisado" de Licitaciones). Los
  tres estados posibles por fila son: sin marcar, Sí, No. El estado **persiste entre
  recargas** de página vía `localStorage` (clave por `numeroProceso`). El color de "Sí" y el
  de "No" deben ser claramente diferenciables entre sí y del resto de la tabla.

- **RF2 — Eliminar el botón de borrar:** se elimina la columna/acción de "eliminar" de la
  tabla del Cuadro de Obra, junto con su modal de confirmación y el flujo asociado en el
  componente. (El endpoint `DELETE` del backend puede permanecer; solo se retira de la UI.)

- **RF3 — Botón de Requisitos cambia de color cuando ya hay requisitos:** el botón/acción de
  Requisitos de cada fila debe mostrarse en un color cuando el proceso **aún no** tiene
  requisitos guardados y en otro color distinto cuando **ya** los tiene, para que el analista
  identifique de un vistazo qué procesos están completos.

- **RF4 — Plazo y Anticipo solo numéricos con sufijo fijo:** en el formulario "Añadir al
  Cuadro de Obra", el campo **Plazo** debe recibir únicamente el número (en meses), mostrando
  la palabra "meses" fija en la UI; y el campo **Anticipo** debe recibir únicamente el número,
  mostrando el símbolo "%" fijo en la UI. Ambos campos pasan a almacenarse como **numéricos**.

- **RF5 — Precargar Anticipo y Plazo en Requisitos:** al abrir el formulario de Requisitos de
  Licitación de un proceso, el **% de Anticipo** y el **Plazo (meses)** deben venir precargados
  por defecto con los valores digitados en el Cuadro de Obra para ese proceso. El Plazo pasa a
  ser un requisito del formulario (campo editable, precargado desde `CuadroDeObraItem.plazo`).

- **RF6 — Rótulo de capacidad residual:** en el formulario de Requisitos, el campo de capacidad
  residual debe rotularse **"Capacidad Residual Requerida"** (no "Calculada"). El cálculo no
  cambia.

- **RF7 — Índices financieros como select y eliminar N:** en el formulario de Requisitos, los
  índices financieros pasan de input numérico libre a `select` con opciones discretas en
  **pasos de 0.05**:
  - Rango **0 a 1**: Nivel de Endeudamiento, Razón Cobertura de Interés, Rentabilidad del
    Patrimonio, Rentabilidad del Activo.
  - Rango **0 a 2**: Índice de Liquidez.
  - Se **elimina** el campo **N (Nivel/Factor)** del formulario y del modelo.

## Contratos de datos

Cambios en las interfaces del feature (`pages/CuadroDeObra/interface/cuadro-de-obra.ts`):

```ts
export interface CuadroDeObraItem {
  id: number;
  numeroProceso: string;
  entidadContratante: string;
  descripcionObjeto: string;
  estadoProceso: string;
  fechaPublicacion: string;
  fechaCierre: string;
  monto: number;
  valorSMMLV: number;
  tipoProyecto: string;
  departamento: string;
  municipio: string;
  experiencia: string;
  plazo: number;            // (RF4) antes string ("6 meses") → ahora número (meses)
  anticipo: number;         // (RF4) antes string ("30%")    → ahora número (%)
  observacion?: string;
  cuadroDeObraEstado: 'POR_PRESENTAR' | 'PRESENTADO' | 'ADJUDICADO' | 'NO_ADJUDICADO' | 'CANCELADO';
  tieneRequisitos: boolean; // (RF3) NUEVO: true si el proceso ya tiene requisitos guardados
}

export interface RequisitoLicitacion {
  id?: number;
  // Experiencia
  general: string;
  especifica1: string;
  especifica2: string;
  secundaria: string;
  // Capacidad Técnica
  contrato: number;
  // Indicadores Financieros
  presupuesto: number;
  patrimonio: number;
  capitalTrabajo: number;
  // n: number;             // (RF7) ELIMINADO
  liquidez: number;               // (RF7) select 0–2, paso 0.05
  endeudamiento: number;          // (RF7) select 0–1, paso 0.05
  razonCoberturaInteres: number;  // (RF7) select 0–1, paso 0.05
  rentabilidadPatrimonio: number; // (RF7) select 0–1, paso 0.05
  rentabilidadActivo: number;     // (RF7) select 0–1, paso 0.05
  // Plazo y Capacidad Residual
  plazo: number;           // (RF5) NUEVO: meses, precargado desde CuadroDeObraItem.plazo
  kresidualProceso: number;
  poeAnticipo: number;     // (RF5) precargado desde CuadroDeObraItem.anticipo
}
```

Extensión **genérica** de `modern-table` para RF3 (icono/color de acción por fila):

```ts
// components/modern-table/modern-table.ts
export interface TableColumn {
  key: string;
  label: string;
  type?: 'text' | 'date' | 'datetime' | 'currency' | 'link' | 'action' | 'badge';
  width?: string;
  actionIcon?: string;
  actionIconFn?: (row: TableData) => string; // NUEVO: clase de icono por fila (prioriza sobre actionIcon)
}
```

Estado local para RF1 (no requiere backend):

```ts
// clave localStorage: 'cuadro-de-obra:presentacion'
// forma: Record<numeroProceso, 'SI' | 'NO'>
type EstadoPresentacion = 'SI' | 'NO';
```

## Dependencias de backend (repo `licitapp`)
Estos RF requieren ajustes en el backend además del frontend:

- **RF3 —** exponer `tieneRequisitos: boolean` en cada item del listado
  `GET /api/v1/cuadro-de-obra` (derivado de si existe registro de requisitos para ese id),
  para evitar N+1 llamadas desde el frontend.
- **RF4 —** `plazo` y `anticipo` de `CuadroDeObra` pasan de `String` a numérico
  (entidad + DTO + mapper). Se implementa **migración de datos existentes** con formato texto
  ("6 meses" → 6, "30%" → 30) — ver "Dependencias de backend" / plan de implementación.
- **RF5 —** agregar `plazo` (número, meses) a la entidad/DTO de requisitos.
- **RF7 —** eliminar el campo `n` de la entidad/DTO de requisitos (o dejar de requerirlo).

> Nota: RF1, RF2 y RF6 son **solo frontend**.

## Endpoints / servicio
- **Listado (RF3):** `GET /api/v1/cuadro-de-obra?page&size&vista&sort` — la respuesta ahora
  incluye `tieneRequisitos` por item. Sin cambios de firma en `CuadroDeObraService.obtenerCuadroDeObra()`.
- **Requisitos (RF5/RF7):** se reutilizan `guardarRequisitos()`, `actualizarRequisitos()` y
  `obtenerRequisitos()`; el payload incluye `plazo` y ya no incluye `n`.
- **Añadir al cuadro (RF4):** se reutiliza `agregarACuadroDeObra()`; `plazo` y `anticipo`
  viajan como número.
- **RF1/RF2/RF6:** sin cambios de servicio.

## UI / UX
- **RF1 (resaltado Sí/No):**
  - Colores sugeridos (a confirmar en diseño): **Sí nos presentamos** → verde suave
    (`bg-green-50 hover:bg-green-100`); **No nos presentamos** → rojo/rosa suave
    (`bg-rose-50 hover:bg-rose-100`). Se implementa reutilizando `rowClassFn` de `modern-table`.
  - Control por fila: una acción que **cicla** los tres estados (sin marca → Sí → No → sin
    marca) con ícono y `title` que reflejen el estado (p. ej. `bx-check-circle` verde /
    `bx-x-circle` rojo / `bx-circle` gris). El color no debe ser el único indicador
    (ícono + `title`/leyenda). Añadir leyenda encima de la tabla.
- **RF2:** quitar la columna de acción "eliminar", el `ConfirmModal` de borrado y su lógica.
- **RF3:** el botón de Requisitos usa `actionIconFn`: gris/neutro cuando `tieneRequisitos` es
  `false` y verde (`text-green-600`) cuando es `true` (o el par de colores que defina diseño),
  con `title` acorde ("Sin requisitos" / "Requisitos cargados").
- **RF4:** inputs `type="number"` con adorno visual de sufijo:
  - Plazo: número + texto fijo "meses" (patrón de adorno absoluto, como ya se hace con "%").
  - Anticipo: número + símbolo "%" fijo. Validaciones: `min(0)`; Anticipo `max(100)`.
- **RF5:** el form de Requisitos precarga `poeAnticipo` y el nuevo campo `plazo` desde el
  `CuadroDeObraItem`. Ubicar el campo Plazo (meses) en la sección correspondiente, editable.
- **RF6:** rótulo "Capacidad Residual (Calculada)" → **"Capacidad Residual Requerida"**.
- **RF7:** cinco `select` con opciones generadas en pasos de 0.05 (0–1 y liquidez 0–2); quitar
  el input y la etiqueta de "N (Nivel/Factor)".
- **Estados generales:** conservar spinner de carga, estado vacío y manejo de error actuales.

## Criterios de aceptación (Given / When / Then)

- **CA1 (RF1):** Dado un proceso del Cuadro de Obra, cuando el usuario lo marca como "Sí nos
  presentamos", entonces su fila se muestra con el color de "Sí"; al marcarlo "No", con el
  color de "No"; y al desmarcarlo, sin resaltado.
- **CA2 (RF1):** Dado un proceso marcado (Sí o No), cuando el usuario recarga la página,
  entonces la fila conserva la marca y su color.
- **CA3 (RF1):** El color de "Sí" es visualmente distinto del de "No".
- **CA4 (RF2):** Dada la tabla del Cuadro de Obra, entonces no existe ningún botón de eliminar
  registro ni su modal de confirmación.
- **CA5 (RF3):** Dado un proceso sin requisitos, su botón de Requisitos se muestra en el color
  "pendiente"; cuando se guardan sus requisitos, tras recargar el listado el botón pasa al
  color "cargado".
- **CA6 (RF4):** Dado el formulario "Añadir al Cuadro de Obra", cuando el usuario escribe "6"
  en Plazo y "30" en Anticipo, entonces la UI muestra "6 meses" y "30 %" y se guardan los
  valores numéricos 6 y 30.
- **CA7 (RF5):** Dado un proceso con Anticipo=30 y Plazo=6 en el Cuadro de Obra, cuando se abre
  su formulario de Requisitos (nuevo), entonces % Anticipo llega en 30 y Plazo (meses) en 6.
- **CA8 (RF6):** El formulario de Requisitos rotula el campo como "Capacidad Residual Requerida".
- **CA9 (RF7):** Los cinco índices financieros se editan mediante `select`; Endeudamiento,
  Razón Cobertura, Rentabilidad Patrimonio y Rentabilidad Activo ofrecen 0–1 en pasos de 0.05,
  y Liquidez ofrece 0–2 en pasos de 0.05. No existe el campo N en el formulario.

## Notas técnicas
- Mantener convenciones del repo: `standalone` + `OnPush`, estado con `signal`/`computed`,
  `inject()` con campos `private readonly`, Tailwind en template, tipado estricto (sin `any`).
- **RF1:** patrón idéntico al "Revisado" de Licitaciones — signal `Set`/`Map` inicializado
  desde `localStorage`, escritura en cada toggle, coloreado vía `rowClassFn`. Considerar un
  `Map<string, 'SI' | 'NO'>` para los tres estados.
- **RF3:** `actionIconFn` debe ser opcional y no afectar otros usos de `modern-table`; cuando
  esté presente, el template usa su resultado en lugar de `actionIcon`.
- **RF4/RF5:** al cambiar `plazo`/`anticipo` a numérico, revisar `edit-cuadro-modal` y
  `add-proceso-modal` para que no rompan con el nuevo tipo. Coordinar con backend la migración.
- **RF7:** generar las opciones del `select` con un helper (`[0, 0.05, … , 1]` y `[…, 2]`) para
  no hardcodear listas largas en el template; mostrar el número con 2 decimales.
- **Verificación:** `npm test` + recorrido manual de CA1–CA9 (autenticado, backend arriba).

## Decisiones (resueltas)
1. **RF1 — persistencia:** ✅ `localStorage` (clave por `numeroProceso`), como el "Revisado".
2. **RF4/RF5 — tipo de dato de Plazo/Anticipo:** ✅ Numérico (cambio en backend); la UI muestra
   "meses" y "%" como sufijo fijo.
3. **RF5 — alcance de "Plazo":** ✅ El Plazo (meses) digitado en el Cuadro de Obra se vuelve un
   requisito del formulario de Requisitos, precargado desde `CuadroDeObraItem.plazo`.
4. **RF7 — granularidad del select:** ✅ Pasos de 0.05.
5. **RF4 — datos existentes:** ✅ Se ejecuta migración que convierte los valores de texto
   actuales de `plazo`/`anticipo` a numéricos.
