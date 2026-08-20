import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  DocumentoProceso,
  EstadoProceso,
  FiltrosLicitaciones,
  Licitacion,
} from '../interface/licitaciones';
import { PaginatedResponse } from '../interface/paginated-response';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class LicitacionesService {
  private readonly apiUrl = `${environment.apiBaseUrl}/licitaciones/obra-publica`;
  private readonly documentosUrl = `${environment.apiBaseUrl}/licitaciones/documentos`;
  private readonly estadoProcesoUrl = `${environment.apiBaseUrl}/licitaciones/estado-proceso`;
  private readonly departamentosUrl = `${environment.apiBaseUrl}/licitaciones/departamentos`;
  private readonly http = inject(HttpClient);

  /**
   * Lista paginada de licitaciones de obra pública. Todos los filtros son opcionales y se
   * aplican en la API de SECOP, no en memoria.
   *
   * Nota: el orden ya no viaja como `sort` de Spring. El backend nunca lo usó —construye su
   * propio `$order` para SoQL—, así que se manda explícito en `orden`.
   *
   * @param page El número de página a solicitar (basado en 0).
   * @param size El número de registros por página.
   * @param filtros Criterios opcionales; el presupuesto va en pesos.
   */
  obtenerLicitacionesObraPublica(
    page: number,
    size: number,
    filtros: FiltrosLicitaciones = {},
  ): Observable<PaginatedResponse<Licitacion>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    const entidad = filtros.entidad?.trim();
    if (entidad) {
      params = params.set('entidad', entidad);
    }
    const departamento = filtros.departamento?.trim();
    if (departamento) {
      params = params.set('departamento', departamento);
    }
    if (filtros.presupuestoMin != null) {
      params = params.set('presupuestoMin', filtros.presupuestoMin.toString());
    }
    if (filtros.presupuestoMax != null) {
      params = params.set('presupuestoMax', filtros.presupuestoMax.toString());
    }
    if (filtros.soloVigentes) {
      params = params.set('soloVigentes', 'true');
    }
    if (filtros.orden) {
      params = params.set('orden', filtros.orden);
    }

    return this.http.get<PaginatedResponse<Licitacion>>(this.apiUrl, { params });
  }

  /** Departamentos disponibles para el filtro, tal como los escribe SECOP. */
  obtenerDepartamentos(): Observable<string[]> {
    return this.http.get<string[]>(this.departamentosUrl);
  }

  /**
   * Documentos publicados en el proceso, con el pliego y la matriz de indicadores de primeras.
   * Un proceso sin documentos publicados devuelve lista vacía, no error.
   * @param idDelPortafolio Identificador de portafolio del proceso (CO1.BDOS.*).
   */
  obtenerDocumentos(idDelPortafolio: string): Observable<DocumentoProceso[]> {
    const params = new HttpParams().set('idDelPortafolio', idDelPortafolio);
    return this.http.get<DocumentoProceso[]>(this.documentosUrl, { params });
  }

  /**
   * Igual que `obtenerDocumentos`, pero partiendo del identificador del proceso (CO1.REQ.*),
   * que es el único que guarda el Cuadro de Obra. El backend resuelve el portafolio.
   */
  obtenerDocumentosPorProceso(idDelProceso: string): Observable<DocumentoProceso[]> {
    const params = new HttpParams().set('idDelProceso', idDelProceso);
    return this.http.get<DocumentoProceso[]>(this.documentosUrl, { params });
  }

  /**
   * Fase y desenlace del proceso en SECOP II, con su URL incluida. Nada de esto se guarda en
   * base de datos: el backend lo resuelve contra la API, así que también funciona con procesos
   * antiguos ya cerrados. Devuelve `null` si SECOP no conoce el identificador.
   */
  obtenerEstadoProceso(idDelProceso: string): Observable<EstadoProceso | null> {
    const params = new HttpParams().set('idDelProceso', idDelProceso);
    return this.http.get<EstadoProceso | null>(this.estadoProcesoUrl, { params });
  }
}
