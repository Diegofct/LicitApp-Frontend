import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PaginatedResponse } from '../../Licitaciones/interface/paginated-response';
import { CuadroDeObraItem } from '../interface/cuadro-de-obra';

@Injectable({
  providedIn: 'root',
})
export class CuadroDeObraService {
  // TODO: Mover la URL a un archivo de environment.
  private readonly apiUrl = 'http://localhost:8080/api/v1/cuadro-de-obra';
  private readonly http = inject(HttpClient);

  /**
   * Obtiene una lista paginada de procesos del cuadro de obra.
   * @param page El número de página (0-indexed).
   * @param size El número de registros por página.
   * @param tab El tab activo ('por-presentar' o 'presentadas').
   * @returns Un Observable con la respuesta paginada.
   */
  obtenerCuadroDeObra(page: number, size: number, tab: string): Observable<PaginatedResponse<CuadroDeObraItem>> {
    const estadoFiltrado = tab === 'por-presentar' ? 'POR_PRESENTAR' : 'PRESENTADA';
    
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('cuadroDeObraEstado', estadoFiltrado)
      .set('sort', 'fechaCierre,asc')
      .append('sort', 'id,desc'); // Mayor estabilidad en la paginación

    return this.http.get<PaginatedResponse<CuadroDeObraItem>>(this.apiUrl, { params });
  }

  /**
   * Elimina un registro del cuadro de obra por su ID.
   * @param id ID del registro a eliminar.
   */
  eliminarCuadroDeObra(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /**
   * Actualiza únicamente el estado de un registro en el cuadro de obra.
   * @param id ID del registro.
   * @param nuevoEstado El nuevo estado ('POR_PRESENTAR' o 'PRESENTADA').
   */
  actualizarEstado(id: number, nuevoEstado: string): Observable<CuadroDeObraItem> {
    return this.http.patch<CuadroDeObraItem>(`${this.apiUrl}/${id}/estado`, { estado: nuevoEstado });
  }

  /**
   * Actualiza un registro existente del cuadro de obra.
   * @param id ID del registro.
   * @param data Datos actualizados.
   */
  actualizarCuadroDeObra(id: number, data: CuadroDeObraItem): Observable<CuadroDeObraItem> {
    return this.http.put<CuadroDeObraItem>(`${this.apiUrl}/${id}`, data);
  }

  /**
   * Añade una licitación al cuadro de obra.
   * @param data Los datos completos del proceso.
   */
  agregarACuadroDeObra(data: any): Observable<CuadroDeObraItem> {
    return this.http.post<CuadroDeObraItem>(this.apiUrl, data);
  }
}
