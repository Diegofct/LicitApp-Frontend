import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AnalisisRequest, AnalisisResponse } from '../interface/analisis';

@Injectable({
  providedIn: 'root',
})
export class AnalisisCumplimientoService {
  private readonly apiUrl = 'http://localhost:8080/api/v1/analisis';
  private readonly http = inject(HttpClient);

  /**
   * Evalúa el cumplimiento de una empresa con los requisitos de un proceso.
   * @param request Payload con empresaId y cuadroDeObraId.
   */
  evaluarAnalisis(request: AnalisisRequest): Observable<AnalisisResponse> {
    return this.http.post<AnalisisResponse>(`${this.apiUrl}/evaluar`, request);
  }
}
