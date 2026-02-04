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
}
