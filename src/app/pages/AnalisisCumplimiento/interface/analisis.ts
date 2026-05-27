export interface DetalleAnalisis {
  indicador: string;
  valorRequerido: string | number;
  valorObtenido: string | number;
  cumple: boolean;
  observacion?: string;
}

export interface SugerenciaConsorcio {
  empresaId: number;
  nit: string;
  razonSocial: string;
}

export interface AnalisisResponse {
  empresaId: number;
  cuadroDeObraId: number;
  tipoParticipacion: string;
  cumpleGlobal: boolean;
  detalles: DetalleAnalisis[];
  sugerencias: SugerenciaConsorcio[];
}

export interface AnalisisRequest {
  empresaId: number;
  cuadroDeObraId: number;
}
