import { Component, OnInit, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Subject, debounceTime } from 'rxjs';
import { ModernTable, TableColumn, TableData } from '../../../components/modern-table/modern-table';
import { Pagination } from '../../../components/pagination/pagination';
import { AddToCuadroModal } from '../../../components/add-to-cuadro-modal/add-to-cuadro-modal';
import { LicitacionesService } from '../service/licitaciones.service';
import { RevisionLicitacionService } from '../service/revision-licitacion.service';
import { FiltrosLicitaciones, Licitacion } from '../interface/licitaciones';
import { SMMLV_VIGENTE } from '../../../services/smmlv';
import { CuadroDeObraService } from '../../CuadroDeObra/service/cuadro-de-obra.service';
import { CuadroDeObraItem, CuadroDeObraRef } from '../../CuadroDeObra/interface/cuadro-de-obra';
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
  private readonly revisionService = inject(RevisionLicitacionService);
  private readonly cuadroService = inject(CuadroDeObraService);
  private readonly alertService = inject(AlertService);

  // --- CONFIGURACIÓN DE LA TABLA ---
  columnasLicitaciones: TableColumn[] = [
    { key: 'numero', label: 'Número Proceso', width: '180px' },
    { key: 'entidad', label: 'Entidad', width: '250px' },
    { key: 'objeto', label: 'Objeto', width: '450px' },
    { key: 'ubicacion', label: 'Ubicación', width: '200px' },
    { key: 'cuantia', label: 'Cuantía', type: 'currency', width: '150px' },
    { key: 'fechaPublicacion', label: 'Fecha Pub.', type: 'date', width: '150px' },
    { key: 'fechaCierre', label: 'Cierre', type: 'date', width: '150px' },
    { key: 'fase', label: 'Fase', width: '210px' },
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

  // --- FILTROS (todos server-side; el backend los traduce a SoQL) ---
  filtroEntidad = signal('');
  filtroDepartamento = signal('');
  /**
   * Presupuesto en SMMLV, que es como lo piensa el licitador: los rangos de la Matriz 2 estan
   * definidos en esa unidad. Al backend viaja convertido a pesos.
   */
  presupuestoMinSmmlv = signal<number | null>(null);
  presupuestoMaxSmmlv = signal<number | null>(null);
  /** Oculta los procesos con la fecha de cierre ya vencida: cerca del 30% del listado. */
  soloVigentes = signal(false);
  orden = signal<'PUBLICACION' | 'CIERRE'>('PUBLICACION');
  /** Opciones del desplegable, tal como las escribe SECOP. */
  departamentos = signal<string[]>([]);

  /** Debounce solo para lo que se escribe; los selects y el interruptor recargan al instante. */
  private readonly filtroTexto$ = new Subject<void>();

  // --- CRUCE CON EL CUADRO DE OBRA (idDelProceso -> id) ---
  refs = signal<Map<string, number>>(new Map());

  // --- FILAS "REVISADAS" (compartidas por el equipo, por idDelProceso) ---
  revisados = signal<Set<string>>(new Set());

  // --- ESTADO DEL MODAL CON SIGNALS ---
  showModal = signal(false);
  selectedLicitacion = signal<Licitacion | null>(null);
  modalExistente = signal<CuadroDeObraItem | null>(null);
  modalReadonly = signal(false);

  constructor() {
    // Reinicia a la primera página y recarga cuando cambia lo que se está escribiendo.
    this.filtroTexto$
      .pipe(debounceTime(350), takeUntilDestroyed())
      .subscribe(() => this.aplicarFiltros());
  }

  ngOnInit(): void {
    this.loadLicitaciones();
    this.loadRefs();
    this.loadRevisiones();
    this.loadDepartamentos();
  }

  /** Si SECOP no responde, el desplegable queda vacío y los demás filtros siguen sirviendo. */
  private loadDepartamentos(): void {
    this.licitacionesService.obtenerDepartamentos().subscribe({
      next: (deptos) => this.departamentos.set(deptos),
      error: (err) => console.error('No se pudieron cargar los departamentos:', err),
    });
  }

  /** Criterios actuales. El presupuesto se convierte de SMMLV a pesos, que es lo que espera la API. */
  private filtrosActuales(): FiltrosLicitaciones {
    const min = this.presupuestoMinSmmlv();
    const max = this.presupuestoMaxSmmlv();
    return {
      entidad: this.filtroEntidad(),
      departamento: this.filtroDepartamento(),
      presupuestoMin: min != null ? Math.round(min * SMMLV_VIGENTE) : null,
      presupuestoMax: max != null ? Math.round(max * SMMLV_VIGENTE) : null,
      soloVigentes: this.soloVigentes(),
      orden: this.orden(),
    };
  }

  /** Cualquier cambio de filtro vuelve a la página 1: la anterior ya no significa lo mismo. */
  aplicarFiltros(): void {
    this.currentPage.set(1);
    this.loadLicitaciones();
  }

  limpiarFiltros(): void {
    this.filtroEntidad.set('');
    this.filtroDepartamento.set('');
    this.presupuestoMinSmmlv.set(null);
    this.presupuestoMaxSmmlv.set(null);
    this.soloVigentes.set(false);
    this.orden.set('PUBLICACION');
    this.aplicarFiltros();
  }

  readonly hayFiltrosActivos = computed(
    () =>
      !!this.filtroEntidad() ||
      !!this.filtroDepartamento() ||
      this.presupuestoMinSmmlv() != null ||
      this.presupuestoMaxSmmlv() != null ||
      this.soloVigentes() ||
      this.orden() !== 'PUBLICACION'
  );

  loadLicitaciones(): void {
    this.loading.set(true);
    const apiPage = this.currentPage() - 1;

    this.licitacionesService
      .obtenerLicitacionesObraPublica(apiPage, this.pageSize(), this.filtrosActuales())
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

  /**
   * Carga los procesos ya presentes en el Cuadro de Obra para el resaltado (RF1/RF2).
   * Los procesos sin idDelProceso se descartan: se cargaron a mano, no existen en SECOP
   * y por tanto no pueden corresponder a ninguna fila de esta tabla.
   */
  private loadRefs(): void {
    this.cuadroService.obtenerRefs().subscribe({
      next: (refs) =>
        this.refs.set(
          new Map(
            refs
              .filter((r): r is CuadroDeObraRef & { idDelProceso: string } => !!r.idDelProceso)
              .map((r) => [r.idDelProceso, r.id]),
          ),
        ),
      error: (err) => {
        console.error('No se pudieron cargar las referencias del Cuadro de Obra:', err);
        this.refs.set(new Map());
      },
    });
  }

  /** Carga el conjunto compartido de licitaciones revisadas (RF2). */
  private loadRevisiones(): void {
    this.revisionService.obtenerRevisiones().subscribe({
      next: (ids) => this.revisados.set(new Set(ids)),
      error: (err) => {
        console.error('No se pudieron cargar las licitaciones revisadas:', err);
        this.revisados.set(new Set());
      },
    });
  }

  onEntidadInput(value: string): void {
    this.filtroEntidad.set(value);
    this.filtroTexto$.next();
  }

  onPresupuestoInput(cota: 'min' | 'max', value: string): void {
    const numero = value.trim() === '' ? null : Number(value);
    const limpio = numero != null && Number.isFinite(numero) && numero >= 0 ? numero : null;
    if (cota === 'min') {
      this.presupuestoMinSmmlv.set(limpio);
    } else {
      this.presupuestoMaxSmmlv.set(limpio);
    }
    this.filtroTexto$.next();
  }

  onDepartamentoChange(value: string): void {
    this.filtroDepartamento.set(value);
    this.aplicarFiltros();
  }

  onOrdenChange(value: string): void {
    this.orden.set(value === 'CIERRE' ? 'CIERRE' : 'PUBLICACION');
    this.aplicarFiltros();
  }

  onSoloVigentesChange(value: boolean): void {
    this.soloVigentes.set(value);
    this.aplicarFiltros();
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
    const id = (row as Licitacion).idDelProceso;
    if (this.refs().has(id)) return 'bg-green-50 hover:bg-green-100';
    if (this.revisados().has(id)) return 'bg-amber-50 hover:bg-amber-100';
    return '';
  };

  onActionClicked(event: { column: TableColumn; row: TableData }): void {
    const licitacion = event.row as Licitacion;

    if (event.column.key === 'revisar') {
      this.toggleRevisado(licitacion.idDelProceso);
      return;
    }

    // Columna "Cuadro": si ya está agregada, se abre en modo lectura; si no, editable.
    const cuadroId = this.refs().get(licitacion.idDelProceso);
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
    const idDelProceso = this.selectedLicitacion()?.idDelProceso;
    if (idDelProceso && response?.id != null) {
      const map = new Map(this.refs());
      map.set(idDelProceso, response.id);
      this.refs.set(map);
    }
    this.showModal.set(false);
  }

  /**
   * Alterna la marca "Revisado" (compartida). Actualiza el set de inmediato (optimista)
   * y persiste en el servidor; si el HTTP falla, revierte y avisa, para no dejar en
   * pantalla un estado que no llegó a guardarse.
   */
  toggleRevisado(idDelProceso: string): void {
    if (!idDelProceso) return;

    const estabaRevisada = this.revisados().has(idDelProceso);
    const set = new Set(this.revisados());
    if (estabaRevisada) {
      set.delete(idDelProceso);
    } else {
      set.add(idDelProceso);
    }
    this.revisados.set(set);

    const peticion$ = estabaRevisada
      ? this.revisionService.desmarcarRevisada(idDelProceso)
      : this.revisionService.marcarRevisada(idDelProceso);

    peticion$.subscribe({
      error: (err) => {
        console.error('No se pudo actualizar el estado de revisión:', err);
        // Revertir al estado previo.
        const revert = new Set(this.revisados());
        if (estabaRevisada) {
          revert.add(idDelProceso);
        } else {
          revert.delete(idDelProceso);
        }
        this.revisados.set(revert);
        this.alertService.error('No se pudo guardar la marca de revisión. Intenta de nuevo.');
      },
    });
  }
}
