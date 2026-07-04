/**
 * Estado de un indicador financiero del RUP.
 * El backend lo devuelve junto a cada ratio para explicar por qué su valor es
 * `null` cuando el cálculo implicaría una división por cero o falta un insumo.
 *
 * - CALCULABLE:                hay valor numérico real; muéstralo normal.
 * - INDETERMINADO_FAVORABLE:   valor es `null`; el indicador "no aplica" pero CUMPLE.
 * - INDETERMINADO_A_VERIFICAR: valor es `null`; indeterminado no evaluable.
 * - DATO_FALTANTE:             valor es `null`; faltó un insumo del cálculo.
 */
export type EstadoIndicador =
  | 'CALCULABLE'
  | 'INDETERMINADO_FAVORABLE'
  | 'INDETERMINADO_A_VERIFICAR'
  | 'DATO_FALTANTE';

export interface IndicadoresFinancieros {
  id?: number;
  anioCierre: number;
  activoCorriente: number;
  pasivoCorriente: number;
  activoTotal: number;
  pasivoTotal: number;
  utilidadOperacional: number;
  gastosInteres: number;
  patrimonio: number;
  // Campos calculados (ratios): `null` cuando el indicador es indeterminado.
  liquidez?: number | null;
  endeudamiento?: number | null;
  razonCoberturaInteres?: number | null;
  rentabilidadActivo?: number | null;
  rentabilidadPatrimonio?: number | null;
  // Magnitudes calculadas: no cambian, siempre numéricas.
  capitalTrabajo?: number;
  // Estado hermano de cada ratio (explica el porqué de un valor `null`).
  estadoLiquidez?: EstadoIndicador;
  estadoEndeudamiento?: EstadoIndicador;
  estadoRazonCoberturaInteres?: EstadoIndicador;
  estadoRentabilidadActivo?: EstadoIndicador;
  estadoRentabilidadPatrimonio?: EstadoIndicador;
}

export interface CapacidadResidual {
  id?: number;
  capacidadOrganizacion: number;
  experiencia: number;
  capacidadTecnica: number;
  capacidadFinanciera: number;
  saldosContratosEjecucion: number;
  resultadoCapacidadResidualProponente?: number;
}

export interface Experiencia {
  id?: number;
  contratista: string;
  entidadContratante: string;
  valorSMMLV: number;
  porcentajeParticipacion: number;
  codigosUNSPSC: string[];
}

/**
 * Cierre fiscal tal como lo devuelve la extracción por IA del RUP.
 * Todos los campos pueden venir `null` si la IA no logró determinarlos.
 */
export interface CierreFiscalExtraido {
  anioCierre: number | null;
  activoCorriente: number | null;
  pasivoCorriente: number | null;
  activoTotal: number | null;
  pasivoTotal: number | null;
  utilidadOperacional: number | null;
  gastosInteres: number | null;
}

/**
 * Experiencia (contrato) tal como la devuelve la extracción por IA del RUP.
 */
export interface ExperienciaExtraida {
  contratista: string | null;
  entidadContratante: string | null;
  valorSMMLV: number | null;
  porcentajeParticipacion: number | null;
  codigosUNSPSC: string[] | null;
}

/**
 * Borrador editable devuelto por POST /empresas/extraer-rup.
 * La IA no persiste nada: este objeto solo precarga el formulario para que
 * el usuario lo revise y corrija antes de guardar. Cualquier campo puede ser `null`.
 */
export interface RupExtraido {
  nit: string | null;
  razonSocial: string | null;
  direccion: string | null;
  telefono: string | null;
  correo: string | null;
  numeroProponenteCcb: string | null;
  tamanoEmpresa: string | null;
  representanteLegal: string | null;
  identificacionRepresentanteLegal: string | null;
  fechaInscripcion: string | null;
  fechaUltimaRenovacion: string | null;
  cierresFiscales: CierreFiscalExtraido[] | null;
  experiencias: ExperienciaExtraida[] | null;
  advertencias: string[] | null;
}

export interface Empresa {
  id?: number;
  nit: string;
  razonSocial: string;
  direccion: string;
  telefono: string;
  correo: string;
  numeroProponenteCcb: string;
  /** Solo descriptivo. El beneficio MiPyme ya NO se infiere de este campo. */
  tamanoEmpresa: 'GRANDE' | 'MEDIANA' | 'PEQUEÑA' | 'MICROEMPRESA';
  /** Flag explícito del backend: la empresa aplica al beneficio MiPyme. */
  mipyme: boolean;
  /** Flag explícito del backend: proponente mujer / emprendimiento de mujeres. */
  proponenteMujer: boolean;
  representanteLegal: string;
  identificacionRepresentanteLegal: string;
  fechaInscripcion: string | Date;
  fechaUltimaRenovacion: string | Date;
  indicadores?: IndicadoresFinancieros;
  experiencias?: Experiencia[];
  capacidadResidual?: CapacidadResidual;
}
