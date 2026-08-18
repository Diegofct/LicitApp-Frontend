# Spec: Sobre 2 — Análisis de oferentes y ponderación económica

- **Estado:** Implementada (pendiente el recorrido manual de CA1–CA19 con el backend arriba)
- **Feature/módulo afectado:** nuevo feature `pages/Sobre2` (`app.routes.ts` · `components/sidebar` ·
  nuevo `components/oferente-modal`)
- **Autor:** Diego (implementa el subagente `angular-frontend`)
- **Fecha:** 2026-08-06

> ## Cambio de alcance — 2026-08-18: se retira la tarjeta de controles de ponderación
>
> Por indicación de la licitadora, **la tarjeta titulada *Ponderación económica* se eliminó de la UI**.
> Con ella se van sus cuatro controles y todo lo que dependía de un valor propio; **las medidas de
> tendencia y el valor sugerido se conservan**, que es lo que se usa para leer el mercado.
>
> - **Retirado:** selector de régimen (RF3.1), input de `valorCandidato` (RF3.4), `puntajeMaximo`
>   (RF3.5), botón *Recalcular* y botón *Usar como candidato*. Al no haber valor candidato dejan de
>   pintarse `puntajeCandidato` y `posicionCandidato` (RF3.3) y `puntajeSugerido` (RF3.3b) dentro de
>   cada tarjeta. Decaen **CA10, CA11, CA13** y la parte de CA14 relativa al candidato.
> - **Se conserva:** todo RF1, RF2 y RF4; las tarjetas por tendencia con valor de referencia,
>   porcentaje, valor objetivo y oferente más cercano (RF3.2); el `valorSugerido` destacado con la
>   tendencia a la que apunta (RF3.6); RF3.7, RF3.8, RF3.9 y RF3.10.
> - **Backend intacto:** `GET /sobre-2/{cuadroId}/analisis` se consume ahora **sin parámetros**, así
>   que aplica el régimen por defecto (Documentos Tipo) y el puntaje máximo por defecto. El contrato
>   REST no cambió; los campos de simulación siguen llegando sin usarse.
> - **Franja sin tocar:** `distribucion-ofertas` queda tal cual, marcadores de tendencia incluidos;
>   solo recibe `valorCandidato` fijo en `null`, así que no dibuja el rombo del valor propio.

## Objetivo

Dar al analista (roles **ANALISTA** y **ADMIN**) la pantalla que hoy hace a mano en un Excel: decidir
**con qué valor presentar la oferta económica** de un proceso.

Tras el informe de evaluación, la entidad puntúa el precio con **uno de cuatro métodos** y **no se sabe
cuál** hasta después: lo sortean los centavos de la TRM del día hábil siguiente a la apertura del
Sobre 2. Por eso el backend calcula **los cuatro en paralelo** y sugiere un valor de compromiso.

Hoy el analista digita uno por uno hasta 50+ oferentes en una hoja de cálculo. Aquí los trae de SECOP
en un click, los depura (excluye los rechazados, agrega los que faltan) y ve, sobre una misma escala,
dónde cae su valor candidato frente a la competencia y frente a los cuatro valores de referencia.

**El valor de la pantalla es reemplazar ese Excel.**

## Hallazgo de campo (2026-08-06) — condiciona el diseño

Importación real del proceso `LP-005-2026` (MUNICIPIO DE MANIZALES, presupuesto **$1.858.386.230**,
estado *Evaluación*):

- Trajo **135 oferentes** (no ~38): el volumen real es mucho mayor de lo previsto.
- Los valores llegan **sucios**: una oferta "Confidencial" con valor **$0**, un grupo con valores
  absurdamente bajos (~1,5 % del presupuesto) y **más de la mitad exactamente iguales al presupuesto
  oficial** (valores *placeholder*).
- Consecuencia: los métodos devuelven cifras sin sentido de negocio (menor valor 1,50 %, geométrica
  19,36 %, mediana 79,42 %) y el `valorSugerido` sale en 1,5 %.
- **Causa:** en un proceso todavía en *Evaluación* el **Sobre 2 no se ha abierto**, así que SECOP
  publica valores de registro, no ofertas económicas. Los valores solo son fiables después de la
  apertura del Sobre 2.
- Además: **sin `nitEntidad`** la misma referencia trajo **177 oferentes de 11 entidades distintas**
  en vez de 135 de una sola.

De aquí salen RF1.7, RF2.11, RF2.12, RF3.10 y RF4.9. El contrato REST **no cambia**: todo se resuelve
en cliente con datos que ya vienen en las respuestas.

## Alcance

- **Incluye:**
  - Selección del proceso (cuadro de obra) e **importación idempotente** de oferentes desde SECOP
    (`nitEntidad` opcional, toggle `histórico`).
  - **Tabla de oferentes** con orden por valor, alta/edición/borrado manual, toggle de validez y
    chip de origen (`SECOP` / `MANUAL`).
  - **Panel de análisis**: los métodos del régimen vigente como tarjetas comparables, input de
    `valorCandidato`, `puntajeMaximo` opcional, selector de régimen y `valorSugerido` destacado.
  - **Franja de distribución** (SVG inline): las ofertas sobre una escala común con la posición de
    los valores de referencia de cada método y del `valorCandidato`.
  - **Histórico de un competidor** (`GET /sobre-2/competidores`) al pulsar su nombre en la tabla.
  - Ruta lazy `/sobre-2` con `roleGuard(['ANALISTA','ADMIN'])` y entrada en el sidebar.
- **No incluye:**
  - Cualquier cambio en el backend (`../licitapp`): el contrato REST está cerrado y estable.
  - Librerías de charting (Chart.js, d3, ngx-charts). La visualización es **SVG inline + Tailwind**.
  - Persistir el `valorCandidato`: es un parámetro de consulta, no un dato del proceso.
  - Exportar a Excel/PDF.
  - Comparativa entre varios procesos a la vez.

## Requisitos funcionales

### RF1 — Selección de proceso e importación

- **RF1.1** Un `select` lista los procesos del cuadro de obra (vistas `por-presentar` y `presentadas`,
  concatenadas) rotulados con `numeroProceso` + `entidadContratante`. Soporta deep-link
  `?cuadroId=<id>`.
- **RF1.2** Campo de texto opcional **NIT de la entidad** y toggle **Incluir histórico** (procesos
  anteriores a 2024). Ambos alimentan `POST /sobre-2/{cuadroId}/importar`.
- **RF1.3** El botón **Importar de SECOP** muestra estado de carga y se deshabilita sin proceso
  seleccionado o durante la petición.
- **RF1.4** Al terminar, el feedback informa **`encontrados` / `creados` / `actualizados`** y aclara
  que la importación es **idempotente** (repetirla no duplica).
- **RF1.5** Si `encontrados === 0`, el estado vacío **guía al alta manual** y explica que ~10% de los
  procesos no publican ofertas en SECOP; **no se presenta como error**.
- **RF1.6** Las `advertencias` de la importación se renderizan **destacadas** (bloque ámbar con ícono,
  no texto menor ni toast efímero). Llevan información de negocio: p. ej. cuántas ofertas quedaron
  fuera de las fórmulas por no válidas.
- **RF1.6b** *(nuevo 2026-08-12)* **`encontrados: 0` no siempre significa lo mismo**, y confundir los
  dos casos hace buscar un problema inexistente:
  - **`proponentesRegistrados > 0`** → panel azul con candado: *"El Sobre 2 todavía no se ha abierto.
    SECOP reporta N proponentes pero aún no publica con qué valor se presentaron."* Se dice
    explícitamente **"no falta nada por importar"** y que vuelva tras la audiencia. **Sin** botón de
    alta manual: inventar valores aquí sería falsear la competencia.
  - **Si no** → el panel índigo de siempre (≈10% de procesos no publican) **con** el botón de alta
    manual.

  Caso que lo motivó: LP-005-2026 del municipio de Samacá muestra 23 proponentes en SECOP II, pero
  el dataset no tiene sus valores porque el proceso está en *Evaluación* y los precios siguen
  sellados (mecanismo de dos sobres, Ley 1882).
- **RF1.7** *(reescrito el 2026-08-12)* **`nitEntidad` solo se pide cuando hace falta.** El backend
  ahora cruza por **identificador de proceso**: resuelve el `idDelProceso` del cuadro contra SECOP
  (columna `id_del_portafolio` de `p6dx-8zbt`) y busca las ofertas por un identificador único, así
  que el NIT es irrelevante en el camino normal. La UI usa `CuadroDeObraItem.idDelProceso` para
  decidir qué mostrar:
  - **Con `idDelProceso`** → indicador verde "Por identificador" y aviso de que solo traerá los
    oferentes de esa entidad. **El campo NIT no se muestra.**
  - **Sin `idDelProceso`** (cuadro cargado a mano) → se muestra el campo NIT rotulado "recomendado",
    el aviso ámbar de que la búsqueda irá por referencia (no única entre entidades:
    `LP-001-2026` existe en 67 procesos distintos) y el botón pasa a "Importar sin NIT".

  Motivo del cambio: el aviso anterior ("177 oferentes de 11 entidades vs. 135 de una") describía
  un defecto real del join por referencia que **ya está corregido** para los procesos que vienen de
  SECOP. Mantenerlo visible pedía al analista un dato que el sistema ya deduce solo.

### RF2 — Tabla de oferentes

- **RF2.1** Columnas: **Oferente** (identificador visible), **NIT**, **Valor**, **%**, **Origen**,
  **Válida** (toggle) y **Acciones** (editar / eliminar).
- **RF2.2** `porcentaje` **llega ya calculado ×100 y redondeado a 2 decimales** (HALF_UP, como el
  `ROUND` del Excel; cambió de truncado a redondeado el 2026-08-12). Se muestra tal cual con el
  sufijo ` %` (`93.47 %`). **Nunca se recalcula ni se multiplica de nuevo**: un cálculo propio en el
  cliente discreparía en 0.01 en los casos límite. Si es `null`, `—`.
- **RF2.2b** Las ofertas que **superan el presupuesto oficial** siguen apareciendo en la tabla y
  marcadas como válidas, pero el backend las deja **fuera de la muestra** (superarlo es causal de
  rechazo). La fila lleva un ícono rosa `bx-trending-up` con el motivo en el `title`, para que no
  parezca que pondera cuando no lo hace.
- **RF2.3** `nitOferente` es `null` o `"No Definido"` en consorcios/UT (la mayoría en obra pública).
  Se muestra como `—` **sin apariencia de dato faltante ni de error**, y **no** se usa como
  identificador de fila.
- **RF2.4** `valida: false` = oferta **excluida de las fórmulas** pero conservada como rastro. La fila
  se ve **atenuada y con el valor tachado**; el toggle la reactiva. Cambiarla **recalcula el análisis**.
- **RF2.5** `origen` se muestra como chip: `SECOP` (azul) / `MANUAL` (ámbar). Editar o borrar una fila
  `SECOP` **advierte** que el cambio se sobrescribe en la próxima importación.
- **RF2.6** La tabla es **ordenable por valor** (asc/desc) y por porcentaje; por defecto **valor
  ascendente** (así se lee la competencia de menor a mayor).
- **RF2.7** Alta y edición manual en **modal**, con el patrón de los modales existentes
  (`modal-overlay` / `modal-panel` / `modal-body`) y validaciones del contrato:
  `nombreOferente` obligatorio ≤500, `nitOferente` opcional ≤32, `valorOferta` obligatorio > 0,
  `moneda` opcional ≤16, `valida` opcional.
- **RF2.8** El borrado pide confirmación (`ConfirmModal`).
- **RF2.9** La paginación en cliente con `app-pagination` es **obligatoria** (caso real: 135 filas),
  20 por página. El orden, los conteos y el análisis se calculan **sobre el total**, nunca sobre la
  página visible. Un buscador por nombre filtra la tabla (no el análisis).
- **RF2.10** Al pulsar el nombre de un oferente se consulta `GET /sobre-2/competidores?nombre=` y se
  muestra su histórico (procesos, % promedio, mínimo y máximo).
- **RF2.11** **Filas sospechosas resaltadas.** Se marca visualmente (fondo ámbar + ícono con
  `title` explicativo) toda fila cuyo `valorOferta` sea:
  - **0** (típico de las ofertas "Confidencial"), o
  - **exactamente igual al `presupuestoOficial`** (valor *placeholder* de registro), o
  - **menor al 10 % del presupuesto oficial** (precio absurdo / dato de registro).

  El resaltado es informativo: **no** excluye nada por su cuenta, la decisión es del analista.
- **RF2.12** **Saneamiento cómodo de la muestra.** Además del toggle por fila:
  - Botón **"Excluir N sospechosas"** que marca `valida = false` en todas las sospechosas aún
    válidas (una `PUT` por fila, en paralelo) y recalcula una sola vez al terminar.
  - Botón **"Restablecer todas"** que devuelve `valida = true` a las excluidas.
  - Un filtro rápido: *Todas · Solo válidas · Solo excluidas · Solo sospechosas*.

### RF3 — Panel de análisis

- **RF3.1** Selector de **régimen**: `DOCUMENTOS_TIPO` (**default**) y `DECRETO_1082`. Cambiarlo
  recalcula.
- **RF3.2** Cada método del régimen es una **tarjeta comparable** con: nombre legible, **rango TRM que
  lo activa**, `valorReferencia`, `porcentajeReferencia`, `valorObjetivo` y `oferenteMasCercano`.
- **RF3.3** Si hay `valorCandidato`, cada tarjeta añade **`puntajeCandidato`** y **`posicionCandidato`**.
- **RF3.3b** *(nuevo 2026-08-12)* Cada tarjeta muestra además **`puntajeSugerido`**: el puntaje que
  sacaría el `valorSugerido` si la TRM sortea *ese* método. Responde la pregunta real del Excel
  ("si voy con el sugerido, ¿cuánto saco en cada tendencia?") sin obligar a simular a mano.
- **RF3.4** Input de **`valorCandidato`** (COP) que recalcula al pulsar Enter, al perder el foco o con
  el botón **Recalcular**. Vaciarlo vuelve al análisis sin candidato.
- **RF3.5** `puntajeMaximo` es un campo opcional (avanzado); vacío, manda el default del backend, y el
  `placeholder` muestra el `puntajeMaximo` efectivo que devolvió el análisis.
- **RF3.6** **`valorSugerido`** (+ `porcentajeSugerido`) se destaca como la cifra principal del panel,
  con acción **"Usar como candidato"**. *(ampliado 2026-08-12)* Debajo se muestra
  **`nombreMetodoSugerido`** —"Apuntando a la tendencia *Mediana con valor absoluto*"— y la tarjeta
  de ese método se resalta con anillo índigo y la etiqueta "Tendencia sugerida". Las cuatro piezas
  juntas (`valorSugerido`, `porcentajeSugerido`, `nombreMetodoSugerido` y su `puntajeSugerido`)
  forman la frase con la que se decide: *"vamos con 2.502.409.860, al 93,47%, apuntándole a la
  Mediana con Valor Absoluto"*. Sin el método, la cifra sugerida no se puede justificar ante nadie.
- **RF3.7** Cabecera con `numeroProceso`, `presupuestoOficial`, `totalOferentes` y `oferentesValidos`.
- **RF3.8** Las `advertencias` del análisis se renderizan visibles.
- **RF3.9** El análisis se recalcula tras: importar, crear/editar/eliminar un oferente, alternar
  `valida`, cambiar de régimen y cambiar el candidato.
- **RF3.10** **El análisis no se presenta como verdad sin contexto.** Antes de los números, y por
  encima de ellos, se muestra un **banner de advertencia** cuando los datos huelen a "Sobre 2 aún no
  abierto". Señales detectables **en cliente**, sin endpoints nuevos, cruzando los oferentes con el
  `presupuestoOficial` que ya trae el análisis:
  - hay ofertas cuyo `valorOferta` **coincide con el `presupuestoOficial`**, o
  - un mismo `valorOferta` se repite en **≥ 30 %** de los oferentes válidos, o
  - hay ofertas con `valorOferta = 0`.

  Texto: *"Varias ofertas coinciden con el presupuesto oficial: es probable que el Sobre 2 aún no se
  haya abierto y los valores no sean definitivos."*, con el detalle contado (cuántas iguales al
  presupuesto, cuántas en cero, cuál es el valor repetido) y un enlace a la acción de saneamiento
  (RF2.12). El banner se sitúa **antes** de las tarjetas de método y del `valorSugerido`.

### RF4 — Franja de distribución (visualización)

- **RF4.1** Una **escala horizontal única** en valor (COP) que cubre ofertas válidas, valores de
  referencia y candidato, con margen del 3%.
- **RF4.2** Cada **oferta válida** es una marca fina sobre la franja; las **no válidas** se dibujan
  aparte, atenuadas y sin peso visual, para que se vea que existen pero no cuentan.
- **RF4.3** Los **valores de referencia de cada método** se marcan sobre la escala con **etiqueta
  directa** (nombre corto + %), en su color de serie, el mismo de su tarjeta.
- **RF4.4** El **`valorCandidato`** se marca con forma propia (rombo) y tinta de texto —**no** con un
  quinto color de serie— rotulado "Tu oferta".
- **RF4.5** Las etiquetas que colisionen se reparten en carriles; **nunca** se recortan ni se encima
  el texto.
- **RF4.6** Hover y foco de teclado sobre cualquier marca muestran el mismo detalle (oferente, valor y
  %). El tooltip **enhance, nunca gatea**: todo valor está también en la tabla y en las tarjetas.
- **RF4.7** Los ticks del eje se rotulan en **% del presupuesto oficial** cuando `presupuestoOficial > 0`
  (es como lee el licitador); si no, en COP compacto.
- **RF4.8** Sin ofertas válidas o sin proceso, la franja no se dibuja: en su lugar va un estado vacío.
- **RF4.9** **Densidad, no solapamiento.** Con 135 ofertas, dibujar una marca por oferta produce un
  amasijo ilegible y 135 zonas de hover superpuestas. Las ofertas válidas se **agrupan en bins** a lo
  largo del eje y cada bin se dibuja como una barra fina cuya **altura es el número de ofertas** del
  bin (franja de densidad). Cada bin tiene **una sola** zona de hover/foco (≥ 24 px) que reporta
  cuántas ofertas contiene, su rango y hasta 5 nombres. Los marcadores de método y el candidato se
  dibujan **por encima** de la densidad, con sus etiquetas en carriles (RF4.5).

## Contratos de datos

`pages/Sobre2/interface/sobre-2.ts`. Todos los `BigDecimal` del backend llegan como `number`.

```ts
export type RegimenPonderacion = 'DOCUMENTOS_TIPO' | 'DECRETO_1082';
export type OrigenOferente = 'SECOP' | 'MANUAL';

export interface OferenteProceso {
  id: number;
  cuadroDeObraId: number;
  nombreOferente: string;
  nitOferente: string | null;
  valorOferta: number;
  /** Ya viene ×100 y truncado a 2 decimales (92.94 = 92.94 %). NO recalcular. */
  porcentaje: number | null;
  moneda: string | null;
  /** ISO yyyy-MM-dd */
  fechaRegistro: string | null;
  /** false = excluida de las fórmulas, pero conservada como rastro. */
  valida: boolean;
  origen: OrigenOferente;
}

export interface OferenteProcesoRequest {
  nombreOferente: string;
  nitOferente?: string | null;
  valorOferta: number;
  moneda?: string | null;
  valida?: boolean;
}

export interface ImportacionOferentes {
  cuadroDeObraId: number;
  encontrados: number;
  creados: number;
  actualizados: number;
  oferentes: OferenteProceso[];
  advertencias: string[];
}

export interface ResultadoMetodo {
  /** Nombre del enum del backend. */
  metodo: string;
  /** Nombre legible. */
  nombre: string;
  regimen: string;
  /** Rango de centavos de la TRM que activa el método, p. ej. "0.00 – 0.24". */
  rangoTrm: string;
  valorReferencia: number;
  porcentajeReferencia: number;
  valorObjetivo: number;
  oferenteMasCercano: string | null;
  puntajeCandidato: number | null;
  posicionCandidato: number | null;
}

export interface AnalisisSobre2 {
  cuadroDeObraId: number;
  numeroProceso: string;
  presupuestoOficial: number;
  regimen: string;
  totalOferentes: number;
  oferentesValidos: number;
  puntajeMaximo: number;
  valorCandidato: number | null;
  porcentajeCandidato: number | null;
  valorSugerido: number | null;
  porcentajeSugerido: number | null;
  metodos: ResultadoMetodo[];
  advertencias: string[];
}

export interface ResumenCompetidor {
  nombreOferente: string;
  procesos: number;
  porcentajePromedio: number;
  porcentajeMinimo: number;
  porcentajeMaximo: number;
}
```

## Endpoints / servicio

`pages/Sobre2/service/sobre-2.service.ts`, base `${environment.apiBaseUrl}/sobre-2`.
Todos exigen rol **ANALISTA** o **ADMIN**.

| Método del servicio | Verbo y ruta |
|---|---|
| `importarOferentes(cuadroId, nitEntidad?, historico?)` | `POST /sobre-2/{cuadroId}/importar?nitEntidad&historico` |
| `listarOferentes(cuadroId)` | `GET /sobre-2/{cuadroId}/oferentes` |
| `crearOferente(cuadroId, body)` | `POST /sobre-2/{cuadroId}/oferentes` |
| `actualizarOferente(oferenteId, body)` | `PUT /sobre-2/oferentes/{oferenteId}` |
| `eliminarOferente(oferenteId)` | `DELETE /sobre-2/oferentes/{oferenteId}` → 204 |
| `analizar(cuadroId, { valorCandidato?, regimen?, puntajeMaximo? })` | `GET /sobre-2/{cuadroId}/analisis` |
| `resumenCompetidor(nombre)` | `GET /sobre-2/competidores?nombre=` |

Los parámetros opcionales **solo se añaden al `HttpParams` cuando tienen valor**. No se inventa
ningún endpoint ni campo fuera de esta tabla.

Reutiliza además `CuadroDeObraService.obtenerCuadroDeObra(0, 200, 'por-presentar' | 'presentadas')`
para poblar el selector de proceso.

## UI / UX

Ruta `/sobre-2`, tres zonas apiladas dentro del layout estándar de página
(`p-4 sm:p-6 md:p-8`, header con `h1` + subtítulo, tarjetas `rounded-2xl border border-gray-100`).

1. **Selector + importación** — tarjeta con grid `md:grid-cols-12`: proceso (6), NIT entidad (3),
   histórico (toggle), botón importar. Estado de carga en el botón (`bx-loader-alt animate-spin`).
2. **Distribución** — la franja SVG a ancho completo, con su leyenda.
3. **Análisis** y **tabla de oferentes** — en desktop, análisis a la izquierda (`lg:col-span-5`,
   `sticky top-6`) y tabla a la derecha (`lg:col-span-7`); apilados en móvil.

**Estados**
- *Carga*: skeletons `animate-pulse` para la lista y las tarjetas; el botón importar bloquea.
- *Vacío sin proceso*: "Elige un proceso para empezar".
- *Vacío con proceso y sin oferentes*: mensaje que **invita al alta manual** (RF1.5).
- *Error*: `AlertService.error(...)` con el `message` del backend cuando exista.
- *Éxito*: `AlertService.success(...)` con el resumen `creados`/`actualizados`.

**Notas de diseño de la franja (skill `dataviz`)**
- Paleta **categórica de 4 slots** adaptada a la del proyecto y **validada con
  `scripts/validate_palette.js --pairs all --surface #ffffff`** (todas las comprobaciones PASS, sin
  WARN de contraste): `#4f46e5` (indigo-600) · `#0d9488` (teal-600) · `#d97706` (amber-600) ·
  `#e11d48` (rose-600).
- El color **se ancla al `rangoTrm` del método** (orden ascendente), no al orden de llegada de la
  respuesta: filtrar o reordenar nunca repinta un método (anti-patrón *recolor-on-filter*).
- Ofertas = contexto en gris (`#64748b`); el candidato = tinta (`#0f172a`) + forma propia. Patrón de
  **énfasis**: contexto gris, respuesta en color.
- Marcas finas, línea base y ticks como hairlines sólidos, sin cuadrícula pesada, sin ejes dobles.
- **Leyenda siempre presente** (4 series) *y* etiquetas directas sobre las marcas.
- La **vista de tabla** que exige la accesibilidad ya existe en la página: la tabla de oferentes y las
  tarjetas de método contienen todos los valores; el tooltip nunca es la única vía.
- Sin dependencias de charting: SVG inline `viewBox` + `w-full h-auto`, dentro de un contenedor
  `overflow-x-auto` con `min-w-[640px]` para móvil.

**Accesibilidad**
- `label`/`for` en cada control; `aria-label` en botones de solo ícono.
- El toggle de validez es un `button` con `role="switch"` y `aria-checked`.
- Las marcas de la franja son focusables (`tabindex="0"`) y muestran en foco lo mismo que en hover.
- El color nunca es el único canal: chips con texto, etiquetas directas, tachado en las no válidas.

## Criterios de aceptación (Given / When / Then)

- **CA1:** Dado un proceso seleccionado, cuando pulso *Importar de SECOP*, entonces el botón muestra
  carga y al terminar veo `encontrados`, `creados` y `actualizados`, y la tabla se refresca.
- **CA2:** Dado que importo dos veces seguidas el mismo proceso, entonces no se duplican filas y el
  segundo resultado reporta `creados = 0` (idempotencia).
- **CA3:** Dado un proceso cuyo SECOP no publica ofertas (`encontrados = 0`), entonces veo un estado
  vacío que me invita a **agregar oferentes manualmente**, no un error.
- **CA4:** Dado un oferente con `porcentaje = 92.94`, entonces la celda muestra exactamente
  `92.94 %` (sin volver a multiplicar por 100).
- **CA5:** Dado un oferente sin NIT (`null` o `"No Definido"`), entonces la celda muestra `—`
  neutro y la fila sigue identificándose por `nombreOferente`.
- **CA6:** Dado un oferente válido, cuando desactivo su toggle, entonces la fila se atenúa con el
  valor tachado, la marca sale de la franja y **el análisis se recalcula**.
- **CA7:** Dado un oferente `origen = SECOP`, cuando lo edito o intento borrarlo, entonces se me
  advierte que el cambio se sobrescribe en la próxima importación.
- **CA8:** Dado el modal manual, cuando dejo el nombre vacío o pongo un valor ≤ 0, entonces el botón
  guardar está deshabilitado y veo el error del campo.
- **CA9:** Dado un análisis con régimen `DOCUMENTOS_TIPO`, entonces veo una tarjeta por método con su
  **rango TRM**, valor de referencia, porcentaje y oferente más cercano.
- **CA10:** Dado que escribo un `valorCandidato` y recalculo, entonces cada tarjeta muestra
  `puntajeCandidato` y `posicionCandidato`, y aparece el rombo "Tu oferta" en la franja.
- **CA11:** Dado un `valorSugerido` no nulo, entonces se muestra destacado y el botón *Usar como
  candidato* lo copia al input y recalcula.
- **CA12:** Dadas `advertencias` en la importación o en el análisis, entonces se renderizan visibles;
  nunca se descartan en silencio.
- **CA13:** Dado que cambio el régimen a `DECRETO_1082`, entonces el análisis se recalcula y se
  muestran los métodos de ese régimen.
- **CA14:** Dada la franja con ofertas y los métodos, entonces cada valor de referencia está
  etiquetado directamente, ninguna etiqueta se encima ni se recorta, y en móvil la franja hace scroll
  horizontal dentro de su propia caja (el body nunca scrollea en horizontal).
- **CA15:** Dado un usuario sin rol `ANALISTA`/`ADMIN`, entonces `/sobre-2` no es accesible y la
  opción no aparece en el sidebar.
- **CA16:** Dado un proceso como `LP-005-2026`, donde más de la mitad de las ofertas valen
  exactamente el presupuesto oficial, entonces **antes** de las tarjetas veo el banner de "el Sobre 2
  puede no estar abierto" con el detalle contado.
- **CA17:** Dadas ofertas con valor `0`, iguales al presupuesto o por debajo del 10 % de éste,
  entonces sus filas se resaltan como sospechosas y el botón *Excluir N sospechosas* las marca no
  válidas de una vez, recalculando el análisis una sola vez.
- **CA18:** Dado que dejo el **NIT de la entidad** vacío, entonces veo el aviso de que la importación
  puede cruzar varias entidades y el botón pide confirmación explícita ("Importar sin NIT").
- **CA19:** Dado un proceso con 135 oferentes, entonces la tabla pagina de 20 en 20, el orden por
  valor aplica sobre las 135 filas, y en la franja las ofertas se ven como densidad sin marcadores
  encimados.
- **CA20:** `npm run build` compila sin errores (type-check + plantillas con `strictTemplates`).

## Notas técnicas

- **Rutas/guards:** nueva ruta hija `sobre-2` en `app.routes.ts` con
  `canActivate: [roleGuard([...OPERATIVOS])]` y `loadComponent` lazy. Entrada en
  `sidebar.component.ts` rotulada **"Sobre 2"**, con `roles: ['ANALISTA','ADMIN']` e ícono
  `bx-calculator`, ubicada **después de *Seguimiento*** (decisión de Diego, 2026-08-06).
- **Signals/OnPush:** todos los componentes `standalone` + `OnPush`. Estado con `signal()`, derivados
  con `computed()` (orden, paginación, escala de la franja). Entradas/salidas de los componentes
  nuevos con `input()` / `output()`. **Sin mutar** arrays dentro de signals: siempre referencia nueva
  (`.set([...])`), o la tabla no repinta bajo OnPush.
- **Sin `any`.** Todo tipado con las interfaces de arriba.
- **Sin URLs fuera del servicio.** `apiUrl` como `private readonly` desde `environment.apiBaseUrl`.
- **Casos borde:**
  - Todas las ofertas con el mismo valor → dominio degenerado: se abre artificialmente ±2%.
  - `presupuestoOficial = 0` o ausente → ticks del eje en COP compacto (RF4.7).
  - `metodos` vacío → tarjetas ocultas y advertencia visible.
  - `porcentaje`, `oferenteMasCercano`, `puntajeCandidato`, `posicionCandidato` y `valorSugerido`
    son nullable: se muestran como `—`, no como `0`.
  - Cambiar de proceso limpia oferentes, análisis, candidato, orden y paginación.
- **Verificación:** `npm run build` + recorrido manual de CA1–CA15 (autenticado, backend arriba).
  No se escriben tests (decisión vigente del proyecto).

## Decisiones

1. **Régimen por defecto `DOCUMENTOS_TIPO`**, con el otro accesible en un selector.
2. **La franja se escala en valor absoluto (COP)** y solo los **rótulos del eje** se expresan en % del
   presupuesto oficial. Los porcentajes de cada dato se muestran siempre con el valor que envía el
   backend, nunca derivados en el cliente.
3. **El color del método se ancla a su `rangoTrm`**, porque el `metodo` (nombre del enum) no está
   fijado en el contrato y el orden del array podría variar.
4. **La tabla de oferentes es propia del feature** y no usa `components/modern-table`: esa tabla no
   soporta toggles, encabezados ordenables ni formato de porcentaje. Sí se reutilizan
   `components/pagination`, `components/confirm-modal` y el patrón de modales
   (`modal-overlay`/`modal-panel`/`modal-body`).
5. **El `valorCandidato` no se persiste**: es un parámetro de simulación.
6. **La detección de "Sobre 2 no abierto" es heurística y de cliente.** No hay campo en el contrato
   que lo diga, así que se infiere de los datos ya recibidos (`valorOferta` vs `presupuestoOficial`,
   valores repetidos, ceros). Por eso **advierte, nunca bloquea ni excluye por su cuenta**: la
   decisión de sanear la muestra siempre es del analista.
7. **La franja es de densidad (binning), no un punto por oferta**, porque el volumen real es de
   ~135 ofertas y un punto por oferta se solapa consigo mismo.

## Preguntas abiertas

- ~~Etiqueta exacta del sidebar~~ → resuelto: **"Sobre 2"**, después de *Seguimiento*.
- ¿Debe el Cuadro de Obra enlazar directamente a `/sobre-2?cuadroId=<id>` desde la fila del proceso?
  (La pantalla ya soporta el deep-link; falta decidir dónde ponerlo.)
