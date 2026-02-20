import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Tab, Tabs } from '../../../components/tabs/tabs';
import { ModernTable, TableColumn } from '../../../components/modern-table/modern-table';
import { Pagination } from '../../../components/pagination/pagination';
import { CuadroDeObraService } from '../service/cuadro-de-obra.service';
import { CuadroDeObraItem } from '../interface/cuadro-de-obra';
import { EditCuadroModal } from '../../../components/edit-cuadro-modal/edit-cuadro-modal';
import { ConfirmModal } from '../../../components/confirm-modal/confirm-modal';

@Component({
  selector: 'app-cuadro-de-obra',
  standalone: true,
  imports: [CommonModule, Tabs, ModernTable, Pagination, EditCuadroModal, ConfirmModal],
  templateUrl: './cuadro-de-obra.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CuadroDeObra implements OnInit {
  private readonly cuadroDeObraService = inject(CuadroDeObraService);

  tabs: Tab[] = [
    { id: 'por-presentar', label: 'Por Presentar', icon: 'bx bx-time-five' },
    { id: 'presentadas', label: 'Presentadas', icon: 'bx bx-check-double' },
  ];

  activeTabId = signal('por-presentar');

  // ... (columnas igual)
  columnasCuadro: TableColumn[] = [
    { key: 'entidadContratante', label: 'Entidad', width: '200px' },
    { key: 'numeroProceso', label: 'N° Proceso', width: '150px' },
    { key: 'descripcionObjeto', label: 'Objeto', width: '300px' },
    { key: 'estadoProceso', label: 'Estado Proceso', width: '300px' },
    { key: 'fechaPublicacion', label: 'Fecha Publicación', width: '300px' },
    { key: 'fechaCierre', label: 'Fecha Cierre', type: 'date' },
    { key: 'monto', label: 'Presupuesto', type: 'currency' },
    { key: 'valorSMMLV', label: 'Valor SMMLV' },
    { key: 'tipoProyecto', label: 'Tipo Proyecto' },
    { key: 'departamento', label: 'Departamento' },
    { key: 'municipio', label: 'Municipio' },
    { key: 'experiencia', label: 'Experiencia' },
    { key: 'plazo', label: 'Plazo' },
    { key: 'anticipo', label: 'Anticipo' },
    { key: 'observacion', label: 'Observaciones' },
    { key: 'cuadroDeObraEstado', label: 'Estado' },
    { key: 'editar', label: '', type: 'action', actionIcon: 'bx bx-edit text-blue-600' },
    { key: 'eliminar', label: '', type: 'action', actionIcon: 'bx bx-trash text-red-600' },
  ];

  // --- ESTADO DE LA PAGINACIÓN CON SIGNALS ---
  currentPage = signal(1);
  pageSize = signal(10);
  totalPages = signal(1);
  totalElements = signal(0);
  loading = signal(false);

  datos = signal<CuadroDeObraItem[]>([]);
  
  // --- ESTADO DE LOS MODALS ---
  showEditModal = signal(false);
  showDeleteConfirm = signal(false);
  selectedItem = signal<CuadroDeObraItem | null>(null);

  ngOnInit(): void {
    this.loadCuadroDeObra();
  }

  loadCuadroDeObra(): void {
    this.loading.set(true);
    const apiPage = this.currentPage() - 1;
    this.datos.set([]);

    this.cuadroDeObraService
      .obtenerCuadroDeObra(apiPage, this.pageSize(), this.activeTabId())
      .subscribe({
        next: (response) => {
          // Filtrado de seguridad mejorado para permitir ambas formas de string si fuese necesario
          const estadoEsperado = this.activeTabId() === 'por-presentar' ? 'POR_PRESENTAR' : 'PRESENTADA';
          
          const filteredContent = response.content.filter(item => {
            const estadoActual = item.cuadroDeObraEstado?.toUpperCase();
            return estadoActual === estadoEsperado;
          });
          
          this.datos.set(filteredContent);
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
    this.selectedItem.set(item);

    if (event.column.key === 'editar') {
      this.showEditModal.set(true);
    } else if (event.column.key === 'eliminar') {
      this.showDeleteConfirm.set(true);
    }
  }

  confirmDeletion(): void {
    const item = this.selectedItem();
    if (!item?.id) return;

    this.showDeleteConfirm.set(false);
    this.loading.set(true);

    this.cuadroDeObraService.eliminarCuadroDeObra(item.id).subscribe({
      next: () => {
        console.log('Registro eliminado exitosamente');
        this.loadCuadroDeObra();
      },
      error: (err) => {
        console.error('Error al eliminar el registro:', err);
        this.loading.set(false);
        alert('Hubo un error al intentar eliminar el registro.');
      }
    });
  }

  onEditSaved(): void {
    this.showEditModal.set(false);
    this.loadCuadroDeObra();
  }
}
