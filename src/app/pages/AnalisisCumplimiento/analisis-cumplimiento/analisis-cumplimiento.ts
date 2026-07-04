import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CuadroDeObraService } from '../../CuadroDeObra/service/cuadro-de-obra.service';
import { EmpresaService } from '../../Empresa/service/empresa.service';
import { AnalisisCumplimientoService } from '../service/analisis.service';
import { CuadroDeObraItem, RequisitoLicitacion } from '../../CuadroDeObra/interface/cuadro-de-obra';
import { Empresa } from '../../Empresa/interface/empresa';
import { AnalisisResponse, DetalleAnalisis } from '../interface/analisis';
import { ConformacionProponenteComponent } from '../../../components/conformacion-proponente/conformacion-proponente';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-analisis-cumplimiento',
  standalone: true,
  imports: [CommonModule, FormsModule, ConformacionProponenteComponent],
  templateUrl: './analisis-cumplimiento.html',
})
export class AnalisisCumplimiento implements OnInit {
  private readonly cuadroService = inject(CuadroDeObraService);
  private readonly empresaService = inject(EmpresaService);
  private readonly analisisService = inject(AnalisisCumplimientoService);
  private readonly route = inject(ActivatedRoute);

  /** Indica si veníamos de un deep-link para definir conformación. */
  autoEditConformacion = signal(false);

  // --- LISTAS ---
  procesos = signal<CuadroDeObraItem[]>([]);
  empresas = signal<Empresa[]>([]);

  // --- SELECCIÓN ---
  selectedProcesoId = signal<number | null>(null);
  selectedEmpresasIds = signal<Set<number>>(new Set());

  /**
   * % de participación de la empresa elegida en el consorcio simulado (1–99).
   * Se envía al backend como fracción (porcentaje / 100). Default 50 (= backend).
   */
  porcentajeSimulacion = signal<number>(50);

  // --- ESTADO ---
  loadingProcesos = signal(false);
  loadingEmpresas = signal(false);
  loadingAnalisis = signal(false);
  hasRequisitos = signal<boolean | null>(null);
  requisitos = signal<RequisitoLicitacion | null>(null);
  resultados = signal<AnalisisResponse[]>([]);

  ngOnInit(): void {
    this.cargarProcesos();
    this.cargarEmpresas();

    // Soporta deep-link tipo /analisis-cumplimiento?cuadroId=123&conformacion=1
    const params = this.route.snapshot.queryParamMap;
    const cuadroIdParam = params.get('cuadroId');
    const conformacionFlag = params.get('conformacion');
    if (cuadroIdParam) {
      const id = Number(cuadroIdParam);
      if (!Number.isNaN(id)) {
        this.autoEditConformacion.set(conformacionFlag === '1');
        this.selectProceso(id);
      }
    }
  }

  /** Selección programática de un proceso (también desde deep-link). */
  selectProceso(id: number): void {
    this.selectedProcesoId.set(id);
    this.cuadroService.obtenerRequisitos(id).subscribe({
      next: (req) => {
        const existe = !!req && (!!req.id || !!req.general || !!req.presupuesto);
        this.hasRequisitos.set(existe);
        this.requisitos.set(existe ? req : null);
      },
      error: () => {
        this.hasRequisitos.set(false);
        this.requisitos.set(null);
      },
    });
  }

  cargarProcesos(): void {
    this.loadingProcesos.set(true);
    // Asumimos que podemos obtener una lista de POR_PRESENTAR. 
    // Usaremos la función existente y filtraremos si es necesario, 
    // pero idealmente el backend ya lo hace con el tab.
    this.cuadroService.obtenerCuadroDeObra(0, 100, 'por-presentar').subscribe({
      next: (res) => {
        this.procesos.set(res.content);
        this.loadingProcesos.set(false);
      },
      error: () => this.loadingProcesos.set(false)
    });
  }

  cargarEmpresas(): void {
    this.loadingEmpresas.set(true);
    this.empresaService.listarEmpresas().subscribe({
      next: (res) => {
        this.empresas.set(res);
        this.loadingEmpresas.set(false);
      },
      error: () => this.loadingEmpresas.set(false)
    });
  }

  onProcesoChange(event: any): void {
    const id = Number(event.target.value);
    if (!id) {
      this.selectedProcesoId.set(null);
      this.hasRequisitos.set(null);
      this.requisitos.set(null);
      this.resultados.set([]);
      this.autoEditConformacion.set(false);
      return;
    }
    this.autoEditConformacion.set(false);
    this.selectProceso(id);
  }

  toggleEmpresa(id: number | undefined): void {
    if (id === undefined) return;
    const current = new Set(this.selectedEmpresasIds());
    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
    }
    this.selectedEmpresasIds.set(current);
  }

  isEmpresaSelected(id: number | undefined): boolean {
    return id !== undefined && this.selectedEmpresasIds().has(id);
  }

  toggleAllEmpresas(event: any): void {
    if (event.target.checked) {
      const allIds = this.empresas().map(e => e.id).filter((id): id is number => id !== undefined);
      this.selectedEmpresasIds.set(new Set(allIds));
    } else {
      this.selectedEmpresasIds.set(new Set());
    }
  }
analizar(): void {
  const procesoId = this.selectedProcesoId();
  const empresasIds = Array.from(this.selectedEmpresasIds());

  if (!procesoId || empresasIds.length === 0) return;

  this.loadingAnalisis.set(true);
  this.resultados.set([]);

  // El usuario ajusta el % (1–99); el backend espera la fracción (0.01–0.99).
  const fraccion = Math.min(0.99, Math.max(0.01, this.porcentajeSimulacion() / 100));

  const requests = empresasIds.map(empresaId =>
    this.analisisService.evaluarAnalisis({
      empresaId,
      cuadroDeObraId: procesoId,
      porcentajeSimulacion: fraccion,
    })
  );

  forkJoin(requests).subscribe({
    next: (res) => {
      this.resultados.set(res);
      this.loadingAnalisis.set(false);
    },
    error: (err) => {
      console.error('Error en el análisis:', err);
      this.loadingAnalisis.set(false);
    }
  });
}

  getEmpresaNombre(id: number): string {
    return this.empresas().find(e => e.id === id)?.razonSocial || 'Empresa no encontrada';
  }

  /**
   * Clasifica un detalle del análisis para pintarlo a partir del estado explícito
   * del backend (nunca se infiere del texto de `observacion`):
   * - 'cumple' (verde): CUMPLE.
   * - 'verificar' (ámbar): REQUIERE_VERIFICACION. Viene con `cumple=false` pero
   *   NO debe verse como incumplimiento rojo, sino como dato a confirmar.
   * - 'no-cumple' (rojo): NO_CUMPLE, incumplimiento real.
   */
  estadoDetalle(det: DetalleAnalisis): 'verificar' | 'cumple' | 'no-cumple' {
    switch (det.estado) {
      case 'CUMPLE':
        return 'cumple';
      case 'REQUIERE_VERIFICACION':
        return 'verificar';
      case 'NO_CUMPLE':
        return 'no-cumple';
      default:
        // Salvaguarda por si llegara un estado desconocido.
        return det.cumple ? 'cumple' : 'no-cumple';
    }
  }

  /** Valor a mostrar en la columna "Obtenido": "—" cuando es null/indeterminado. */
  valorObtenidoDisplay(det: DetalleAnalisis): string | number {
    return this.formatValor(det.valorObtenido);
  }

  /**
   * Formatea un valor para la tabla de resultados.
   *
   * - `null`/`undefined`/vacío => "—".
   * - Números (o strings puramente numéricos) con magnitud ≥ 1000 => notación
   *   colombiana de miles/millones con apóstrofo en los millones (1'000.000).
   * - Ratios y números pequeños (liquidez, endeudamiento, etc.) o strings con
   *   operadores/unidades ("≥ 1.5", "60%") se devuelven sin alterar.
   */
  formatValor(valor: string | number | null | undefined): string | number {
    if (valor === null || valor === undefined || valor === '') return '—';

    // Strings no numéricos (operadores, unidades, ya formateados): sin tocar.
    if (typeof valor === 'string' && !/^-?\d+(\.\d+)?$/.test(valor.trim())) {
      return valor;
    }

    const num = typeof valor === 'number' ? valor : Number(valor);
    if (Number.isNaN(num)) return valor;

    // Ratios / cantidades pequeñas: se conservan tal cual.
    if (Math.abs(num) < 1000) return valor;

    return this.formatoMillonesCO(num);
  }

  /**
   * Aplica la notación colombiana donde el separador de miles es "." y el de
   * millones es "'": 1000000 -> "1'000.000", 123456789 -> "123'456.789".
   * El monto se redondea a entero (sin decimales), igual que el resumen.
   */
  private formatoMillonesCO(valor: number): string {
    const negativo = valor < 0;
    const entero = Math.abs(Math.round(valor)).toString();

    let resultado = '';
    let enGrupo = 0;
    let separadores = 0;
    for (let i = entero.length - 1; i >= 0; i--) {
      resultado = entero[i] + resultado;
      enGrupo++;
      if (enGrupo === 3 && i > 0) {
        // Separadores alternados desde la derecha: miles ".", millones "'", etc.
        resultado = (separadores % 2 === 0 ? '.' : "'") + resultado;
        separadores++;
        enGrupo = 0;
      }
    }

    return (negativo ? '-' : '') + resultado;
  }

  /** Actualiza el % de simulación desde el control, acotado a 1–99. */
  setPorcentajeSimulacion(value: number | string): void {
    const n = Math.round(Number(value));
    if (Number.isNaN(n)) return;
    this.porcentajeSimulacion.set(Math.min(99, Math.max(1, n)));
  }
}
