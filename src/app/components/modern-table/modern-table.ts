import { Component, Input, PipeTransform } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';

// Definimos tipos genéricos para que la tabla sea más robusta y reutilizable
export interface TableColumn {
  key: string; // La clave del objeto de datos (ej: 'id_licitacion')
  label: string; // Lo que se muestra en la cabecera (ej: 'ID Licitación')
  type?: 'text' | 'date' | 'currency' | 'link'; // Tipo de dato para formateo
  width?: string; // Ancho opcional de la columna (ej: '150px', '20%')
}

export type TableData = { [key: string]: any };

@Component({
  selector: 'app-modern-table',
  standalone: true,
  imports: [CommonModule],
  providers: [CurrencyPipe, DatePipe], // Proveemos los pipes aquí
  templateUrl: './modern-table.html',
})
export class ModernTable {
  /**
   * Define las columnas de la tabla.
   * Cada columna tiene una 'key' para acceder al dato y una 'label' para la cabecera.
   * @example
   * [
   *   { key: 'id', label: 'ID' },
   *   { key: 'nombre', label: 'Nombre del Cliente' }
   * ]
   */
  @Input() columns: TableColumn[] = [];

  /**
   * Los datos que se mostrarán en las filas de la tabla.
   * Es un array de objetos, donde cada objeto es una fila.
   * @example
   * [
   *   { id: 1, nombre: 'Cliente A', estado: 'Activo' },
   *   { id: 2, nombre: 'Cliente B', estado: 'Inactivo' }
   * ]
   */
  @Input() data: TableData[] = [];

  constructor(private currencyPipe: CurrencyPipe, private datePipe: DatePipe) {}

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
        // Asumiendo moneda COP (Pesos Colombianos) y un formato común.
        // Ajusta 'COP' y 'symbol-narrow' según tus necesidades.
        return this.currencyPipe.transform(value, 'COP', 'symbol-narrow', '1.0-0');
      case 'date':
        // Formato de fecha común. Ajusta 'shortDate' según tus necesidades.
        return this.datePipe.transform(value, 'dd/MM/yyyy');
      case 'link':
        // Para enlaces, devolvemos el valor tal cual, el template lo convertirá a <a>
        return value;
      default:
        return value;
    }
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
   * Se asume que cada fila tiene una 'key' única, si no, se podría usar el índice.
   */
  trackByFn(index: number, item: TableData): string {
    // Verificar si columns no está vacío antes de intentar acceder a this.columns[0]
    if (this.columns && this.columns.length > 0 && this.columns[0].key) {
      return item[this.columns[0].key] || index;
    }
    return index.toString(); // Fallback a index si no hay columnas o key
  }
}

