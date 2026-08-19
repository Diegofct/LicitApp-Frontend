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

/** Enlace al proceso en SECOP II; `url` es null cuando SECOP no lo publica. */
export interface UrlProcesoResponse {
  idDelProceso: string;
  url: string | null;
}

/** Tamaño legible de un documento; cadena vacía si SECOP no lo publica. */
export function formatTamanoDocumento(bytes: number | null): string {
  if (!bytes || bytes <= 0) return '';
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}
