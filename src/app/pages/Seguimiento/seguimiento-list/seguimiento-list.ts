import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { CuadroDeObraService } from '../../CuadroDeObra/service/cuadro-de-obra.service';
import { CuadroDeObraItem } from '../../CuadroDeObra/interface/cuadro-de-obra';
import { SeguimientoService } from '../service/seguimiento.service';
import {
  SeguimientoEvento,
  SeguimientoResponse,
  TIPO_EVENTO_META,
  TipoEvento,
} from '../interface/seguimiento';

interface ProcesoConSeguimiento {
  cuadro: CuadroDeObraItem;
  seguimiento: SeguimientoResponse | null;
  ultimoEvento: SeguimientoEvento | null;
}

const TONE_CLASSES: Record<string, { badge: string; dot: string }> = {
  info: { badge: 'bg-blue-100 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  success: { badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  warning: { badge: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  danger: { badge: 'bg-red-100 text-red-700 border-red-200', dot: 'bg-red-500' },
  neutral: { badge: 'bg-gray-100 text-gray-700 border-gray-200', dot: 'bg-gray-400' },
};

@Component({
  selector: 'app-seguimiento-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './seguimiento-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SeguimientoListComponent implements OnInit {
  private readonly cuadroService = inject(CuadroDeObraService);
  private readonly seguimientoService = inject(SeguimientoService);

  readonly loading = signal(true);
  readonly procesos = signal<ProcesoConSeguimiento[]>([]);

  // Filtros
  readonly searchTerm = signal('');
  readonly tipoFiltro = signal<TipoEvento | 'TODOS'>('TODOS');
  readonly desde = signal<string>('');
  readonly hasta = signal<string>('');

  readonly tipoOptions = Object.values(TIPO_EVENTO_META);

  readonly procesosFiltrados = computed<ProcesoConSeguimiento[]>(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const tipo = this.tipoFiltro();
    const desde = this.desde() ? new Date(this.desde()) : null;
    const hasta = this.hasta() ? new Date(this.hasta()) : null;

    return this.procesos().filter((p) => {
      // Búsqueda por texto
      if (term) {
        const texto = `${p.cuadro.entidadContratante} ${p.cuadro.numeroProceso} ${p.cuadro.descripcionObjeto}`.toLowerCase();
        if (!texto.includes(term)) return false;
      }

      // Filtro por tipo de último evento
      if (tipo !== 'TODOS') {
        if (!p.ultimoEvento || p.ultimoEvento.tipo !== tipo) return false;
      }

      // Filtro por rango de fechas (sobre fechaEvento del último evento)
      if (desde || hasta) {
        if (!p.ultimoEvento) return false;
        const fecha = new Date(p.ultimoEvento.fechaEvento);
        if (desde && fecha < desde) return false;
        if (hasta) {
          const fin = new Date(hasta);
          fin.setHours(23, 59, 59, 999);
          if (fecha > fin) return false;
        }
      }

      return true;
    });
  });

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading.set(true);
    this.cuadroService.obtenerCuadroDeObra(0, 200, 'presentadas').subscribe({
      next: (resp) => {
        const presentados = (resp.content || []).filter((c) => c.cuadroDeObraEstado === 'PRESENTADO');

        if (presentados.length === 0) {
          this.procesos.set([]);
          this.loading.set(false);
          return;
        }

        const requests = presentados.map((cuadro) =>
          this.seguimientoService.obtenerPorCuadroDeObra(cuadro.id).pipe(
            map((seg) => ({
              cuadro,
              seguimiento: seg,
              ultimoEvento: this.calcularUltimoEvento(seg.eventos),
            })),
            catchError(() =>
              of({ cuadro, seguimiento: null, ultimoEvento: null } as ProcesoConSeguimiento)
            )
          )
        );

        forkJoin(requests).subscribe({
          next: (res) => {
            this.procesos.set(res);
            this.loading.set(false);
          },
          error: () => {
            this.procesos.set(
              presentados.map((c) => ({ cuadro: c, seguimiento: null, ultimoEvento: null }))
            );
            this.loading.set(false);
          },
        });
      },
      error: () => {
        this.procesos.set([]);
        this.loading.set(false);
      },
    });
  }

  private calcularUltimoEvento(eventos: SeguimientoEvento[]): SeguimientoEvento | null {
    if (!eventos || eventos.length === 0) return null;
    return [...eventos].sort(
      (a, b) => new Date(b.fechaEvento).getTime() - new Date(a.fechaEvento).getTime()
    )[0];
  }

  badgeClasses(tipo: TipoEvento | undefined): string {
    if (!tipo) return TONE_CLASSES['neutral'].badge;
    return TONE_CLASSES[TIPO_EVENTO_META[tipo].tone].badge;
  }

  dotClasses(tipo: TipoEvento | undefined): string {
    if (!tipo) return TONE_CLASSES['neutral'].dot;
    return TONE_CLASSES[TIPO_EVENTO_META[tipo].tone].dot;
  }

  tipoLabel(tipo: TipoEvento | undefined): string {
    return tipo ? TIPO_EVENTO_META[tipo].label : 'Sin eventos';
  }

  tipoIcon(tipo: TipoEvento | undefined): string {
    return tipo ? TIPO_EVENTO_META[tipo].icon : 'bx-time-five';
  }

  resetFiltros(): void {
    this.searchTerm.set('');
    this.tipoFiltro.set('TODOS');
    this.desde.set('');
    this.hasta.set('');
  }

  hayFiltrosActivos(): boolean {
    return !!this.searchTerm() || this.tipoFiltro() !== 'TODOS' || !!this.desde() || !!this.hasta();
  }
}
