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
    { key: 'objeto', label: 'Objeto', width: '300px' }, // Ejemplo de ancho
    { key: 'entidad', label: 'Entidad' },
    { key: 'estado', label: 'Estado' },
    { key: 'cuantia', label: 'Cuantía', type: 'currency' },
    { key: 'ubicacion', label: 'Ubicación' },
    { key: 'modalidad', label: 'Modalidad' },
    { key: 'numero', label: 'Número Proceso' },
    { key: 'fechaPublicacion', label: 'Fecha Pub.', type: 'date' },
    { key: 'urlSecop', label: 'URL', type: 'link' },
  ];

  // --- ESTADO DE LA PAGINACIÓN ---
  currentPage: number = 1;
  pageSize: number = 10;
  // TODO: Para una paginación completa, el backend debería devolver el total de elementos y páginas.
  // Sin esa información, no podemos mostrar "Página X de Y".
  totalPages: number = 1; // Se asume al menos una página.
  totalElements: number = 0; // No se puede determinar desde la API actual.

  // --- DATOS ---
  datosLicitaciones: Licitacion[] = [];

  ngOnInit(): void {
    this.loadLicitaciones();
  }

  /**
   * Carga los datos para la página actual desde el backend.
   */
  loadLicitaciones(): void {
    // NOTA: El paginador de Spring Data es basado en 0, pero es común
    // que en el UI se muestre basado en 1. Se resta 1 para la llamada a la API.
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

  /**
   * Función de seguimiento para `*ngFor` para mejorar el rendimiento.
   * @param index El índice del elemento.
   * @param item La licitación.
   */
  trackById(index: number, item: Licitacion): string {
    return item.idDelProceso;
  }
}
