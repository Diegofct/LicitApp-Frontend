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
  observaciones?: string;
  integrantes: IntegranteRequest[];
}

export interface ConformacionResponse {
  id: number;
  cuadroDeObraId: number;
  tipoParticipacion: TipoParticipacion;
  fechaConformacion: string;
  observaciones?: string;
  integrantes: IntegranteResponse[];
}
