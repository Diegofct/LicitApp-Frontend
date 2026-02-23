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
