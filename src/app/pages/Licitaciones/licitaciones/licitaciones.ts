import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { ModernTable, TableColumn, TableData } from '../../../components/modern-table/modern-table';
import { Pagination } from '../../../components/pagination/pagination';
import { AddToCuadroModal } from '../../../components/add-to-cuadro-modal/add-to-cuadro-modal';
import { LicitacionesService } from '../service/licitaciones.service';
import { Licitacion } from '../interface/licitaciones';
import { CuadroDeObraService } from '../../CuadroDeObra/service/cuadro-de-obra.service';
import { CuadroDeObraItem } from '../../CuadroDeObra/interface/cuadro-de-obra';
import { AlertService } from '../../../services/alert.service';

@Component({
  selector: 'app-licitaciones',
  standalone: true,
  imports: [CommonModule, ModernTable, Pagination, AddToCuadroModal],
  templateUrl: './licitaciones.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Licitaciones implements OnInit {
  private readonly licitacionesService = inject(LicitacionesService);
  private readonly cuadroService = inject(CuadroDeObraService);
  private readonly alertService = inject(AlertService);

  private readonly REVISADOS_KEY = 'licitaciones:revisados';

  // --- CONFIGURACIÓN DE LA TABLA ---
  columnasLicitaciones: TableColumn[] = [
    { key: 'numero', label: 'Número Proceso', width: '180px' },
    { key: 'entidad', label: 'Entidad', width: '250px' },
    { key: 'objeto', label: 'Objeto', width: '450px' },
    { key: 'ubicacion', label: 'Ubicación', width: '200px' },
    { key: 'cuantia', label: 'Cuantía', type: 'currency', width: '150px' },
    { key: 'fechaPublicacion', label: 'Fecha Pub.', type: 'date', width: '150px' },
    { key: 'urlSecop', label: 'URL', type: 'link', width: '100px' },
    { key: 'acciones', label: 'Cuadro', type: 'action', actionIcon: 'bx bx-plus-circle', width: '90px' },
    { key: 'revisar', label: 'Revisado', type: 'action', actionIcon: 'bx bx-bookmark', width: '90px' },
  ];

  // --- ESTADO DE LA PAGINACIÓN CON SIGNALS ---
  currentPage = signal(1);
  pageSize = signal(10);
  totalPages = signal(1);
  totalElements = signal(0);

  // --- DATOS CON SIGNALS ---
  datosLicitaciones = signal<Licitacion[]>([]);
  loading = signal(false);

  // --- FILTRO POR ENTIDAD (server-side, con debounce) ---
  filtroEntidad = signal('');
  private readonly entidadInput$ = new Subject<string>();

  // --- CRUCE CON EL CUADRO DE OBRA (numeroProceso -> id) ---
  refs = signal<Map<string, number>>(new Map());

  // --- FILAS "REVISADAS" (persistidas en localStorage) ---
  revisados = signal<Set<string>>(this.loadRevisados());

  // --- ESTADO DEL MODAL CON SIGNALS ---
  showModal = signal(false);
  selectedLicitacion = signal<Licitacion | null>(null);
  modalExistente = signal<CuadroDeObraItem | null>(null);
  modalReadonly = signal(false);

  constructor() {
    // Reinicia a la primera página y recarga al cambiar el filtro de entidad.
    this.entidadInput$
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((value) => {
        this.filtroEntidad.set(value);
        this.currentPage.set(1);
        this.loadLicitaciones();
      });
  }

  ngOnInit(): void {
    this.loadLicitaciones();
    this.loadRefs();
  }

  loadLicitaciones(): void {
    this.loading.set(true);
    const apiPage = this.currentPage() - 1;

    this.licitacionesService
      .obtenerLicitacionesObraPublica(apiPage, this.pageSize(), this.filtroEntidad())
      .subscribe({
        next: (response) => {
          this.datosLicitaciones.set(response.content);
          this.totalPages.set(response.totalPages);
          this.totalElements.set(response.totalElements);
          this.loading.set(false);

          // Hacemos scroll al inicio de la página para mejorar la UX
          window.scrollTo({ top: 0, behavior: 'smooth' });
          const mainContent = document.querySelector('main');
          if (mainContent) {
            mainContent.scrollTo({ top: 0, behavior: 'smooth' });
          }
        },
        error: (err) => {
          console.error('Ha ocurrido un error al obtener las licitaciones:', err);
          this.datosLicitaciones.set([]);
          this.totalPages.set(1);
          this.currentPage.set(1);
          this.totalElements.set(0);
          this.loading.set(false);
        },
      });
  }

  /** Carga los procesos ya presentes en el Cuadro de Obra para el resaltado (RF1/RF2). */
  private loadRefs(): void {
    this.cuadroService.obtenerRefs().subscribe({
      next: (refs) => this.refs.set(new Map(refs.map((r) => [r.numeroProceso, r.id]))),
      error: (err) => {
        console.error('No se pudieron cargar las referencias del Cuadro de Obra:', err);
        this.refs.set(new Map());
      },
    });
  }

  onEntidadInput(value: string): void {
    this.entidadInput$.next(value);
  }

  onPageChange(newPage: number): void {
    this.currentPage.set(newPage);
    this.loadLicitaciones();
  }

  /**
   * Clase de fondo por fila (RF1/RF3). "Agregada al Cuadro de Obra" (verde) tiene
   * prioridad sobre "revisada" (ámbar) cuando ambas condiciones coinciden.
   */
  rowClass = (row: TableData): string => {
    const numero = (row as Licitacion).numero;
    if (this.refs().has(numero)) return 'bg-green-50 hover:bg-green-100';
    if (this.revisados().has(numero)) return 'bg-amber-50 hover:bg-amber-100';
    return '';
  };

  onActionClicked(event: { column: TableColumn; row: TableData }): void {
    const licitacion = event.row as Licitacion;

    if (event.column.key === 'revisar') {
      this.toggleRevisado(licitacion.numero);
      return;
    }

    // Columna "Cuadro": si ya está agregada, se abre en modo lectura; si no, editable.
    const cuadroId = this.refs().get(licitacion.numero);
    if (cuadroId != null) {
      this.abrirDetalleExistente(licitacion, cuadroId);
    } else {
      this.selectedLicitacion.set(licitacion);
      this.modalExistente.set(null);
      this.modalReadonly.set(false);
      this.showModal.set(true);
    }
  }

  private abrirDetalleExistente(licitacion: Licitacion, cuadroId: number): void {
    this.cuadroService.obtenerCuadroDeObraPorId(cuadroId).subscribe({
      next: (item) => {
        this.selectedLicitacion.set(licitacion);
        this.modalExistente.set(item);
        this.modalReadonly.set(true);
        this.showModal.set(true);
      },
      error: (err) => {
        console.error('No se pudo cargar el detalle del Cuadro de Obra:', err);
        this.alertService.error('No se pudo cargar el detalle del proceso.');
      },
    });
  }

  onModalSaved(response: CuadroDeObraItem): void {
    // Nos quedamos en la tabla y marcamos la fila como "agregada" al instante (CA3).
    const numero = this.selectedLicitacion()?.numero;
    if (numero && response?.id != null) {
      const map = new Map(this.refs());
      map.set(numero, response.id);
      this.refs.set(map);
    }
    this.showModal.set(false);
  }

  toggleRevisado(numero: string): void {
    const set = new Set(this.revisados());
    if (set.has(numero)) {
      set.delete(numero);
    } else {
      set.add(numero);
    }
    this.revisados.set(set);
    try {
      localStorage.setItem(this.REVISADOS_KEY, JSON.stringify([...set]));
    } catch (e) {
      console.error('No se pudo persistir el estado de revisión:', e);
    }
  }

  private loadRevisados(): Set<string> {
    try {
      const raw = localStorage.getItem(this.REVISADOS_KEY);
      return new Set(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      return new Set();
    }
  }
}
