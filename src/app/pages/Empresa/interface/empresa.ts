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
  // Campos calculados
  liquidez?: number;
  endeudamiento?: number;
  razonCoberturaInteres?: number;
  rentabilidadActivo?: number;
  rentabilidadPatrimonio?: number;
  capitalTrabajo?: number;
}

export interface CapacidadResidual {
  id?: number;
  capacidadOrganizacion: number;
  experiencia: number;
  capacidadTecnica: number;
  capacidadFinanciera: number;
  saldosContratosEjecucion: number;
  resultadoCapacidadResidualProponente?: number;
}

export interface Experiencia {
  id?: number;
  contratista: string;
  entidadContratante: string;
  valorSMMLV: number;
  porcentajeParticipacion: number;
  codigosUNSPSC: string[];
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
  capacidadResidual?: CapacidadResidual;
}
