import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Pagination } from '../../../components/pagination/pagination';
import { AlertService } from '../../../services/alert.service';
import { ResultadosService } from '../service/resultados.service';
import {
  EstadoResultado,
  HistorialSort,
  HistorialSortableField,
  ItemHistorialResultado,
  ResumenResultados,
} from '../interface/resultados';

interface EstadoBadge {
  label: string;
  classes: string;
  dot: string;
  icon: string;
}

const ESTADO_BADGES: Record<EstadoResultado, EstadoBadge> = {
  ADJUDICADO: {
    label: 'Adjudicado',
    classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
    icon: 'bx-trophy',
  },
  NO_ADJUDICADO: {
    label: 'No adjudicado',
    classes: 'bg-red-50 text-red-700 border-red-200',
    dot: 'bg-red-500',
    icon: 'bx-x-circle',
  },
};

@Component({
  selector: 'app-resultados',
  standalone: true,
  imports: [CommonModule, FormsModule, Pagination],
  templateUrl: './resultados.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Resultados implements OnInit {
  private readonly resultadosService = inject(ResultadosService);
  private readonly alertService = inject(AlertService);

  // --- KPIs ---
  readonly resumen = signal<ResumenResultados | null>(null);
  readonly loadingResumen = signal(true);

  // --- Historial ---
  readonly historial = signal<ItemHistorialResultado[]>([]);
  readonly loadingHistorial = signal(true);

  readonly currentPage = signal(1);
  readonly pageSize = signal(10);
  readonly totalPages = signal(1);
  readonly totalElements = signal(0);

  readonly sort = signal<HistorialSort>({ field: 'fechaCierre', direction: 'desc' });

  // --- Modal observación ---
  readonly observacionSeleccionada = signal<ItemHistorialResultado | null>(null);

  // --- Tasa de éxito helpers (SVG circular progress) ---
  readonly tasaExito = computed(() => this.resumen()?.tasaExitoPorcentaje ?? 0);

  readonly circleCircumference = 2 * Math.PI * 52;
  readonly circleOffset = computed(() => {
    const pct = Math.min(100, Math.max(0, this.tasaExito()));
    return this.circleCircumference * (1 - pct / 100);
  });

  ngOnInit(): void {
    this.cargarResumen();
    this.cargarHistorial();
  }

  // ============================================================
  // Carga de datos
  // ============================================================
  cargarResumen(): void {
    this.loadingResumen.set(true);
    this.resultadosService.obtenerResumen().subscribe({
      next: (res) => {
        this.resumen.set(res);
        this.loadingResumen.set(false);
      },
      error: () => {
        this.loadingResumen.set(false);
        this.alertService.error('No fue posible cargar el resumen de resultados.');
      },
    });
  }

  cargarHistorial(): void {
    this.loadingHistorial.set(true);
    const apiPage = this.currentPage() - 1;

    this.resultadosService
      .obtenerHistorial(apiPage, this.pageSize(), this.sort())
      .subscribe({
        next: (res) => {
          this.historial.set(res.content ?? []);
          this.totalPages.set(res.totalPages ?? 0);
          this.totalElements.set(res.totalElements ?? 0);
          this.loadingHistorial.set(false);
        },
        error: () => {
          this.historial.set([]);
          this.totalPages.set(0);
          this.totalElements.set(0);
          this.loadingHistorial.set(false);
          this.alertService.error('No fue posible cargar el historial de procesos.');
        },
      });
  }

  // ============================================================
  // Paginación / ordenamiento
  // ============================================================
  onPageChange(newPage: number): void {
    this.currentPage.set(newPage);
    this.cargarHistorial();
  }

  toggleSort(field: HistorialSortableField): void {
    const current = this.sort();
    const direction =
      current.field === field ? (current.direction === 'asc' ? 'desc' : 'asc') : 'desc';
    this.sort.set({ field, direction });
    this.currentPage.set(1);
    this.cargarHistorial();
  }

  isSortedBy(field: HistorialSortableField): boolean {
    return this.sort().field === field;
  }

  sortIcon(field: HistorialSortableField): string {
    if (!this.isSortedBy(field)) return 'bx-sort-alt-2';
    return this.sort().direction === 'asc' ? 'bx-sort-up' : 'bx-sort-down';
  }

  // ============================================================
  // Helpers de UI
  // ============================================================
  badge(estado: EstadoResultado): EstadoBadge {
    return ESTADO_BADGES[estado];
  }

  abrirObservacion(item: ItemHistorialResultado): void {
    if (!item.observacion) return;
    this.observacionSeleccionada.set(item);
  }

  cerrarObservacion(): void {
    this.observacionSeleccionada.set(null);
  }

  trackById(_index: number, item: ItemHistorialResultado): number {
    return item.id;
  }
}
