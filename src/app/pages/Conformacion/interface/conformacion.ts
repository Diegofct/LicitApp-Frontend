export type TipoParticipacion = 'INDIVIDUAL' | 'CONSORCIO' | 'UNION_TEMPORAL';

export interface IntegranteRequest {
  empresaId: number;
  porcentajeParticipacion: number;
}

export interface IntegranteResponse {
  id: number;
  empresaId: number;
  nombreEmpresa: string;
  porcentajeParticipacion: number;
}

export interface ConformacionRequest {
  cuadroDeObraId: number;
  tipoParticipacion: TipoParticipacion;
  /** Obligatorio para CONSORCIO y UNION_TEMPORAL; no aplica para INDIVIDUAL. Máx. 255 caracteres. */
  nombre?: string;
  observaciones?: string;
  integrantes: IntegranteRequest[];
}

export interface ConformacionResponse {
  id: number;
  cuadroDeObraId: number;
  tipoParticipacion: TipoParticipacion;
  nombre?: string;
  fechaConformacion: string;
  observaciones?: string;
  integrantes: IntegranteResponse[];
}
