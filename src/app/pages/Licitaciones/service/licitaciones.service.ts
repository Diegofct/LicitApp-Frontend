import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { DocumentoProceso, Licitacion, UrlProcesoResponse } from '../interface/licitaciones';
import { PaginatedResponse } from '../interface/paginated-response';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class LicitacionesService {
  private readonly apiUrl = `${environment.apiBaseUrl}/licitaciones/obra-publica`;
  private readonly documentosUrl = `${environment.apiBaseUrl}/licitaciones/documentos`;
  private readonly urlProcesoUrl = `${environment.apiBaseUrl}/licitaciones/url-proceso`;
  private readonly http = inject(HttpClient);

  /**
   * Obtiene una lista paginada de licitaciones de obra pública desde el backend.
   * @param page El número de página a solicitar (basado en 0).
   * @param size El número de registros por página.
   * @param entidad Filtro opcional por nombre de entidad (server-side).
   * @returns Un Observable que emite un objeto de respuesta paginada.
   */
  obtenerLicitacionesObraPublica(page: number, size: number, entidad?: string): Observable<PaginatedResponse<Licitacion>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', 'fechaPublicacion,desc')
      .append('sort', 'id,desc'); // Ordenamiento secundario para asegurar estabilidad en la paginación

    const entidadTrim = entidad?.trim();
    if (entidadTrim) {
      params = params.set('entidad', entidadTrim);
    }

    return this.http.get<PaginatedResponse<Licitacion>>(this.apiUrl, { params });
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
   * Enlace al proceso en SECOP II. No se guarda en base de datos: el backend lo resuelve
   * contra la API, así que también funciona con procesos antiguos ya cerrados. Si SECOP no
   * publica la URL, `url` llega en null.
   */
  obtenerUrlProceso(idDelProceso: string): Observable<UrlProcesoResponse> {
    const params = new HttpParams().set('idDelProceso', idDelProceso);
    return this.http.get<UrlProcesoResponse>(this.urlProcesoUrl, { params });
  }
}
