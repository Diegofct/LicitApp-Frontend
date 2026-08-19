import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CuadroDeObraService } from '../../CuadroDeObra/service/cuadro-de-obra.service';
import { CuadroDeObraItem } from '../../CuadroDeObra/interface/cuadro-de-obra';
import { ConformacionProponenteService } from '../../Conformacion/service/conformacion.service';
import { ConformacionResponse, IntegranteResponse } from '../../Conformacion/interface/conformacion';
import { EmpresaService } from '../../Empresa/service/empresa.service';
import { Empresa } from '../../Empresa/interface/empresa';
import { LicitacionesService } from '../../Licitaciones/service/licitaciones.service';
import { SeguimientoService } from '../service/seguimiento.service';
import {
  SeguimientoEvento,
  SeguimientoResponse,
  TIPO_EVENTO_META,
  TipoEvento,
} from '../interface/seguimiento';
import { RegistrarEventoModal } from '../../../components/registrar-evento-modal/registrar-evento-modal';
import { AlertService } from '../../../services/alert.service';

interface EventoExtendido extends SeguimientoEvento {
  meta: typeof TIPO_EVENTO_META[TipoEvento];
  isFuturo: boolean;
}

const TONE_CLASSES: Record<string, { badgeBg: string; badgeText: string; iconBg: string; iconText: string; line: string; border: string }> = {
  info: {
    badgeBg: 'bg-blue-100', badgeText: 'text-blue-700',
    iconBg: 'bg-blue-500', iconText: 'text-white',
    line: 'bg-blue-200', border: 'border-blue-200',
  },
  success: {
    badgeBg: 'bg-emerald-100', badgeText: 'text-emerald-700',
    iconBg: 'bg-emerald-500', iconText: 'text-white',
    line: 'bg-emerald-200', border: 'border-emerald-200',
  },
  warning: {
    badgeBg: 'bg-amber-100', badgeText: 'text-amber-700',
    iconBg: 'bg-amber-500', iconText: 'text-white',
    line: 'bg-amber-200', border: 'border-amber-200',
  },
  danger: {
    badgeBg: 'bg-red-100', badgeText: 'text-red-700',
    iconBg: 'bg-red-500', iconText: 'text-white',
    line: 'bg-red-200', border: 'border-red-200',
  },
  neutral: {
    badgeBg: 'bg-gray-100', badgeText: 'text-gray-700',
    iconBg: 'bg-gray-400', iconText: 'text-white',
    line: 'bg-gray-200', border: 'border-gray-200',
  },
};

@Component({
  selector: 'app-seguimiento-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, RegistrarEventoModal],
  templateUrl: './seguimiento-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SeguimientoDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly cuadroService = inject(CuadroDeObraService);
  private readonly seguimientoService = inject(SeguimientoService);
  private readonly licitacionesService = inject(LicitacionesService);
  private readonly conformacionService = inject(ConformacionProponenteService);
  private readonly empresaService = inject(EmpresaService);
  private readonly alertService = inject(AlertService);

  readonly cuadroId = signal<number | null>(null);
  readonly loading = signal(true);
  readonly cuadro = signal<CuadroDeObraItem | null>(null);
  readonly seguimiento = signal<SeguimientoResponse | null>(null);
  readonly conformacion = signal<ConformacionResponse | null>(null);
  readonly empresas = signal<Empresa[]>([]);
  readonly showRegistrar = signal(false);
  /** Enlace al proceso en SECOP II, para revisar en qué evento va. */
  readonly urlProceso = signal<string | null>(null);

  readonly eventosOrdenados = computed<EventoExtendido[]>(() => {
    const seg = this.seguimiento();
    if (!seg) return [];
    const now = Date.now();
    return [...seg.eventos]
      .sort((a, b) => new Date(a.fechaEvento).getTime() - new Date(b.fechaEvento).getTime())
      .map((e) => ({
        ...e,
        meta: TIPO_EVENTO_META[e.tipo],
        isFuturo: new Date(e.fechaEvento).getTime() > now,
      }));
  });

  readonly ultimoEvento = computed<EventoExtendido | null>(() => {
    const arr = this.eventosOrdenados();
    if (arr.length === 0) return null;
    const pasados = arr.filter((e) => !e.isFuturo);
    return pasados.length > 0 ? pasados[pasados.length - 1] : arr[0];
  });

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = Number(params.get('id'));
      if (!Number.isNaN(id) && id > 0) {
        this.cuadroId.set(id);
        this.cargarTodo(id);
      }
    });
  }

  private cargarTodo(id: number): void {
    this.loading.set(true);
    forkJoin({
      cuadro: this.cuadroService.obtenerCuadroDeObraPorId(id),
      seguimiento: this.seguimientoService.obtenerPorCuadroDeObra(id).pipe(
        catchError((err: HttpErrorResponse) => of(null))
      ),
      conformacion: this.conformacionService.obtenerPorCuadroDeObra(id).pipe(
        catchError(() => of(null))
      ),
      empresas: this.empresaService.listarEmpresas().pipe(
        catchError(() => of([] as Empresa[]))
      ),
    }).subscribe({
      next: ({ cuadro, seguimiento, conformacion, empresas }) => {
        this.cuadro.set(cuadro);
        this.cargarUrlProceso(cuadro);
        this.seguimiento.set(seguimiento);
        this.conformacion.set(conformacion);
        this.empresas.set(empresas);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.alertService.error('No se pudo cargar el detalle del proceso.');
      },
    });
  }

  /**
   * Resuelve el enlace al proceso en SECOP II. Va fuera del forkJoin porque depende del cuadro
   * ya cargado, y así tampoco retrasa el pintado de la pantalla. Los cuadros dados de alta a
   * mano no tienen identificador SECOP: en ese caso no se muestra el enlace.
   */
  private cargarUrlProceso(cuadro: CuadroDeObraItem): void {
    if (!cuadro.idDelProceso) return;

    this.licitacionesService.obtenerUrlProceso(cuadro.idDelProceso).subscribe({
      next: (res) => this.urlProceso.set(res.url),
      error: (err) => console.error('Error al resolver la URL del proceso en SECOP:', err),
    });
  }

  refrescarSeguimiento(): void {
    const id = this.cuadroId();
    if (!id) return;
    this.seguimientoService.obtenerPorCuadroDeObra(id).subscribe({
      next: (seg) => this.seguimiento.set(seg),
      error: () => {},
    });
  }

  onEventoRegistrado(): void {
    this.showRegistrar.set(false);
    this.refrescarSeguimiento();
  }

  // ===== Helpers de estilo =====
  tone(tipo: TipoEvento): typeof TONE_CLASSES[string] {
    return TONE_CLASSES[TIPO_EVENTO_META[tipo].tone];
  }

  /**
   * Nombre a mostrar para un integrante del consorcio. Prioriza el
   * `nombreEmpresa` del backend; si no llega, lo resuelve desde la lista de
   * empresas por `empresaId`. Así evitamos el "?" cuando la respuesta no
   * incluye el nombre.
   */
  nombreIntegrante(integrante: IntegranteResponse): string {
    if (integrante.nombreEmpresa?.trim()) return integrante.nombreEmpresa;
    const empresa = this.empresas().find((e) => e.id === integrante.empresaId);
    return empresa?.razonSocial ?? `Empresa #${integrante.empresaId}`;
  }

  iniciales(razonSocial: string): string {
    if (!razonSocial) return '?';
    return razonSocial
      .split(/\s+/)
      .filter((w) => w.length > 0)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('');
  }

  tipoLabel(tipo: TipoEvento): string {
    return TIPO_EVENTO_META[tipo].label;
  }
}
