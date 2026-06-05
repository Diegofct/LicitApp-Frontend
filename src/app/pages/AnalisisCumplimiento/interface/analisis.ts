export interface DetalleAnalisis {
  indicador: string;
  valorRequerido: string | number;
  valorObtenido: string | number;
  cumple: boolean;
  observacion?: string;
}

/**
 * Integrante de una propuesta de consorcio.
 * Incluye tanto a la empresa solicitante (la elegida por el usuario) como
 * a los candidatos que aportan cobertura.
 */
export interface IntegranteConsorcio {
  empresaId: number;
  nit: string;
  razonSocial: string;
  /** Fracción de participación (0.01–0.99). Multiplicar por 100 para mostrar %. */
  porcentaje: number;
  /** true => es la empresa que el usuario eligió analizar. */
  solicitante: boolean;
  /** Requisitos en los que este integrante es fuerte (chips informativos). */
  requisitosQueCubre: string[];
}

/**
 * Propuesta de consorcio sugerida por el backend.
 * Las propuestas llegan ya rankeadas (las viables primero).
 */
export interface PropuestaConsorcio {
  integrantes: IntegranteConsorcio[];
  cumpleGlobal: boolean;
  /** Requisitos que la solicitante no cumplía sola y que el consorcio sí cubre. */
  requisitosCubiertos: string[];
  /** Requisitos aún sin cubrir. Vacío + cumpleGlobal=true => consorcio viable. */
  requisitosPendientes: string[];
}

export interface AnalisisResponse {
  empresaId: number;
  cuadroDeObraId: number;
  tipoParticipacion: string;
  cumpleGlobal: boolean;
  detalles: DetalleAnalisis[];
  sugerencias: PropuestaConsorcio[];
}

export interface AnalisisRequest {
  empresaId: number;
  cuadroDeObraId: number;
  /**
   * Opcional. Fracción 0.01–0.99 (0.6 = 60% para la empresa elegida).
   * Si se omite, el backend usa 0.5 (50%).
   */
  porcentajeSimulacion?: number;
}
