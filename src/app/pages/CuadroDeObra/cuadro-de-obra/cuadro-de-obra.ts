import { Component, OnInit, inject, signal, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Tab, Tabs } from '../../../components/tabs/tabs';
import { ModernTable, TableColumn, TableData } from '../../../components/modern-table/modern-table';
import { Pagination } from '../../../components/pagination/pagination';
import { CuadroDeObraService } from '../service/cuadro-de-obra.service';
import { CuadroDeObraItem } from '../interface/cuadro-de-obra';
import { AlertService } from '../../../services/alert.service';
import { EditCuadroModal } from '../../../components/edit-cuadro-modal/edit-cuadro-modal';
import { AddProcesoModal } from '../../../components/add-proceso-modal/add-proceso-modal';
import { RequisitoLicitacionModal } from '../../../components/requisito-licitacion-modal/requisito-licitacion-modal';
import { AnalizarPliegoModal } from '../../../components/analizar-pliego-modal/analizar-pliego-modal';

@Component({
  selector: 'app-cuadro-de-obra',
  standalone: true,
  imports: [
    CommonModule,
    Tabs,
    ModernTable,
    Pagination,
    EditCuadroModal,
    AddProcesoModal,
    RequisitoLicitacionModal,
    AnalizarPliegoModal,
  ],
  templateUrl: './cuadro-de-obra.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CuadroDeObra implements OnInit {
  private readonly cuadroDeObraService = inject(CuadroDeObraService);
  private readonly alertService = inject(AlertService);

  tabs: Tab[] = [
    { id: 'por-presentar', label: 'Por Presentar', icon: 'bx bx-time-five' },
    { id: 'presentadas', label: 'Presentadas', icon: 'bx bx-check-double' },
  ];

  activeTabId = signal('por-presentar');

  baseColumnas: TableColumn[] = [
    { key: 'entidadContratante', label: 'Entidad', width: '200px' },
    { key: 'numeroProceso', label: 'N° Proceso', width: '150px' },
    { key: 'descripcionObjeto', label: 'Objeto', width: '450px' },
    { key: 'estadoProceso', label: 'Estado Proceso', width: '250px' },
    { key: 'fechaPublicacion', label: 'Fecha Publicación', type: 'date', width: '200px' },
    { key: 'fechaCierre', label: 'Fecha Cierre', type: 'datetime', width: '200px' },
    { key: 'monto', label: 'Presupuesto', type: 'currency', width: '150px' },
    { key: 'valorSMMLV', label: 'Valor SMMLV', width: '120px' },
    { key: 'tipoProyecto', label: 'Tipo Proyecto', width: '150px' },
    { key: 'departamento', label: 'Departamento', width: '150px' },
    { key: 'municipio', label: 'Municipio', width: '150px' },
    { key: 'experiencia', label: 'Experiencia', width: '400px' },
    { key: 'plazo', label: 'Plazo', width: '120px' },
    { key: 'anticipo', label: 'Anticipo', width: '120px' },
    { key: 'observacion', label: 'Observaciones', width: '350px' },
    { key: 'cuadroDeObraEstado', label: 'Estado', type: 'badge', width: '150px' },
    // (RF1) Marca "nos presentamos": cicla sin marca → Sí → No; el color/ícono refleja el estado.
    {
      key: 'presentacion',
      label: 'Presentación',
      type: 'action',
      width: '120px',
      actionIconFn: (row) => {
        const estado = this.presentacion().get((row as CuadroDeObraItem).numeroProceso);
        if (estado === 'SI') return 'bx bxs-check-circle text-green-600';
        if (estado === 'NO') return 'bx bxs-x-circle text-rose-600';
        return 'bx bx-circle text-gray-300';
      },
    },
    // (RF3) Verde si el proceso ya tiene requisitos guardados; gris si aún no.
    {
      key: 'requisitos',
      label: '',
      type: 'action',
      actionIconFn: (row) =>
        (row as CuadroDeObraItem).tieneRequisitos
          ? 'bx bx-list-check text-green-600'
          : 'bx bx-list-check text-gray-400',
    },
  ];

  columnasCuadro = computed(() => {
    const cols = [...this.baseColumnas];
    
    // Agregar acción de análisis solo en la pestaña "Por Presentar"
    if (this.activeTabId() === 'por-presentar') {
      cols.push({ 
        key: 'analizar', 
        label: '', 
        type: 'action', 
        actionIcon: 'bx bx-bot text-purple-600',
        width: '50px'
      });
    }

    cols.push(
      { key: 'editar', label: '', type: 'action', actionIcon: 'bx bx-edit text-blue-600' }
    );
    return cols;
  });

  // --- ESTADO DE LA PAGINACIÓN CON SIGNALS ---
  currentPage = signal(1);
  pageSize = signal(10);
  totalPages = signal(1);
  totalElements = signal(0);
  loading = signal(false);

  datos = signal<CuadroDeObraItem[]>([]);

  // --- MARCA "NOS PRESENTAMOS" (RF1, persistida en localStorage por numeroProceso) ---
  private readonly PRESENTACION_KEY = 'cuadro-de-obra:presentacion';
  presentacion = signal<Map<string, 'SI' | 'NO'>>(this.loadPresentacion());

  // --- ESTADO DE LOS MODALS ---
  showAddModal = signal(false);
  showEditModal = signal(false);
  showRequisitosModal = signal(false);
  showAnalizarModal = signal(false);
  selectedItem = signal<CuadroDeObraItem | null>(null);

  ngOnInit(): void {
    this.loadCuadroDeObra();
  }

  loadCuadroDeObra(): void {
    this.loading.set(true);
    const apiPage = this.currentPage() - 1;
    this.datos.set([]);

    this.cuadroDeObraService.obtenerCuadroDeObra(apiPage, this.pageSize(), this.activeTabId()).subscribe({
      next: (response) => {
        // Delegamos el filtrado totalmente al backend para evitar discrepancias
        this.datos.set(response.content);
        this.totalPages.set(response.totalPages);
        this.totalElements.set(response.totalElements);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error al obtener el cuadro de obra:', err);
        this.datos.set([]);
        this.loading.set(false);
      },
    });
  }

  onTabChange(tabId: string): void {
    if (this.activeTabId() === tabId) return;
    this.activeTabId.set(tabId);
    this.currentPage.set(1);
    this.loadCuadroDeObra();
  }

  onPageChange(newPage: number): void {
    this.currentPage.set(newPage);
    this.loadCuadroDeObra();
  }

  onActionClicked(event: { column: TableColumn; row: any }): void {
    const item = event.row as CuadroDeObraItem;

    // (RF1) La marca "nos presentamos" no abre modal: solo alterna el estado de la fila.
    if (event.column.key === 'presentacion') {
      this.togglePresentacion(item.numeroProceso);
      return;
    }

    this.selectedItem.set(item);

    if (event.column.key === 'editar') {
      this.showEditModal.set(true);
    } else if (event.column.key === 'requisitos') {
      this.showRequisitosModal.set(true);
    } else if (event.column.key === 'analizar') {
      this.showAnalizarModal.set(true);
    }
  }

  onEditSaved(): void {
    this.showEditModal.set(false);
    this.loadCuadroDeObra();
  }

  /**
   * Clase de fondo por fila (RF1). Verde si la empresa "sí se presenta", rosa si "no".
   * Sin marca no aplica color.
   */
  rowClass = (row: TableData): string => {
    const estado = this.presentacion().get((row as CuadroDeObraItem).numeroProceso);
    if (estado === 'SI') return 'bg-green-50 hover:bg-green-100';
    if (estado === 'NO') return 'bg-rose-50 hover:bg-rose-100';
    return '';
  };

  /** Cicla la marca de presentación de una fila: sin marca → Sí → No → sin marca. */
  togglePresentacion(numeroProceso: string): void {
    const map = new Map(this.presentacion());
    const actual = map.get(numeroProceso);
    if (actual === undefined) {
      map.set(numeroProceso, 'SI');
    } else if (actual === 'SI') {
      map.set(numeroProceso, 'NO');
    } else {
      map.delete(numeroProceso);
    }
    this.presentacion.set(map);
    this.persistPresentacion(map);
  }

  private loadPresentacion(): Map<string, 'SI' | 'NO'> {
    try {
      const raw = localStorage.getItem(this.PRESENTACION_KEY);
      const obj = raw ? (JSON.parse(raw) as Record<string, 'SI' | 'NO'>) : {};
      return new Map(Object.entries(obj));
    } catch {
      return new Map();
    }
  }

  private persistPresentacion(map: Map<string, 'SI' | 'NO'>): void {
    try {
      localStorage.setItem(this.PRESENTACION_KEY, JSON.stringify(Object.fromEntries(map)));
    } catch (e) {
      console.error('No se pudo persistir la marca de presentación:', e);
    }
  }
}
