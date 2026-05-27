import { CuadroDeObraItem } from '../../CuadroDeObra/interface/cuadro-de-obra';

export type CuadroDeObraEstado = CuadroDeObraItem['cuadroDeObraEstado'];

export type EstadoResultado = Extract<CuadroDeObraEstado, 'ADJUDICADO' | 'NO_ADJUDICADO'>;

export interface ResumenResultados {
  totalProcesos: number;
  porPresentar: number;
  presentados: number;
  adjudicados: number;
  noAdjudicados: number;
  cancelados: number;
  procesosCerrados: number;
  tasaExitoPorcentaje: number;
}

export interface ItemHistorialResultado {
  id: number;
  numeroProceso: string;
  entidadContratante: string;
  descripcionObjeto: string;
  monto: number;
  estado: EstadoResultado;
  observacion: string | null;
  fechaPublicacion: string;
  fechaCierre: string;
}

export type SortDirection = 'asc' | 'desc';

export type HistorialSortableField = 'fechaCierre' | 'monto' | 'fechaPublicacion';

export interface HistorialSort {
  field: HistorialSortableField;
  direction: SortDirection;
}
