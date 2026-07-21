# Spec: Marcas "Revisado" y "Presentación" compartidas por el equipo

- **Estado:** Implementada (frontend + backend) · pendiente de verificar end-to-end
- **Feature/módulo afectado:** Licitaciones (Búsqueda SECOP) · Cuadro de Obra · backend
  `licitapp` (slices `Licitaciones` y `CuadroDeObra`, migraciones `V23`/`V24`)
- **Autor:** Diego
- **Fecha:** 2026-07-17

## Problema

Dos marcas de la UI se guardaban en `localStorage`:

- **"Revisado"** (Búsqueda SECOP): `licitaciones:revisados:v2`, un `Set<idDelProceso>`.
- **"Presentación"** ("¿nos presentamos?", Cuadro de Obra): `cuadro-de-obra:presentacion:v2`,
  un `Map<cuadroId, 'SI'|'NO'>`.

`localStorage` está atado al **navegador + equipo + dominio**, no al usuario autenticado.
Consecuencia: si el ADMIN marca algo en su equipo, la ANALISTA en el suyo **no lo ve**, y
viceversa. Ni siquiera el mismo usuario ve sus marcas al cambiar de equipo o navegador.

## Objetivo

Persistir ambas marcas en el backend para que sean **compartidas por todo el equipo**:
cualquier usuario con rol `ANALISTA`/`ADMIN` ve y modifica las mismas marcas, en cualquier
equipo o navegador. Sin scoping por usuario: hay un único estado global por marca (se
audita quién la creó, pero todos ven lo mismo).

## Alcance

- **Incluye:**
  - Persistir "Presentación" como atributo del Cuadro de Obra (columna nullable tri-estado).
  - Persistir "Revisado" como conjunto de `idDelProceso` en una tabla propia.
  - Endpoints REST bajo rutas ya autorizadas (`/cuadro-de-obra/**`, `/licitaciones/**`).
  - Reemplazar `localStorage` por llamadas HTTP en ambos componentes del frontend.
- **No incluye:**
  - Marcas privadas por usuario (se descartó: el requerimiento es explícitamente compartir).
  - Tiempo real / websockets: cada quien ve el estado al cargar o recargar la vista.
  - Migrar las marcas viejas de `localStorage` (estado local no crítico; se descartan).

## Requisitos funcionales

- **RF1 — Presentación compartida:** la marca "¿nos presentamos?" (sin marca / SÍ / NO) de
  cada Cuadro de Obra se guarda en el servidor y es visible para todo el equipo.

- **RF2 — Revisado compartido:** la marca "Revisado" de cada licitación (identificada por
  `idDelProceso`) se guarda en el servidor y es visible para todo el equipo.

- **RF3 — Ciclo de Presentación:** al pulsar la marca, cicla sin marca → SÍ → NO → sin
  marca, igual que hoy, pero persistiendo cada transición en el servidor.

- **RF4 — Solo licitaciones de SECOP:** "Revisado" solo aplica a licitaciones con
  `idDelProceso`. No hay marca para procesos sin identidad SECOP.

- **RF5 — Autorización:** leer y escribir ambas marcas requiere `ANALISTA` o `ADMIN`
  (mismas rutas ya protegidas). No se añade regla nueva en `SecurityConfig`.

## Contratos de datos

### Presentación (Cuadro de Obra)

```ts
// pages/CuadroDeObra/interface/cuadro-de-obra.ts
export type PresentacionMarca = 'SI' | 'NO';

export interface CuadroDeObraItem {
  // ...campos existentes...
  /** (RF1) Marca "nos presentamos", compartida. null = sin marca. */
  presentacion: PresentacionMarca | null;
}
```

Backend: enum `PresentacionMarca { SI, NO }`; columna `presentacion VARCHAR(3) NULL` en
`cuadro_de_obra`. Viaja en `CuadroDeObraResponseDTO`, así que **llega en el listado** que ya
consume la vista: no requiere una llamada extra para pintar la columna.

### Revisado (Licitaciones)

Tabla `licitacion_revisada`: el conjunto de `idDelProceso` marcados. Presencia de la fila =
"revisada". Es un set, no un registro editable.

```sql
CREATE TABLE licitacion_revisada (
    id_del_proceso VARCHAR(255) NOT NULL PRIMARY KEY,
    fecha_creacion DATETIME NULL,
    creado_por     BIGINT NULL
);
```

## Endpoints / servicio

### Presentación
- `PATCH /api/v1/cuadro-de-obra/{id}/presentacion` — body `{ "presentacion": "SI" | "NO" | null }`.
  `null` limpia la marca. Devuelve el `CuadroDeObraResponseDTO` actualizado.

### Revisado
- `GET /api/v1/licitaciones/revisiones` → `["CO1.NO1.111", "CO1.NO1.222", ...]` (todos los
  `idDelProceso` revisados; conjunto liviano, como `/cuadro-de-obra/refs`).
- `POST /api/v1/licitaciones/revisiones` — body `{ "idDelProceso": "CO1.NO1.111" }` → marca
  (idempotente: si ya existe, no falla).
- `DELETE /api/v1/licitaciones/revisiones/{idDelProceso}` → desmarca (idempotente).

## UI / UX

- Sin cambios visibles respecto a hoy: mismos colores, íconos y ciclo de la marca.
- **Presentación:** la vista lee `item.presentacion` de cada fila del listado (ya no hay
  `signal` local ni `localStorage`). Al pulsar: se calcula el siguiente estado, se hace
  `PATCH` y se actualiza la fila en el `signal` `datos` con nueva referencia (OnPush).
- **Revisado:** en `ngOnInit` se cargan las revisiones (`GET`) a un `signal<Set<string>>`.
  Al pulsar: actualización **optimista** del set + `POST`/`DELETE`; si el HTTP falla, se
  revierte el set y se muestra alerta.
- Estados de error: reutilizar `AlertService`. La carga inicial de revisiones falla en
  silencio hacia un set vacío (como ya hace `loadRefs`), registrando en consola.

## Criterios de aceptación (Given / When / Then)

- **CA1 (RF2):** Dado que el ADMIN marca "Revisado" una licitación en su equipo, cuando la
  ANALISTA abre la Búsqueda en otro equipo, entonces esa fila aparece en ámbar.
- **CA2 (RF1/RF3):** Dado que la ANALISTA marca "SÍ nos presentamos" en un cuadro, cuando el
  ADMIN recarga el Cuadro de Obra en otro navegador, entonces ve la marca en verde.
- **CA3 (RF3):** El ciclo sin marca → SÍ → NO → sin marca se conserva y cada paso persiste.
- **CA4 (RF2):** Desmarcar "Revisado" en un equipo se refleja al recargar en otro.
- **CA5 (RF5):** Sin token válido, los endpoints responden 401; con rol no operativo, 403.
- **CA6:** Si el `PATCH`/`POST`/`DELETE` falla, la UI revierte la marca y avisa; no queda un
  estado visual que no esté en el servidor.

## Notas técnicas

- **Presentación** vive como columna en `cuadro_de_obra`: es 1:1 con el cuadro y tri-estado
  (NULL/SI/NO encaja en una columna nullable). No abre modal; el `PATCH` es su única acción.
  `updateCuadro` (PUT) **no** toca `presentacion`: se cambia solo por su endpoint dedicado.
- **Revisado** vive en el slice `Licitaciones`, que hasta ahora era solo lectura sobre SECOP
  (sin BD). Esta es su primera tabla propia: entidad `LicitacionRevisada`, puerto in/out,
  servicio y adaptador, siguiendo el layout `infrastructure/adapters/{in,out}` del slice.
  No hay FK contra licitaciones porque esa tabla no existe (SECOP es externo).
- `idDelProceso` como `@PathVariable` en el `DELETE`: los ids de SECOP II
  (p. ej. `CO1.NO1.7654321`) contienen puntos; Spring Boot 3 usa `PathPattern` y **no**
  trunca en el punto, así que es seguro.
- Auditoría: `licitacion_revisada` guarda `creado_por`/`fecha_creacion` vía el
  `AuditingEntityListener` existente (sabemos quién marcó), pero no se expone en la API: el
  estado es compartido, no filtrado por autor.
- Se elimina todo el `localStorage` de ambas marcas (claves `licitaciones:revisados:v2` y
  `cuadro-de-obra:presentacion:v2`), que quedan huérfanas y pueden borrarse del navegador.
- Mantener convenciones: signals, OnPush, `inject()`, Tailwind, tipado estricto (front);
  hexagonal + Lombok + migración Flyway (back).
```
