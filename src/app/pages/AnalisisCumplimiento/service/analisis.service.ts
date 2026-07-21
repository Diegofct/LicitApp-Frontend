import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AnalisisRequest, AnalisisResponse } from '../interface/analisis';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AnalisisCumplimientoService {
  private readonly apiUrl = `${environment.apiBaseUrl}/analisis`;
  private readonly http = inject(HttpClient);

  /**
   * Evalúa el cumplimiento de una empresa con los requisitos de un proceso.
   * @param request Payload con empresaId, cuadroDeObraId y, opcionalmente,
   *                porcentajeSimulacion (fracción 0.01–0.99 de participación
   *                de la empresa elegida; si se omite el backend usa 0.5).
   */
  evaluarAnalisis(request: AnalisisRequest): Observable<AnalisisResponse> {
    return this.http.post<AnalisisResponse>(`${this.apiUrl}/evaluar`, request);
  }
}
