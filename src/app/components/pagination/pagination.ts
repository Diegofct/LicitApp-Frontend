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

  @Output() pageChange = new EventEmitter<number>();

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
