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
  plazo: string;
  anticipo: string;
  observacion?: string;
  cuadroDeObraEstado: 'POR_PRESENTAR' | 'PRESENTADO' | 'ADJUDICADO' | 'NO_ADJUDICADO' | 'CANCELADO';
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
  ctProceso: number;
  patrimonio: number;
  n: number;
  liquidez: number;
  endeudamiento: number;
  razonCoberturaInteres: number;
  rentabilidadPatrimonio: number;
  rentabilidadActivo: number;
  // Capacidad Residual
  kresidualProceso: number;
  poeAnticipo: number;
}
