# Spec: Cálculo del Capital de Trabajo por plazo y rango de Presupuesto en SMMLV

- **Estado:** Implementada
- **Feature/módulo afectado:** modal `requisito-licitacion-modal` (Requisitos de Licitación) ·
  servicio `CuadroDeObraService` (solo lectura del cuadro) · interface `RequisitoLicitacion`
- **Autor:** Diego
- **Fecha:** 2026-07-08

## Objetivo
Alinear el formulario de Requisitos de Licitación con las reglas del **pliego tipo** de obra
pública para que el **Capital de Trabajo requerido (CTd)** deje de digitarse a mano y se
**calcule automáticamente** según el plazo de ejecución del contrato, y para que el analista
(roles ANALISTA/ADMIN) vea de un vistazo en qué **rango de Presupuesto Oficial en SMMLV** cae
el proceso (Rango 1 / Rango 2). Con esto se reduce el error humano y se refleja la fórmula del
pliego tipo directamente en la herramienta.

## Alcance
- **Incluye:**
  - Cálculo automático (read-only) del **Capital de Trabajo requerido (CTd)** con dos ramas
    según el plazo, incluyendo la tabla de **meses de apalancamiento (n)**.
  - Recálculo reactivo del CTd cuando cambian: `plazo`, `presupuesto` o `% de anticipo`.
  - **Indicador informativo** del rango de Presupuesto Oficial en SMMLV (Rango 1 vs Rango 2),
    derivado del valor del proceso en SMMLV ya disponible en el Cuadro de Obra.
  - Texto de ayuda que muestre la **rama** y el **n** usados en el cálculo (transparencia).
- **No incluye:**
  - Cambios en el cálculo de la **Capacidad Residual** (`kresidualProceso`), que se mantiene.
  - Cambios en los **índices financieros** (siguen como `select`, sin depender del rango SMMLV).
  - Nuevos campos persistidos ni migraciones (el CTd se sigue guardando como número; solo cambia
    su origen: antes manual, ahora calculado).
  - Hacer el CTd editable: por decisión, es **read-only**.

## Requisitos funcionales

- **RF1 — Capital de Trabajo requerido (CTd) auto-calculado:** el campo Capital de Trabajo del
  formulario de Requisitos pasa de input manual a **campo calculado y de solo lectura** (análogo
  a la Capacidad Residual). Su valor se obtiene de la fórmula del pliego tipo:

  Sea **POE** = Presupuesto Oficial (`presupuesto`) y **Anticipo** = valor en pesos del anticipo
  = `presupuesto × (% anticipo / 100)`.

  - **Rama A — plazo < 12 meses:**
    `CTd = (POE − Anticipo) × 33%`
  - **Rama B — plazo ≥ 12 meses:**
    `CTd = ((POE − Anticipo) / plazo_en_meses) × n`

- **RF2 — Meses de apalancamiento (n):** para la Rama B, `n` sale del rango en que cae el plazo:

  | Plazo (meses) ≥ | Plazo (meses) < | n (meses de apalancamiento) |
  | --- | --- | --- |
  | 12 | 24 | 4 |
  | 24 | 36 | 8 |
  | 36 | 48 | 12 |
  | 48 | 60 | 16 |
  | … (cada 12 meses) | … | +4 |

  Fórmula general equivalente: **`n = floor(plazo / 12) × 4`** (válida para `plazo ≥ 12`).
  `n` es un valor **derivado**: no es un campo del formulario ni se persiste.

- **RF3 — Recálculo reactivo:** el CTd se recalcula automáticamente cada vez que cambian
  `plazo`, `presupuesto` o `% de anticipo`, sin acción explícita del usuario.

- **RF4 — Indicador de rango de Presupuesto en SMMLV:** el formulario muestra en qué rango cae
  el Presupuesto Oficial del proceso, calculado desde su valor en SMMLV
  (`CuadroDeObraItem.valorSMMLV`):
  - **Rango 1:** `0 < PO < 40.000 SMMLV`
  - **Rango 2:** `PO ≥ 40.000 SMMLV`

  Es **solo informativo** (badge/etiqueta): no altera validaciones, índices financieros ni la
  fórmula del CTd.

- **RF5 — Transparencia del cálculo:** junto al CTd se muestra un texto de ayuda con la **rama**
  aplicada (A/B) y, en Rama B, el **n** usado, para que el analista entienda el resultado.

## Contratos de datos

No cambian los campos persistidos. `RequisitoLicitacion` conserva `capitalTrabajo: number`
(ahora **calculado** en el cliente en lugar de digitado). Se documenta el nuevo origen:

```ts
export interface RequisitoLicitacion {
  id?: number;
  // ...experiencia, contrato, plazo...
  presupuesto: number;      // POE — base del cálculo
  poeAnticipo: number;      // % de anticipo — deriva el Anticipo en pesos
  plazo: number;            // meses — selecciona rama y n
  capitalTrabajo: number;   // (RF1) AHORA calculado read-only, ya no manual
  kresidualProceso: number; // sin cambios (Presupuesto − Anticipo)
  // ...índices financieros...
}
```

Estado de solo-UI (no se persiste), computado en el modal:

```ts
// Rango de Presupuesto Oficial en SMMLV (RF4) — informativo
type RangoSmmlv = 'RANGO_1' | 'RANGO_2' | null; // null si valorSMMLV <= 0
// Desglose del cálculo (RF5) — para el texto de ayuda
interface DesgloseCapitalTrabajo {
  rama: 'A' | 'B';
  n: number | null; // n solo aplica en Rama B
}
```

## Endpoints / servicio
- **Sin nuevos endpoints.** Se reutiliza `CuadroDeObraService.obtenerCuadroDeObraPorId()` que ya
  se invoca al abrir el modal para precargar datos (RF5 de la spec anterior); de ahí se toma
  `valorSMMLV` para el indicador de rango (RF4).
- El guardado sigue usando `guardarRequisitos()` / `actualizarRequisitos()` con `capitalTrabajo`
  ya calculado dentro del payload (mismo contrato actual).

## Dependencias de backend (repo `licitapp`)
- **Ninguna obligatoria.** El CTd se sigue almacenando como número (columna existente) y el valor
  del proceso en SMMLV (`valorSMMLV`) ya lo expone el listado/entidad del Cuadro de Obra.
- **Opcional (fuera de alcance):** si a futuro se quiere blindar el CTd server-side (recalcularlo
  o validarlo al guardar) o exponer el SMMLV base del año como parámetro configurable, sería una
  tarea de backend separada. Esta spec no lo requiere.

## UI / UX
- **RF1/RF5 (Capital de Trabajo):**
  - El campo pasa a **read-only** con estilo de campo calculado (mismo patrón visual que la
    Capacidad Residual Requerida: fondo suave, texto en negrita, `cursor-not-allowed`).
  - Debajo, texto de ayuda tipo *"Rama A: (POE − Anticipo) × 33%"* o
    *"Rama B: (POE − Anticipo) / plazo × n (n = 8)"* según corresponda.
- **RF4 (rango SMMLV):**
  - Badge/etiqueta cerca de la sección de Presupuesto: **Rango 1** (p. ej. `bg-amber-50` /
    `text-amber-700`) vs **Rango 2** (p. ej. `bg-indigo-50` / `text-indigo-700`), con el umbral
    de 40.000 SMMLV visible en un `title` o subtítulo. Si `valorSMMLV <= 0`, mostrar "—".
- **Estados:** conservar el skeleton de carga y el manejo de error actuales del modal.

## Criterios de aceptación (Given / When / Then)
- **CA1 (RF1, Rama A):** Dado un proceso con POE = 1.000.000.000, anticipo 0% y **plazo = 6**,
  cuando se abre el formulario de Requisitos, entonces Capital de Trabajo se muestra en
  **330.000.000** (= 1.000.000.000 × 33%) y es de solo lectura.
- **CA2 (RF1/RF2, Rama B):** Dado un proceso con POE = 2.000.000.000, **sin anticipo** y
  **plazo = 30** (bracket [24–36) ⇒ n = 8), entonces Capital de Trabajo = **533.333.333**
  (= 2.000.000.000 / 30 × 8).
- **CA3 (RF2):** Dado plazo = 12 ⇒ n = 4; plazo = 24 ⇒ n = 8; plazo = 47 ⇒ n = 12; plazo = 48 ⇒
  n = 16 (se respeta la tabla y la frontera inferior/superior de cada bracket).
- **CA4 (RF1):** Dado un anticipo del 30% sobre POE = 1.000.000.000 y plazo = 6, entonces
  Anticipo = 300.000.000 y CTd = (1.000.000.000 − 300.000.000) × 33% = **231.000.000**.
- **CA5 (RF3):** Dado el formulario abierto, cuando el usuario cambia el plazo de 6 a 24,
  entonces el Capital de Trabajo se recalcula solo (de Rama A a Rama B con n = 8) sin recargar.
- **CA6 (RF1):** El campo Capital de Trabajo no es editable por el usuario (read-only) y su valor
  se persiste igual que hoy al guardar.
- **CA7 (RF4):** Dado un proceso con `valorSMMLV = 35.000`, el formulario muestra **Rango 1**;
  con `valorSMMLV = 40.000` o más, muestra **Rango 2**. El indicador no cambia validaciones.

## Notas técnicas
- Mantener convenciones del repo: `standalone` + `OnPush`, estado con `signal`/`computed`,
  `inject()` con campos `private readonly`, Tailwind en template, tipado estricto (sin `any`).
- **Cálculo:** encapsular en un método puro `calcularCapitalTrabajo()` que lee `presupuesto`,
  `poeAnticipo` y `plazo` del form, escribe `capitalTrabajo` con `setValue(..., { emitEvent:
  false })` y actualiza el signal de desglose (rama/n). Suscribir `valueChanges` de esos tres
  controles (junto al recálculo de capacidad residual ya existente en `setupCalculos()`).
- **Control del form:** cambiar `capitalTrabajo` a `{ value: 0, disabled: true }` (como
  `kresidualProceso`) para que sea read-only; recordar usar `getRawValue()` al enviar (ya se usa)
  para que el valor calculado viaje en el payload.
- **n:** helper `mesesApalancamiento(plazo)` = `plazo < 12 ? 0 : Math.floor(plazo / 12) * 4`.
- **Bordes:** si `plazo` es `null`/0 o `presupuesto` es 0, CTd = 0 y no se muestra rama; el
  campo debe seguir consistente (sin `NaN`). Redondeo: mantener decimales como los demás montos
  (formato COP con 2 decimales); no truncar internamente.
- **RF4:** `valorSMMLV` se obtiene del `obtenerCuadroDeObraPorId()` que ya se llama al abrir el
  modal; guardarlo en un `signal` para derivar el rango con `computed`.
- **Verificación:** `npm test` + recorrido manual de CA1–CA7 (autenticado, backend arriba),
  validando los dos ejemplos numéricos del pliego tipo.

## Decisiones (resueltas)
1. **CTd — comportamiento:** ✅ Auto-calculado y **read-only** (como la Capacidad Residual).
2. **Rango SMMLV — efecto:** ✅ **Solo indicador informativo**; no altera validaciones ni la
   fórmula ni los índices financieros.
3. **n (meses de apalancamiento):** ✅ Derivado por `floor(plazo/12) × 4` para `plazo ≥ 12`.

## Preguntas abiertas
- (Ninguna que bloquee la implementación.) Si más adelante el rango SMMLV debiera cambiar los
  índices financieros exigidos o la fórmula, se abrirá una spec aparte con la tabla por rango.
