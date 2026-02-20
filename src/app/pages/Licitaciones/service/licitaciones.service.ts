import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Licitacion } from '../interface/licitaciones';
import { PaginatedResponse } from '../interface/paginated-response';

@Injectable({
  providedIn: 'root',
})
export class LicitacionesService {
  // TODO: Mover la URL a un archivo de environment.
  private readonly apiUrl = 'http://localhost:8080/api/v1/licitaciones/obra-publica';
  private readonly http = inject(HttpClient);

  /**
   * Obtiene una lista paginada de licitaciones de obra pública desde el backend.
   * @param page El número de página a solicitar (basado en 0).
   * @param size El número de registros por página.
   * @returns Un Observable que emite un objeto de respuesta paginada.
   */
  obtenerLicitacionesObraPublica(page: number, size: number): Observable<PaginatedResponse<Licitacion>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', 'fechaPublicacion,desc')
      .append('sort', 'id,desc'); // Ordenamiento secundario para asegurar estabilidad en la paginación

    return this.http.get<PaginatedResponse<Licitacion>>(this.apiUrl, { params });
  }
}
