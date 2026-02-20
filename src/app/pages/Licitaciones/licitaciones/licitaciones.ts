import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModernTable, TableColumn } from '../../../components/modern-table/modern-table';
import { Pagination } from '../../../components/pagination/pagination';
import { AddToCuadroModal } from '../../../components/add-to-cuadro-modal/add-to-cuadro-modal';
import { LicitacionesService } from '../service/licitaciones.service';
import { Router } from '@angular/router';
import { Licitacion } from '../interface/licitaciones';

@Component({
  selector: 'app-licitaciones',
  standalone: true,
  imports: [CommonModule, ModernTable, Pagination, AddToCuadroModal],
  templateUrl: './licitaciones.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Licitaciones implements OnInit {
  private readonly licitacionesService = inject(LicitacionesService);
  private readonly router = inject(Router);

  // --- CONFIGURACIÓN DE LA TABLA ---
  columnasLicitaciones: TableColumn[] = [
    { key: 'idDelProceso', label: 'ID Proceso' },
    { key: 'entidad', label: 'Entidad' },
    { key: 'objeto', label: 'Objeto', width: '300px' },
    { key: 'ubicacion', label: 'Ubicación' },
    { key: 'cuantia', label: 'Cuantía', type: 'currency' },
    { key: 'fechaPublicacion', label: 'Fecha Pub.', type: 'date' },
    { key: 'estado', label: 'Estado' },
    { key: 'modalidad', label: 'Modalidad' },
    { key: 'numero', label: 'Número Proceso' },
    { key: 'urlSecop', label: 'URL', type: 'link' },
    { key: 'acciones', label: 'Acciones', type: 'action', actionIcon: 'bx bx-plus-circle' },
  ];

  // --- ESTADO DE LA PAGINACIÓN CON SIGNALS ---
  currentPage = signal(1);
  pageSize = signal(10);
  totalPages = signal(1);
  totalElements = signal(0);

  // --- DATOS CON SIGNALS ---
  datosLicitaciones = signal<Licitacion[]>([]);
  loading = signal(false);

  // --- ESTADO DEL MODAL CON SIGNALS ---
  showModal = signal(false);
  selectedLicitacion = signal<Licitacion | null>(null);

  ngOnInit(): void {
    this.loadLicitaciones();
  }

  loadLicitaciones(): void {
    this.loading.set(true);
    const apiPage = this.currentPage() - 1;

    console.log(`Cargando licitaciones - Página: ${this.currentPage()} (API: ${apiPage}), Size: ${this.pageSize()}`);

    this.licitacionesService
      .obtenerLicitacionesObraPublica(apiPage, this.pageSize())
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

  onPageChange(newPage: number): void {
    this.currentPage.set(newPage);
    this.loadLicitaciones();
  }

  onActionClicked(event: { column: TableColumn, row: any }): void {
    this.selectedLicitacion.set(event.row as Licitacion);
    this.showModal.set(true);
  }

  onModalSaved(response: any): void {
    console.log('Proceso añadido exitosamente al Cuadro de Obra:', response);
    this.router.navigate(['/cuadro-de-obra']);
  }
}


