export type TipoEvento =
  | 'OFERTA_PRESENTADA'
  | 'PLAZO_SUBSANACION_ABIERTO'
  | 'SUBSANACION_PRESENTADA'
  | 'INFORME_EVALUACION_PRELIMINAR'
  | 'OBSERVACIONES_AL_INFORME'
  | 'INFORME_EVALUACION_DEFINITIVO'
  | 'AUDIENCIA_PROGRAMADA'
  | 'AUDIENCIA_REALIZADA'
  | 'RESOLUCION_ADJUDICACION'
  | 'DECLARATORIA_DESIERTA'
  | 'OTRO';

export interface SeguimientoEvento {
  id: number;
  tipo: TipoEvento;
  fechaEvento: string;
  fechaRegistro: string;
  descripcion: string | null;
  observaciones: string | null;
}

export interface SeguimientoResponse {
  id: number;
  cuadroDeObraId: number;
  fechaInicio: string;
  eventos: SeguimientoEvento[];
}

export interface RegistrarEventoRequest {
  tipo: TipoEvento;
  fechaEvento: string;
  descripcion?: string;
  observaciones?: string;
}

export interface TipoEventoMeta {
  tipo: TipoEvento;
  label: string;
  icon: string;
  tone: 'info' | 'success' | 'warning' | 'danger' | 'neutral';
}

export const TIPO_EVENTO_META: Record<TipoEvento, TipoEventoMeta> = {
  OFERTA_PRESENTADA: {
    tipo: 'OFERTA_PRESENTADA',
    label: 'Oferta presentada',
    icon: 'bx-paper-plane',
    tone: 'info',
  },
  PLAZO_SUBSANACION_ABIERTO: {
    tipo: 'PLAZO_SUBSANACION_ABIERTO',
    label: 'Plazo de subsanación abierto',
    icon: 'bx-time-five',
    tone: 'warning',
  },
  SUBSANACION_PRESENTADA: {
    tipo: 'SUBSANACION_PRESENTADA',
    label: 'Subsanación presentada',
    icon: 'bx-edit-alt',
    tone: 'info',
  },
  INFORME_EVALUACION_PRELIMINAR: {
    tipo: 'INFORME_EVALUACION_PRELIMINAR',
    label: 'Informe de evaluación preliminar',
    icon: 'bx-file',
    tone: 'info',
  },
  OBSERVACIONES_AL_INFORME: {
    tipo: 'OBSERVACIONES_AL_INFORME',
    label: 'Observaciones al informe',
    icon: 'bx-message-square-edit',
    tone: 'warning',
  },
  INFORME_EVALUACION_DEFINITIVO: {
    tipo: 'INFORME_EVALUACION_DEFINITIVO',
    label: 'Informe de evaluación definitivo',
    icon: 'bx-file-blank',
    tone: 'info',
  },
  AUDIENCIA_PROGRAMADA: {
    tipo: 'AUDIENCIA_PROGRAMADA',
    label: 'Audiencia programada',
    icon: 'bx-calendar-event',
    tone: 'warning',
  },
  AUDIENCIA_REALIZADA: {
    tipo: 'AUDIENCIA_REALIZADA',
    label: 'Audiencia realizada',
    icon: 'bx-calendar-check',
    tone: 'info',
  },
  RESOLUCION_ADJUDICACION: {
    tipo: 'RESOLUCION_ADJUDICACION',
    label: 'Resolución de adjudicación',
    icon: 'bx-trophy',
    tone: 'success',
  },
  DECLARATORIA_DESIERTA: {
    tipo: 'DECLARATORIA_DESIERTA',
    label: 'Declaratoria desierta',
    icon: 'bx-x-circle',
    tone: 'danger',
  },
  OTRO: {
    tipo: 'OTRO',
    label: 'Otro',
    icon: 'bx-dots-horizontal-rounded',
    tone: 'neutral',
  },
};

export const TIPOS_EVENTO: TipoEvento[] = Object.keys(TIPO_EVENTO_META) as TipoEvento[];
