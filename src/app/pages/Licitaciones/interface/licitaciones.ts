export interface Licitacion {
  id: string | null;
  idDelProceso: string;
  entidad: string;
  objeto: string;
  cuantia: number;
  modalidad: string;
  numero: string;
  estado: string;
  fechaPublicacion: string;
  ubicacion: string;
  urlSecop: string;
  codigoUnpspc: string;
  consorcioId: string | null;
  /** Fecha límite de recepción de ofertas según SECOP. Solo trae el día, nunca la hora. */
  fechaCierre: string | null;
  /** Plazo de ejecución normalizado a meses; null cuando SECOP no publica un dato utilizable. */
  plazoMeses: number | null;
  /** Identificador de portafolio (CO1.BDOS.*), llave para consultar los documentos. */
  idDelPortafolio: string | null;
  /** Evento en el que va el proceso según SECOP. Viene con el listado, sin llamada extra. */
  fase: string | null;
}

/** Archivo publicado por la entidad dentro del proceso (pliego, estudios previos, anexos). */
export interface DocumentoProceso {
  idDocumento: string | null;
  nombre: string | null;
  extension: string | null;
  descripcion: string | null;
  tamanoBytes: number | null;
  fechaCarga: string | null;
  url: string;
  esPliego: boolean;
  /** Matriz 2 de indicadores: donde los pliegos tipo fijan los valores financieros exigidos. */
  esMatrizIndicadores: boolean;
}

/**
 * Una adjudicación del proceso. Los procesos por lotes tienen varias, una por lote.
 * En esos, `valor` llega en null: SECOP no publica qué lote ganó cada proveedor.
 */
export interface Adjudicacion {
  proveedor: string;
  valor: number | null;
  fecha: string | null;
}

/**
 * Fase y desenlace de un proceso en SECOP II. El backend lo resuelve contra la API en cada
 * consulta: no hay nada de esto guardado, así que funciona igual con procesos antiguos.
 */
export interface EstadoProceso {
  idDelProceso: string;
  fase: string | null;
  estadoResumen: string | null;
  estadoDelProcedimiento: string | null;
  url: string | null;
  adjudicado: boolean;
  /** Cuántos proponentes se presentaron. Es 0 mientras la recepción de ofertas siga abierta. */
  numeroDeOferentes: number | null;
  numeroDeLotes: number | null;
  /** Adjudicado por lotes: hay varios ganadores y ninguno trae valor. */
  adjudicacionPorLotes: boolean;
  /** Última publicación de la entidad: si es posterior al análisis, hubo adenda. */
  fechaUltimaPublicacion: string | null;
  adjudicaciones: Adjudicacion[];
}

/** Criterios del listado de Búsqueda SECOP. El presupuesto viaja en pesos, no en SMMLV. */
export interface FiltrosLicitaciones {
  entidad?: string;
  departamento?: string;
  presupuestoMin?: number | null;
  presupuestoMax?: number | null;
  soloVigentes?: boolean;
  orden?: 'PUBLICACION' | 'CIERRE';
}

/** Tamaño legible de un documento; cadena vacía si SECOP no lo publica. */
export function formatTamanoDocumento(bytes: number | null): string {
  if (!bytes || bytes <= 0) return '';
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}
