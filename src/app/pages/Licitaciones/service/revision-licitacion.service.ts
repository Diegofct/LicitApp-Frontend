import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

/**
 * Marca "Revisado" de la Búsqueda SECOP, compartida por todo el equipo. El estado es un
 * conjunto de `idDelProceso` persistido en el backend; reemplaza al antiguo localStorage,
 * que solo vivía en el navegador de cada usuario.
 */
@Injectable({
  providedIn: 'root',
})
export class RevisionLicitacionService {
  private readonly apiUrl = `${environment.apiBaseUrl}/licitaciones/revisiones`;
  private readonly http = inject(HttpClient);

  /** Devuelve los `idDelProceso` de las licitaciones marcadas como revisadas. */
  obtenerRevisiones(): Observable<string[]> {
    return this.http.get<string[]>(this.apiUrl);
  }

  /** Marca una licitación como revisada (idempotente en el servidor). */
  marcarRevisada(idDelProceso: string): Observable<void> {
    return this.http.post<void>(this.apiUrl, { idDelProceso });
  }

  /** Quita la marca de revisada (idempotente en el servidor). */
  desmarcarRevisada(idDelProceso: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${encodeURIComponent(idDelProceso)}`);
  }
}
