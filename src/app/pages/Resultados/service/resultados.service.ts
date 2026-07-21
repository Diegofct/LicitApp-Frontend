import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PaginatedResponse } from '../../Licitaciones/interface/paginated-response';
import {
  HistorialSort,
  ItemHistorialResultado,
  ResumenResultados,
} from '../interface/resultados';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ResultadosService {
  private readonly apiUrl = `${environment.apiBaseUrl}/resultados`;
  private readonly http = inject(HttpClient);

  /**
   * Obtiene el resumen agregado (KPIs) de los procesos.
   */
  obtenerResumen(): Observable<ResumenResultados> {
    return this.http.get<ResumenResultados>(`${this.apiUrl}/resumen`);
  }

  /**
   * Obtiene el historial paginado de procesos cerrados (adjudicados / no adjudicados).
   * @param page Número de página (0-indexed para Spring).
   * @param size Tamaño de página.
   * @param sort Campo y dirección de ordenamiento.
   */
  obtenerHistorial(
    page: number,
    size: number,
    sort: HistorialSort
  ): Observable<PaginatedResponse<ItemHistorialResultado>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', `${sort.field},${sort.direction}`);

    return this.http.get<PaginatedResponse<ItemHistorialResultado>>(
      `${this.apiUrl}/historial`,
      { params }
    );
  }
}
