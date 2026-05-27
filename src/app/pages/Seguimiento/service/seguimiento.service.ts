import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  RegistrarEventoRequest,
  SeguimientoEvento,
  SeguimientoResponse,
} from '../interface/seguimiento';

@Injectable({
  providedIn: 'root',
})
export class SeguimientoService {
  private readonly apiUrl = 'http://localhost:8080/api/v1/seguimientos';
  private readonly http = inject(HttpClient);

  /**
   * Obtiene el seguimiento (con eventos ordenados) para un cuadro de obra.
   */
  obtenerPorCuadroDeObra(cuadroDeObraId: number): Observable<SeguimientoResponse> {
    return this.http.get<SeguimientoResponse>(`${this.apiUrl}/cuadro/${cuadroDeObraId}`);
  }

  /**
   * Registra manualmente un nuevo evento en el seguimiento.
   */
  registrarEvento(
    cuadroDeObraId: number,
    request: RegistrarEventoRequest
  ): Observable<SeguimientoEvento> {
    return this.http.post<SeguimientoEvento>(
      `${this.apiUrl}/cuadro/${cuadroDeObraId}/eventos`,
      request
    );
  }
}
