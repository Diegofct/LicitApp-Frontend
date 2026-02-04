import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

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
}
