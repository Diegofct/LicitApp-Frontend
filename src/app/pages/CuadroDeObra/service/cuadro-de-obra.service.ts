import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PaginatedResponse } from '../../Licitaciones/interface/paginated-response';
import {
  CuadroDeObraItem,
  CuadroDeObraRef,
  PresentacionMarca,
  RequisitoLicitacion,
} from '../interface/cuadro-de-obra';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class CuadroDeObraService {
  private readonly apiUrl = `${environment.apiBaseUrl}/cuadro-de-obra`;
  private readonly http = inject(HttpClient);

  /**
   * Obtiene una lista paginada de procesos del cuadro de obra.
   * @param page El número de página (0-indexed).
   * @param size El número de registros por página.
   * @param tab El tab activo ('por-presentar' o 'presentadas').
   * @returns Un Observable con la respuesta paginada.
   */
  obtenerCuadroDeObra(page: number, size: number, tab: string): Observable<PaginatedResponse<CuadroDeObraItem>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('vista', tab) // Cambiado a 'vista' para coincidir con @RequestParam en Java
      .set('sort', 'id,desc');

    return this.http.get<PaginatedResponse<CuadroDeObraItem>>(this.apiUrl, { params });
  }

  /**
   * Obtiene la lista liviana (sin paginar) de procesos ya agregados al cuadro de obra.
   * Se usa para resaltar en la tabla de licitaciones qué procesos ya fueron guardados
   * y para abrir su detalle en modo lectura (cruce por idDelProceso).
   */
  obtenerRefs(): Observable<CuadroDeObraRef[]> {
    return this.http.get<CuadroDeObraRef[]>(`${this.apiUrl}/refs`);
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
   * @param nuevoEstado El nuevo estado.
   */
  actualizarEstado(id: number, nuevoEstado: string): Observable<CuadroDeObraItem> {
    return this.http.patch<CuadroDeObraItem>(`${this.apiUrl}/${id}/estado`, { cuadroDeObraEstado: nuevoEstado });
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
   * Actualiza la marca "nos presentamos" del cuadro (compartida por el equipo).
   * @param id ID del registro.
   * @param presentacion `SI`/`NO`, o `null` para limpiar la marca.
   */
  actualizarPresentacion(
    id: number,
    presentacion: PresentacionMarca | null,
  ): Observable<CuadroDeObraItem> {
    return this.http.patch<CuadroDeObraItem>(`${this.apiUrl}/${id}/presentacion`, { presentacion });
  }

  /**
   * Añade una licitación al cuadro de obra.
   * @param data Los datos completos del proceso.
   */
  agregarACuadroDeObra(data: any): Observable<CuadroDeObraItem> {
    return this.http.post<CuadroDeObraItem>(this.apiUrl, data);
  }

  /**
   * Obtiene un registro del cuadro de obra por su ID.
   * @param id ID del registro.
   */
  obtenerCuadroDeObraPorId(id: number): Observable<CuadroDeObraItem> {
    return this.http.get<CuadroDeObraItem>(`${this.apiUrl}/${id}`);
  }

  /**
   * Guarda los requisitos de licitación para un registro del cuadro de obra.
   * @param id ID del registro del cuadro de obra.
   * @param data Requisitos de la licitación.
   */
  guardarRequisitos(id: number, data: RequisitoLicitacion): Observable<RequisitoLicitacion> {
    return this.http.post<RequisitoLicitacion>(`${this.apiUrl}/${id}/requisitos`, data);
  }

  /**
   *Actualiza los requisitos de licitación para un registro del cuadro de obra.
   * @param id ID del registro del cuadro de obra.
   * @param data Requisitos de la licitación actualizados.
   * @returns Un Observable con los requisitos actualizados.
   */
  actualizarRequisitos(id: number, data: RequisitoLicitacion): Observable<RequisitoLicitacion> {
    return this.http.patch<RequisitoLicitacion>(`${this.apiUrl}/${id}/requisitos`, data);
  }

  /**
   * Envía un archivo al backend para ser analizado por la IA y extraer requisitos.
   * @param id ID del registro del cuadro de obra.
   * @param file Archivo del pliego de condiciones.
   */
  analizarPliego(id: number, file: File): Observable<RequisitoLicitacion> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<RequisitoLicitacion>(`${this.apiUrl}/${id}/extraer-requisitos`, formData);
  }

  /**
   * Obtiene los requisitos de licitación para un registro del cuadro de obra.
   * @param id ID del registro.
   */
  obtenerRequisitos(id: number): Observable<RequisitoLicitacion> {
    return this.http.get<RequisitoLicitacion>(`${this.apiUrl}/${id}/requisitos`);
  }
}
