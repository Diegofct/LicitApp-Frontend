export interface DetalleAnalisis {
  indicador: string;
  valorRequerido: string | number;
  valorObtenido: string | number;
  cumple: boolean;
  observacion?: string;
}

export interface SugerenciaAnalisis {
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
  sugerencias: SugerenciaAnalisis[];
}

export interface AnalisisRequest {
  empresaId: number;
  cuadroDeObraId: number;
}
