/**
 * Referencia liviana de un proceso ya presente en el Cuadro de Obra.
 * Se usa para cruzar contra las licitaciones (Licitacion.idDelProceso) y así
 * resaltar filas ya agregadas y abrirlas en modo lectura.
 */
export interface CuadroDeObraRef {
  id: number;
  numeroProceso: string;
  /**
   * Identidad del proceso en SECOP y llave del cruce con la Búsqueda.
   * `numeroProceso` no sirve: solo es único dentro de una misma entidad.
   * Es `null` en los procesos cargados a mano, que no existen en SECOP.
   */
  idDelProceso: string | null;
}

/** Marca "nos presentamos" de un cuadro. `null` = sin marca. */
export type PresentacionMarca = 'SI' | 'NO';

export interface CuadroDeObraItem {
  id: number;
  numeroProceso: string;
  /** Identidad del proceso en SECOP; `null` si se cargó a mano. */
  idDelProceso: string | null;
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
  plazo: number; // (RF4) meses
  anticipo: number; // (RF4) porcentaje
  observacion?: string;
  cuadroDeObraEstado: 'POR_PRESENTAR' | 'PRESENTADO' | 'ADJUDICADO' | 'NO_ADJUDICADO' | 'CANCELADO';
  /** Marca "nos presentamos" compartida por el equipo; `null` = sin marca. */
  presentacion: PresentacionMarca | null;
  /** (RF3) true si el proceso ya tiene requisitos de licitación guardados. */
  tieneRequisitos: boolean;
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
  // Plazo del proceso (RF5): meses, precargado desde el Cuadro de Obra
  plazo: number;
  // Indicadores Financieros
  presupuesto: number;
  patrimonio: number;
  capitalTrabajo: number;
  liquidez: number;
  endeudamiento: number;
  razonCoberturaInteres: number;
  rentabilidadPatrimonio: number;
  rentabilidadActivo: number;
  // Capacidad Residual
  kresidualProceso: number;
  poeAnticipo: number;
}
