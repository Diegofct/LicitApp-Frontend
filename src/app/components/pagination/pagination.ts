import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pagination.html',
})
export class Pagination {
  @Input() currentPage: number = 1;
  @Input() totalPages: number = 1;
  @Input() totalElements: number = 0;
  @Input() maxPagesToShow: number = 5; // Nuevo input para controlar el número de páginas visibles

  @Output() pageChange = new EventEmitter<number>();

  /**
   * Genera un array de números de página para mostrar en la paginación.
   * Se centra en la página actual, mostrando un número equitativo de páginas antes y después.
   */
  get visiblePages(): number[] {
    const pages: number[] = [];
    const halfPagesToShow = Math.floor(this.maxPagesToShow / 2);

    let startPage = Math.max(1, this.currentPage - halfPagesToShow);
    let endPage = Math.min(this.totalPages, this.currentPage + halfPagesToShow);

    // Ajustar si estamos cerca del principio
    if (endPage - startPage + 1 < this.maxPagesToShow) {
      endPage = Math.min(this.totalPages, startPage + this.maxPagesToShow - 1);
      startPage = Math.max(1, endPage - this.maxPagesToShow + 1);
    }

    // Ajustar si estamos cerca del final
    if (endPage - startPage + 1 < this.maxPagesToShow) {
      startPage = Math.max(1, this.totalPages - this.maxPagesToShow + 1);
      endPage = this.totalPages;
    }


    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  }

  /**
   * Navega a una página específica.
   * @param page - El número de página al que se quiere ir.
   */
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.pageChange.emit(page);
    }
  }

  /**
   * Navega a la página siguiente si no es la última.
   */
  nextPage(): void {
    this.goToPage(this.currentPage + 1);
  }

  /**
   * Navega a la página anterior si no es la primera.
   */
  previousPage(): void {
    this.goToPage(this.currentPage - 1);
  }
}
