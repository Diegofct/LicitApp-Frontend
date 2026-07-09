# Spec: Mejoras a la tabla de Búsqueda SECOP (Licitaciones) y su integración con Cuadro de Obra

- **Estado:** Implementada
- **Feature/módulo afectado:** Licitaciones (Búsqueda SECOP) · componente `modern-table` · modal `add-to-cuadro-modal` · Cuadro de Obra (servicio)
- **Autor:** Diego
- **Fecha:** 2026-07-03

## Objetivo
Mejorar la usabilidad de la tabla de Búsqueda SECOP para que el analista (roles
ANALISTA/ADMIN) pueda: (1) ver de un vistazo qué licitaciones ya fueron agregadas
al Cuadro de Obra, (2) marcar hasta qué proceso ha revisado, (3) evitar agregar la
misma licitación más de una vez, y (4) filtrar/simplificar las columnas de la tabla.

## Alcance
- **Incluye:**
  - Resaltado visual de filas ya agregadas al Cuadro de Obra.
  - Botón/acción para marcar una fila como "revisada" (color distinto al de "agregada").
  - Modal que, si la licitación ya está en el Cuadro de Obra, muestra los datos ya
    guardados y NO permite agregarla de nuevo.
  - Filtro por entidad.
  - Reorganización de columnas: eliminar "ID Proceso", "Estado" y "Modalidad";
    "Número Proceso" pasa a ser la primera columna.
- **No incluye:**
  - Cambios en la lógica de negocio del Cuadro de Obra más allá de la consulta de existencia.
  - Rediseño general del módulo o de la paginación.

## Requisitos funcionales

- **RF1 — Resaltar filas ya agregadas al Cuadro de Obra:** cada fila cuya licitación
  ya exista en el Cuadro de Obra (cruce por `numero` ↔ `numeroProceso`) debe mostrarse
  con un color de fondo distintivo (p. ej. verde suave) que indique "ya guardada".

- **RF2 — Evitar duplicados y mostrar datos guardados:** al hacer clic en el botón de
  acción de una licitación **ya agregada**, el modal debe abrirse precargado con los
  datos guardados y en modo solo lectura (sin botón "Guardar" activo), impidiendo que
  se agregue una segunda vez. Para una licitación **no agregada**, el comportamiento
  actual (formulario editable + guardar) se mantiene.

- **RF3 — Marcar fila como "revisada":** debe existir una acción por fila que permita
  al usuario resaltar/marcar esa fila como "revisada hasta aquí". El color de "revisada"
  debe ser **diferente** al color de "agregada al Cuadro de Obra" (RF1). El estado de
  revisión debe persistir entre recargas de página.

- **RF4 — Filtro por entidad:** el usuario debe poder filtrar los resultados de la tabla
  por el nombre de la entidad.

- **RF5 — Reorganización de columnas:**
  - Eliminar la columna "ID Proceso" (`idDelProceso`).
  - "Número Proceso" (`numero`) pasa a ser la **primera** columna.

- **RF6 — Eliminar columnas redundantes:** eliminar las columnas "Estado" (`estado`) y
  "Modalidad" (`modalidad`), ya que todos los registros son estado "publicado" y
  modalidad "Licitación pública - Obra pública".

## Contratos de datos

Interfaces actuales relevantes:

```ts
// pages/Licitaciones/interface/licitaciones.ts
export interface Licitacion {
  id: string | null;
  idDelProceso: string;   // (RF5) deja de mostrarse en la tabla
  entidad: string;        // (RF4) campo de filtro
  objeto: string;
  cuantia: number;
  modalidad: string;      // (RF6) deja de mostrarse
  numero: string;         // (RF5) pasa a primera columna; llave de cruce
  estado: string;         // (RF6) deja de mostrarse
  fechaPublicacion: string;
  ubicacion: string;
  urlSecop: string;
  codigoUnpspc: string;
  consorcioId: string | null;
}

// pages/CuadroDeObra/interface/cuadro-de-obra.ts
export interface CuadroDeObraItem {
  id: number;
  numeroProceso: string;  // llave de cruce con Licitacion.numero
  // ...resto de campos
}
```

Cambios propuestos en el frontend:

```ts
// Nuevo: para saber qué licitaciones ya están en el Cuadro de Obra.
// (Ver "Dependencias de backend" — la forma exacta depende del endpoint disponible.)
export interface CuadroDeObraRef {
  numeroProceso: string;
  cuadroDeObraId: number; // permite abrir el registro existente en modo lectura (RF2)
}
```

Para RF1/RF3 la tabla necesita saber el "estado visual" de cada fila. Se propone
extender `modern-table` de forma **genérica** (sin acoplarla a Licitaciones):

```ts
// components/modern-table/modern-table.ts
// Nuevo @Input opcional: función que devuelve clases CSS por fila.
@Input() rowClassFn?: (row: TableData) => string;
```

## Endpoints / servicio

- **Detección de existencia (RF1/RF2) — DISPONIBLE:**
  `GET /api/v1/cuadro-de-obra/refs` (rol ANALISTA/ADMIN) →
  `200 OK` con lista liviana **sin paginar**:
  ```json
  [
    { "id": 12, "numeroProceso": "SASI-001-2025" },
    { "id": 15, "numeroProceso": "LP-030-2025" }
  ]
  ```
  El frontend construye un `Map<numeroProceso, id>`.
  - RF1: colorea la fila cuando `Licitacion.numero` exista en el mapa.
  - RF2: toma el `id` del mapa y carga el registro con
    `GET /api/v1/cuadro-de-obra/{id}` (ya existía, vía `obtenerCuadroDeObraPorId(id)`),
    abre el modal precargado y **sin botón "Guardar"**.
- **Rechazo de duplicados — DISPONIBLE:** `POST /api/v1/cuadro-de-obra` con un
  `numeroProceso` ya existente responde `409 Conflict`:
  ```json
  { "status": 409, "message": "Ya existe un cuadro de obra para el proceso SASI-001-2025" }
  ```
  Manejarlo mostrando un aviso ("esta licitación ya está en el Cuadro de Obra") como
  respaldo por si el resaltado no alcanzó a bloquear el clic.
- **Datos guardados en el modal (RF2):** reutilizar `obtenerCuadroDeObraPorId(id)`
  existente en `CuadroDeObraService`.
- **Filtro por entidad (RF4) — server-side:** parámetro
  `GET /api/v1/licitaciones/obra-publica?...&entidad=<texto>` (nombre exacto del
  parámetro a confirmar con backend). Al cambiar el filtro se reinicia a la página 1.

## UI / UX
- Colores (Tailwind) sugeridos, a confirmar en diseño:
  - Fila **agregada al Cuadro de Obra**: fondo verde suave (`bg-green-50`) — RF1.
  - Fila **revisada**: fondo distinto, p. ej. ámbar suave (`bg-amber-50`) — RF3.
  - Si una fila está agregada Y revisada, definir prioridad visual (sugerencia: prima
    "agregada").
- Filtro por entidad: input de búsqueda encima de la tabla, con estado en `signal` y
  `debounce` si es server-side.
- Estados: carga (spinner existente), vacío, error (ya existentes).
- Accesibilidad: el color no debe ser el único indicador; añadir ícono o `title`/badge
  (p. ej. un check "En Cuadro de Obra") para no depender solo del color.

## Criterios de aceptación (Given / When / Then)

- **CA1 (RF1):** Dado que la licitación con `numero = X` ya está en el Cuadro de Obra,
  cuando se carga la tabla, entonces su fila se muestra con el fondo de "agregada".
- **CA2 (RF2):** Dada una licitación ya agregada, cuando el usuario hace clic en su
  botón de acción, entonces el modal abre precargado con los datos guardados, en modo
  solo lectura, sin permitir guardar de nuevo.
- **CA3 (RF2):** Dada una licitación NO agregada, cuando el usuario hace clic en su
  botón de acción, entonces el modal abre editable y permite guardar (comportamiento
  actual). Tras guardar, su fila pasa a mostrarse como "agregada" (RF1) sin recargar
  toda la página.
- **CA4 (RF3):** Dado que el usuario marca una fila como "revisada", cuando recarga la
  página, entonces la fila sigue mostrándose como "revisada".
- **CA5 (RF3):** El color de "revisada" es visualmente distinto del de "agregada".
- **CA6 (RF4):** Dado un texto de entidad, cuando el usuario filtra, entonces la tabla
  muestra solo las licitaciones cuya entidad coincide.
- **CA7 (RF5/RF6):** La tabla ya no muestra las columnas "ID Proceso", "Estado" ni
  "Modalidad", y "Número Proceso" es la primera columna.

## Notas técnicas
- `modern-table` es un componente **reutilizable**; cualquier extensión (RF1/RF3) debe
  ser genérica (`rowClassFn`) para no afectar otros usos.
- El cruce de existencia debe resolverse al cargar/paginar; considerar que la lista de
  refs puede cachearse en un `signal` a nivel del componente Licitaciones.
- Mantener convenciones del repo: signals, OnPush, `inject()`, Tailwind, tipado estricto.
- Tras guardar en el modal, actualizar el `Map` de refs local (no recargar todo).

## Decisiones (resueltas)
1. **Detección de "ya agregada" (RF1/RF2):** ✅ Backend listo con
   `GET /api/v1/cuadro-de-obra/refs` + rechazo de duplicados con `409 Conflict`.
2. **Persistencia de "revisada" (RF3):** ✅ `localStorage` (clave por `numeroProceso`).
3. **Filtro por entidad (RF4):** ✅ Server-side (parámetro en el endpoint de licitaciones).
4. **Colisión de estados:** ✅ Cuando una fila está "agregada" **y** "revisada" a la vez,
   **prima el color de "agregada"** (verde).
```
