export interface IndicadoresFinancieros {
  id?: number;
  anioCierre: number;
  activoCorriente: number;
  pasivoCorriente: number;
  activoTotal: number;
  pasivoTotal: number;
  utilidadOperacional: number;
  gastosInteres: number;
  patrimonio: number;
  // Campos calculados (solo lectura en el frontend, calculados o devueltos por backend)
  liquidez?: number;
  endeudamiento?: number;
  razonCoberturaInteres?: number;
  rentabilidadActivo?: number;
  rentabilidadPatrimonio?: number;
  capitalTrabajo?: number;
}

export interface Experiencia {
  id?: number;
  numeroContrato: string;
  contratante: string;
  objeto: string;
  valorPesos: number;
  valorSMMLV: number;
  fechaTerminacion: string | Date;
  codigosUNSPSC: string; // Almacenados como string o separados por coma
  porcentajeParticipacionConsorcio: number;
}

export interface Empresa {
  id?: number;
  nit: string;
  razonSocial: string;
  direccion: string;
  telefono: string;
  correo: string;
  numeroProponenteCcb: string;
  tamanoEmpresa: 'GRANDE' | 'MEDIANA' | 'PEQUEÑA' | 'MICROEMPRESA';
  representanteLegal: string;
  identificacionRepresentanteLegal: string;
  fechaInscripcion: string | Date;
  fechaUltimaRenovacion: string | Date;
  indicadores?: IndicadoresFinancieros;
  experiencias?: Experiencia[];
}
