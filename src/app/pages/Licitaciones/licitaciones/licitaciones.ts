import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModernTable, TableColumn } from '../../../components/modern-table/modern-table';
import { Pagination } from '../../../components/pagination/pagination';
import { LicitacionesService } from '../service/licitaciones.service';
import { Licitacion } from '../interface/licitaciones';

@Component({
  selector: 'app-licitaciones',
  standalone: true,
  imports: [CommonModule, ModernTable, Pagination],
  templateUrl: './licitaciones.html',
})
export class Licitaciones implements OnInit {
  private readonly licitacionesService = inject(LicitacionesService);

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
  ];

  // --- ESTADO DE LA PAGINACIÓN ---
  currentPage: number = 1;
  pageSize: number = 10;
  totalPages: number = 1;
  totalElements: number = 0;

  // --- DATOS ---
  datosLicitaciones: Licitacion[] = [];

  ngOnInit(): void {
    this.loadLicitaciones();
  }

  loadLicitaciones(): void {
    const apiPage = this.currentPage - 1;

    this.licitacionesService
      .obtenerLicitacionesObraPublica(apiPage, this.pageSize)
      .subscribe({
        next: (response) => {
          this.datosLicitaciones = response.content;
          this.totalPages = response.totalPages;
          this.totalElements = response.totalElements;
        },
        error: (err) => {
          console.error('Ha ocurrido un error al obtener las licitaciones:', err);
          this.datosLicitaciones = [];
          this.totalPages = 1;
          this.currentPage = 1;
          this.totalElements = 0;
        },
      });
  }

  /**
   * Se ejecuta cuando el componente de paginación emite un evento de cambio de página.
   * @param newPage El nuevo número de página a cargar.
   */
  onPageChange(newPage: number): void {
    this.currentPage = newPage;
    this.loadLicitaciones();
  }
}
