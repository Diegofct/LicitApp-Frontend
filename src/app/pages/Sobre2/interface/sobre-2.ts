/**
 * Contratos del "Sobre 2" (oferta económica).
 *
 * Contexto de negocio: la entidad puntúa el precio con UNO de varios métodos de
 * ponderación, y no se sabe cuál hasta después — lo sortean los centavos de la TRM
 * del día hábil siguiente a la apertura del Sobre 2. Por eso el backend calcula
 * todos los métodos del régimen en paralelo y sugiere un valor de compromiso.
 *
 * **La tarjeta de controles de ponderación se retiró por decisión de negocio**, con lo
 * que la página ya no manda parámetros al análisis ni simula un valor propio. Estos
 * tipos siguen describiendo la respuesta completa del backend, que no cambió: la página
 * pinta las medidas de tendencia y el `valorSugerido`; los campos de simulación
 * (`valorCandidato`, `porcentajeCandidato`, `puntajeMaximo`, `puntajeCandidato` y
 * `posicionCandidato`) siguen llegando pero hoy nadie los muestra. Se documentan igual
 * para no perder su significado si el input vuelve.
 *
 * Todos los `BigDecimal` del backend llegan a JSON como `number`.
 */

/** Régimen de ponderación económica. `DOCUMENTOS_TIPO` es el vigente por defecto. */
export type RegimenPonderacion = 'DOCUMENTOS_TIPO' | 'DECRETO_1082';

/** De dónde salió la fila: importada de SECOP o digitada a mano. */
export type OrigenOferente = 'SECOP' | 'MANUAL';

/**
 * Un oferente del proceso con el valor con el que se presentó.
 * El identificador visible es `nombreOferente`: en consorcios/UT (la mayoría en
 * obra pública) el NIT llega `null` o "No Definido" y no sirve como llave.
 */
export interface OferenteProceso {
  id: number;
  cuadroDeObraId: number;
  nombreOferente: string;
  nitOferente: string | null;
  valorOferta: number;
  /**
   * Porcentaje de la oferta sobre el presupuesto oficial, **ya calculado ×100 y
   * redondeado a 2 decimales** por el backend (93.47 = 93.47 %).
   * NUNCA volver a multiplicarlo ni recalcularlo en el cliente: el backend redondea
   * con HALF_UP igual que el `ROUND` del Excel, y un cálculo propio discreparía en
   * 0.01 justo en los casos límite.
   */
  porcentaje: number | null;
  moneda: string | null;
  /** ISO `yyyy-MM-dd`. */
  fechaRegistro: string | null;
  /**
   * `false` = oferta excluida de las fórmulas (p. ej. rechazada por precio
   * artificialmente bajo) pero conservada como rastro del proceso.
   */
  valida: boolean;
  origen: OrigenOferente;
}

/** Cuerpo de alta/edición manual de un oferente. */
export interface OferenteProcesoRequest {
  /** Obligatorio, ≤ 500 caracteres. */
  nombreOferente: string;
  /** Opcional, ≤ 32 caracteres. */
  nitOferente?: string | null;
  /** Obligatorio, > 0. */
  valorOferta: number;
  /** Opcional, ≤ 16 caracteres. */
  moneda?: string | null;
  valida?: boolean;
}

/**
 * Resultado de la importación desde SECOP. La operación es **idempotente**:
 * repetirla no duplica filas, por eso distingue `creados` de `actualizados`.
 */
export interface ImportacionOferentes {
  cuadroDeObraId: number;
  encontrados: number;
  creados: number;
  actualizados: number;
  oferentes: OferenteProceso[];
  advertencias: string[];
  /**
   * Cuántos proponentes radicaron oferta según SECOP. Solo llega cuando **no** se
   * encontraron valores, que es cuando aporta.
   *
   * Con `encontrados === 0` y este campo en N > 0 el proceso **sí tiene competencia**,
   * pero el Sobre 2 no se ha abierto y los precios siguen sellados hasta la audiencia.
   * Es lo único que SECOP publica antes de la apertura: cuántos son, no con cuánto
   * vienen. No es un error ni queda nada por importar.
   */
  proponentesRegistrados: number | null;
}

/** Cálculo de un método de ponderación sobre las ofertas válidas. */
export interface ResultadoMetodo {
  /** Nombre del enum del backend. */
  metodo: string;
  /** Nombre legible del método. */
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
  /**
   * Puntaje que sacaría el `valorSugerido` si la TRM sortea **este** método.
   * Responde la pregunta con la que se decide: "si voy con el sugerido, ¿cuánto
   * saco en cada tendencia?". `null` si no hubo valor sugerido.
   */
  puntajeSugerido: number | null;
}

/** Análisis completo del Sobre 2 para un proceso. */
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
  /** Valor de compromiso sugerido frente a todos los métodos. */
  valorSugerido: number | null;
  porcentajeSugerido: number | null;
  metodos: ResultadoMetodo[];
  advertencias: string[];
  /**
   * Estado del cuadro (`POR_PRESENTAR`, `PRESENTADO`, `ADJUDICADO`…). Puede venir
   * nulo en cuadros antiguos sin estado asignado.
   */
  estadoCuadro: string | null;
  /**
   * El seguimiento registra `INFORME_EVALUACION_DEFINITIVO`: ya se sabe quién quedó
   * hábil y toca decidir con qué valor presentarse.
   */
  listoParaDecidir: boolean;
  /**
   * El seguimiento registra `AUDIENCIA_REALIZADA`: el Sobre 2 se abrió, así que los
   * valores de los competidores son públicos y fiables. Es el dato duro que sustituye
   * a la heurística sobre la muestra.
   */
  valoresDefinitivos: boolean;
  /**
   * Enum del método del que sale `valorSugerido`, es decir, **a qué tendencia se le
   * está apuntando**. La mediana ponderada siempre devuelve una de las referencias
   * (nunca un valor interpolado), por eso se puede nombrar.
   * `null` si no hubo referencias utilizables.
   */
  metodoSugerido: string | null;
  /** Nombre legible del anterior, p. ej. "Mediana con valor absoluto". */
  nombreMetodoSugerido: string | null;
}

/** Histórico de un competidor a lo largo de los procesos registrados. */
export interface ResumenCompetidor {
  nombreOferente: string;
  procesos: number;
  porcentajePromedio: number;
  porcentajeMinimo: number;
  porcentajeMaximo: number;
}

/** Parámetros opcionales del análisis. */
export interface AnalisisParams {
  valorCandidato?: number | null;
  regimen?: RegimenPonderacion;
  puntajeMaximo?: number | null;
}

/**
 * Paleta categórica de la franja de distribución.
 *
 * Validada con la skill `dataviz`
 * (`validate_palette.js --mode light --surface #ffffff --pairs all`):
 * banda de luminosidad, piso de croma, separación CVD (protan/deutan/tritan),
 * piso de visión normal y contraste ≥ 3:1 — todas PASS, sin WARN.
 *
 * El slot se asigna por el **rango TRM** del método (orden ascendente), que es una
 * propiedad intrínseca y estable del método, no por el orden en que llega el array:
 * así filtrar o reordenar nunca repinta una serie.
 */
export const COLORES_METODO: readonly string[] = [
  '#4f46e5', // indigo-600
  '#0d9488', // teal-600
  '#d97706', // amber-600
  '#e11d48', // rose-600
];

/** Gris de contexto para las ofertas de la competencia (patrón de énfasis). */
export const COLOR_OFERTA = '#64748b';
/** Gris muy claro para las ofertas excluidas del cálculo. */
export const COLOR_OFERTA_INVALIDA = '#cbd5e1';
/** Tinta del candidato: forma propia, no un quinto color de serie. */
export const COLOR_CANDIDATO = '#0f172a';
