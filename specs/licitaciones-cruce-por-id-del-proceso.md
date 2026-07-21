# Spec: Corregir el cruce Búsqueda SECOP ↔ Cuadro de Obra (identidad por `idDelProceso`)

- **Estado:** Implementada (frontend + backend) · pendiente de verificar end-to-end
- **Feature/módulo afectado:** Licitaciones (Búsqueda SECOP) · Cuadro de Obra · modal
  `add-to-cuadro-modal` · backend `licitapp` (slice `CuadroDeObra`, migración `V22`)
- **Autor:** Diego
- **Fecha:** 2026-07-16

## Problema

`numeroProceso` (p. ej. `LP-005-2026`) **no es único** en SECOP: solo lo es dentro de una
misma entidad. Dos entidades distintas pueden publicar cada una su "LP-005-2026".

La spec `licitaciones-tabla-cuadro-de-obra.md` definió el cruce por
`Licitacion.numero ↔ CuadroDeObraItem.numeroProceso` (RF1/RF2). Esa decisión es la causa
raíz de los siguientes defectos, reproducidos en producción con `LP-005-2026`:

1. **Falso positivo de resaltado:** si **un** proceso con `LP-005-2026` está en el Cuadro
   de Obra, **todas** las licitaciones con ese número se pintan de verde, aunque sean
   procesos distintos de otras entidades.
2. **Detalle equivocado:** al hacer clic en "Cuadro" sobre una fila así, se abre en modo
   lectura el registro de **otro** proceso (el que sí está guardado).
3. **Bloqueo indebido de alta:** el `POST` responde `409 Conflict` al intentar agregar un
   `LP-005-2026` de otra entidad, impidiendo registrar un proceso legítimo.
4. **Marcas cruzadas:** "Revisado" (Licitaciones) y "Presentación" (Cuadro de Obra) se
   persisten en `localStorage` por número, así que marcar un proceso marca también a sus
   homónimos.

## Objetivo

Usar `idDelProceso` (identificador único de SECOP) como **identidad** del cruce, mantenien-
do `numeroProceso` como **atributo visible**. El usuario debe seguir viendo únicamente el
número de proceso: `idDelProceso` no se muestra en ninguna tabla, modal ni columna.

## Alcance

- **Incluye:**
  - Persistir `idDelProceso` al agregar una licitación al Cuadro de Obra.
  - Cruzar `refs` por `idDelProceso` en lugar de `numeroProceso`.
  - Repuntear las claves de `localStorage` ("Revisado", "Presentación") a `idDelProceso`.
  - Cambiar la restricción de unicidad del backend.
- **No incluye:**
  - Mostrar `idDelProceso` en la UI (**prohibido explícitamente**).
  - Rediseño de la tabla, la paginación o el modal.
  - Cambios en Seguimiento/Resultados/AnálisisCumplimiento (solo muestran el número
    como texto; no lo usan como llave).

## Requisitos funcionales

- **RF1 — Identidad por `idDelProceso`:** el resaltado verde y la apertura del detalle en
  modo lectura deben resolverse comparando `Licitacion.idDelProceso` contra el
  `idDelProceso` de los registros del Cuadro de Obra.

- **RF2 — `numeroProceso` sigue siendo el dato visible:** se mantiene la columna "Número
  Proceso" y su uso en modales/reportes. `idDelProceso` **nunca** se renderiza.

- **RF3 — Procesos manuales sin `idDelProceso`:** los registros creados con
  `add-proceso-modal` no provienen de SECOP y por tanto **no tienen** `idDelProceso`. Deben
  admitirse con el campo nulo y **nunca** resaltar filas de la Búsqueda.

- **RF4 — Unicidad correcta:** el backend debe rechazar como duplicado únicamente cuando se
  intente agregar dos veces el **mismo** `idDelProceso`. Dos procesos distintos que
  compartan número deben poder coexistir.

- **RF5 — Marcas locales por identidad:** "Revisado" y "Presentación" deben persistirse por
  `idDelProceso`, no por número.

## Contratos de datos

```ts
// pages/CuadroDeObra/interface/cuadro-de-obra.ts
export interface CuadroDeObraRef {
  id: number;
  numeroProceso: string;
  /** Identidad SECOP. `null` en procesos cargados manualmente (RF3). */
  idDelProceso: string | null;
}

export interface CuadroDeObraItem {
  id: number;
  numeroProceso: string;
  /** Identidad SECOP. `null` en procesos cargados manualmente (RF3). */
  idDelProceso: string | null;
  // ...resto de campos sin cambios
}
```

`Licitacion.idDelProceso` ya existe (`pages/Licitaciones/interface/licitaciones.ts`) y no
cambia; simplemente pasa a usarse como llave de cruce en vez de ignorarse.

## Cambios en el backend (repo `licitapp`, implementados)

1. **Persistir `idDelProceso`** — migración `V22__cuadro_id_del_proceso.sql`: columna
   `id_del_proceso VARCHAR(255) NULL` en `cuadro_de_obra`, más el campo en la entidad, el
   `CuadroDeObraRequestDTO` y el mapper. Es **inmutable**: `updateCuadro` no lo reescribe.
2. **Exponerlo** en `GET /api/v1/cuadro-de-obra/refs` y en
   `GET /api/v1/cuadro-de-obra/{id}`:
   ```json
   [
     { "id": 12, "numeroProceso": "LP-005-2026", "idDelProceso": "CO1.NO1.111" },
     { "id": 15, "numeroProceso": "LP-005-2026", "idDelProceso": "CO1.NO1.222" },
     { "id": 18, "numeroProceso": "INT-004-2026", "idDelProceso": null }
   ]
   ```
3. **Mover la restricción de unicidad** de `numeroProceso` a `idDelProceso`. Resultó que en
   la BD **no existía** ninguna constraint: la unicidad se validaba solo en código
   (`CuadroDeObraService.createCuadro` vía `existsByNumeroProceso`). Ahora se valida por
   `existsByIdDelProceso` **y** se respalda con el índice `uq_cuadro_de_obra_id_del_proceso`.
   El `409 Conflict` mantiene el mismo contrato de respuesta (y sigue nombrando el número
   de proceso en el mensaje, que es lo que el analista reconoce), pero pasa a dispararse
   solo ante el mismo `idDelProceso`.

   > **Nota MySQL:** no hace falta índice parcial (`WHERE ... IS NOT NULL`, sintaxis de
   > PostgreSQL): en MySQL un índice `UNIQUE` admite múltiples `NULL`, que es exactamente
   > la semántica que necesitan los procesos manuales.

### Backfill

Los registros existentes quedarán con `idDelProceso = null` y **no resaltarán** su fila en
la Búsqueda hasta que se les asigne el identificador. Opciones: backfill cruzando contra
SECOP por (entidad + número), o aceptar la pérdida del resaltado en los registros
históricos. **Decisión pendiente de backend.**

## UI / UX

- Sin cambios visibles. La columna "Número Proceso" y la leyenda de colores se mantienen.
- La entidad ya es una columna existente tanto en Búsqueda (`entidad`) como en Cuadro de
  Obra (`entidadContratante`), así que el usuario ya puede distinguir dos procesos
  homónimos sin necesidad de exponer el `idDelProceso`.

## Criterios de aceptación (Given / When / Then)

- **CA1 (RF1):** Dados dos procesos distintos con el mismo `numeroProceso`, donde solo uno
  está en el Cuadro de Obra, cuando se carga la Búsqueda, entonces **solo** la fila de ese
  proceso se muestra en verde.
- **CA2 (RF1):** Dada una fila homónima **no** agregada, cuando el usuario hace clic en
  "Cuadro", entonces el modal abre **editable** (no el detalle de su homónimo).
- **CA3 (RF4):** Dado un `LP-005-2026` ya guardado, cuando el usuario agrega un
  `LP-005-2026` de **otra** entidad, entonces se guarda correctamente (sin `409`).
- **CA4 (RF4):** Dada una licitación ya agregada, cuando se intenta agregar de nuevo,
  entonces el backend responde `409` y la UI muestra el aviso de duplicado.
- **CA5 (RF5):** Dado que el usuario marca "Revisado" en una fila, cuando existe otra fila
  con el mismo número, entonces **solo** la marcada queda en ámbar, y persiste tras
  recargar.
- **CA6 (RF3):** Dado un proceso cargado manualmente (sin `idDelProceso`), cuando se carga
  la Búsqueda, entonces no resalta ninguna fila.
- **CA7 (RF2):** El `idDelProceso` no aparece en ninguna columna, modal ni tooltip.

## Notas técnicas

- Las claves de `localStorage` cambian de esquema. Se versionan (`:v2`) en lugar de
  migrarse: las marcas viejas están guardadas por número y **no hay forma fiable de saber a
  qué proceso se referían**. Se descartan (estado local no crítico) y las claves `v1`
  quedan huérfanas; pueden borrarse en una limpieza posterior.
- `refs` filtra los registros con `idDelProceso` nulo al construir el `Map`: un proceso
  manual no puede corresponder a ninguna fila de la Búsqueda (RF3).
- Mantener convenciones: signals, OnPush, `inject()`, Tailwind, tipado estricto.
