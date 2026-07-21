import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ConformacionRequest, ConformacionResponse } from '../interface/conformacion';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ConformacionProponenteService {
  private readonly apiUrl = `${environment.apiBaseUrl}/analisis/consorcios`;
  private readonly http = inject(HttpClient);

  /**
   * Guarda (UPSERT) la conformación del proponente para un cuadro de obra.
   */
  guardarConformacion(request: ConformacionRequest): Observable<ConformacionResponse> {
    return this.http.post<ConformacionResponse>(this.apiUrl, request);
  }

  /**
   * Obtiene la conformación existente para un cuadro de obra.
   * El backend responde 404 si aún no existe.
   */
  obtenerPorCuadroDeObra(cuadroDeObraId: number): Observable<ConformacionResponse> {
    return this.http.get<ConformacionResponse>(`${this.apiUrl}/cuadro/${cuadroDeObraId}`);
  }
}
