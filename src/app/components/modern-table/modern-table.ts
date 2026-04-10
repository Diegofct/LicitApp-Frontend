import { Component, Input, PipeTransform, Output, EventEmitter } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';

export interface TableColumn {
  key: string;
  label: string;
  type?: 'text' | 'date' | 'datetime' | 'currency' | 'link' | 'action' | 'badge';
  width?: string;
  actionIcon?: string;
}

export type TableData = { [key: string]: any };

@Component({
  selector: 'app-modern-table',
  standalone: true,
  imports: [CommonModule],
  providers: [CurrencyPipe, DatePipe],
  templateUrl: './modern-table.html',
})
export class ModernTable {
  /**
   * Define las columnas de la tabla.
   */
  @Input() columns: TableColumn[] = [];

  /**
   * Los datos que se mostrarán en las filas de la tabla.
   */
  @Input() data: TableData[] = [];

  /**
   * Indica si se debe mostrar el mensaje predeterminado de "No se encontraron registros".
   * Por defecto es true.
   */
  @Input() showEmptyState: boolean = true;

  /**
   * Emite el objeto de la fila cuando se hace clic en una acción.
   */
  @Output() actionClicked = new EventEmitter<{ column: TableColumn, row: TableData }>();

  constructor(private currencyPipe: CurrencyPipe, private datePipe: DatePipe) {}

  onActionClick(column: TableColumn, row: TableData): void {
    this.actionClicked.emit({ column, row });
  }

  /**
   * Determina cómo se debe mostrar el valor de una celda.
   * Aplica formateo si es 'currency' o 'date'.
   * Retorna el valor original si es 'text' o si no se especifica un tipo.
   * Retorna la URL si es 'link'.
   */
  getValue(item: TableData, column: TableColumn): string | null {
    const value = item[column.key];
    if (value === null || value === undefined) {
      return null;
    }

    switch (column.type) {
      case 'currency':
        return this.currencyPipe.transform(value, 'COP', 'symbol-narrow', '1.0-0');
      case 'date':
        return this.datePipe.transform(value, 'dd/MM/yyyy');
      case 'datetime':
        return this.datePipe.transform(value, 'dd/MM/yyyy HH:mm');
      case 'link':
        return value;
      default:
        return value;
    }
  }

  getBadgeClasses(value: string): string {
    if (!value) return '';

    const val = value.toUpperCase();

    if (val.includes('POR_PRESENTAR') || val.includes('PENDIENTE')) {
      return 'bg-blue-100 text-blue-700 border border-blue-200';
    } else if (val.includes('PRESENTADO') || val.includes('COMPLETADO')) {
      return 'bg-green-100 text-green-700 border border-green-200';
    } else if (val.includes('ADJUDICADO') || val.includes('GANADA')) {
      return 'bg-amber-100 text-amber-700 border border-amber-200';
    } else if (val.includes('NO_ADJUDICADO') || val.includes('CANCELADA')) {
      return 'bg-red-100 text-red-700 border border-red-200';
    }

    return 'bg-gray-100 text-gray-700 border border-gray-200';
  }

  formatStatus(value: string): string {
    if (!value) return '';
    return value
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Verifica si una cadena es una URL válida.
   * @param value La cadena a verificar.
   * @returns `true` si la cadena es una URL, `false` en caso contrario.
   */
  isLink(value: string): boolean {
    try {
      new URL(value);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Función de seguimiento para `*ngFor` en las filas de la tabla.
   * Mejora el rendimiento al permitir que Angular rastree los elementos de la lista.
   */
  trackByFn(index: number, item: any): string {
    return index.toString();
  }
}

