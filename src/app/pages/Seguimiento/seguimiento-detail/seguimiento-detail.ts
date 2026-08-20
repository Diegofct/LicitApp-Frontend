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
import { EstadoProceso } from '../../Licitaciones/interface/licitaciones';
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
  /**
   * Fase y desenlace del proceso segun SECOP. Se resuelve en vivo contra la API: no hay nada
   * guardado, asi que tambien funciona con los seguimientos que ya existian.
   */
  readonly estadoProceso = signal<EstadoProceso | null>(null);
  /** Enlace al proceso en SECOP II, para revisar en qué evento va. */
  readonly urlProceso = computed(() => this.estadoProceso()?.url ?? null);
  /** Evita doble clic mientras se aplica el resultado al cuadro. */
  readonly aplicandoResultado = signal(false);

  /**
   * El desenlace solo se ofrece si SECOP dice que el proceso ya se adjudico y el cuadro sigue
   * en PRESENTADO: son las unicas transiciones que el backend acepta desde ahi.
   */
  readonly puedeAplicarResultado = computed(() => {
    const estado = this.estadoProceso();
    return !!estado?.adjudicado && this.cuadro()?.cuadroDeObraEstado === 'PRESENTADO';
  });

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
        this.cargarEstadoProceso(cuadro);
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
   * Resuelve la fase y el desenlace del proceso en SECOP II. Va fuera del forkJoin porque
   * depende del cuadro ya cargado, y así tampoco retrasa el pintado de la pantalla. Los
   * cuadros dados de alta a mano no tienen identificador SECOP: ahí no se muestra el bloque.
   */
  private cargarEstadoProceso(cuadro: CuadroDeObraItem): void {
    if (!cuadro.idDelProceso) return;

    this.licitacionesService.obtenerEstadoProceso(cuadro.idDelProceso).subscribe({
      next: (estado) => this.estadoProceso.set(estado),
      error: (err) => console.error('Error al resolver el estado del proceso en SECOP:', err),
    });
  }

  /**
   * Cierra el cuadro con lo que SECOP publica. Lo decide el analista, no la aplicación: el
   * ganador solo se puede cruzar por nombre —SECOP publica el NIT inservible en más de la
   * mitad de los casos— y marcar como perdido un proceso ganado ensuciaría la tasa de éxito.
   *
   * El evento que queda es RESOLUCION_ADJUDICACION en ambos casos: el proceso se adjudicó,
   * lo que cambia es a quién. DECLARATORIA_DESIERTA sería otra cosa y no se deduce de aquí.
   */
  aplicarResultado(nuevoEstado: 'ADJUDICADO' | 'NO_ADJUDICADO'): void {
    const id = this.cuadroId();
    const estado = this.estadoProceso();
    if (!id || !estado || this.aplicandoResultado()) return;

    this.aplicandoResultado.set(true);
    this.cuadroService.actualizarEstado(id, nuevoEstado).subscribe({
      next: (actualizado) => {
        this.cuadro.set(actualizado);
        this.seguimientoService
          .registrarEvento(id, {
            tipo: 'RESOLUCION_ADJUDICACION',
            fechaEvento: this.fechaDeAdjudicacion(estado),
            descripcion: this.descripcionDelResultado(estado, nuevoEstado),
          })
          .subscribe({
            next: () => {
              this.aplicandoResultado.set(false);
              this.refrescarSeguimiento();
              this.alertService.success('Resultado aplicado y evento registrado.');
            },
            error: () => {
              // El estado del cuadro sí quedó guardado: se avisa para no dejarlo a medias.
              this.aplicandoResultado.set(false);
              this.alertService.warning(
                'El estado del cuadro se actualizó, pero no se pudo registrar el evento.'
              );
            },
          });
      },
      error: () => {
        this.aplicandoResultado.set(false);
        this.alertService.error('No se pudo actualizar el estado del cuadro.');
      },
    });
  }

  /** Fecha en que SECOP adjudicó; si no la publica, se registra el evento con la de hoy. */
  private fechaDeAdjudicacion(estado: EstadoProceso): string {
    const fecha = estado.adjudicaciones.find((a) => a.fecha)?.fecha;
    return fecha ? `${fecha}T00:00:00` : new Date().toISOString().slice(0, 19);
  }

  private descripcionDelResultado(
    estado: EstadoProceso,
    nuevoEstado: 'ADJUDICADO' | 'NO_ADJUDICADO'
  ): string {
    const ganadores = estado.adjudicaciones.map((a) => a.proveedor).join(', ');
    const cabeza =
      nuevoEstado === 'ADJUDICADO'
        ? 'Proceso adjudicado a nuestra propuesta.'
        : 'Proceso adjudicado a otro proponente.';
    const detalle = ganadores ? ` Según SECOP II: ${ganadores}.` : '';
    const competencia =
      estado.numeroDeOferentes && estado.numeroDeOferentes > 0
        ? ` Se presentaron ${estado.numeroDeOferentes} oferentes.`
        : '';
    return `${cabeza}${detalle}${competencia}`;
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
