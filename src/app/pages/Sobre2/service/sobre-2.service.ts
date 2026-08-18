import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  AnalisisParams,
  AnalisisSobre2,
  ImportacionOferentes,
  OferenteProceso,
  OferenteProcesoRequest,
  ResumenCompetidor,
} from '../interface/sobre-2';

/**
 * Acceso al slice "Sobre 2" del backend: oferentes de un proceso y cálculo de los
 * métodos de ponderación económica.
 *
 * Todos los endpoints exigen rol ANALISTA o ADMIN (401/403 los maneja el interceptor
 * de autenticación; los errores de negocio llegan como `{ message }` y los presenta
 * la vista con `AlertService`).
 */
@Injectable({ providedIn: 'root' })
export class Sobre2Service {
  private readonly apiUrl = `${environment.apiBaseUrl}/sobre-2`;
  private readonly http = inject(HttpClient);

  /**
   * Importa los oferentes del proceso desde el dataset de ofertas de SECOP.
   * La operación es **idempotente**: repetirla no duplica filas, actualiza las
   * existentes y por eso la respuesta distingue `creados` de `actualizados`.
   *
   * Cuando el cuadro tiene `idDelProceso`, el backend resuelve el identificador
   * interno del proceso contra SECOP y cruza de forma **exacta**; el NIT no hace
   * falta. Solo si el cuadro no existe en SECOP (cargado a mano) o el proceso no se
   * puede resolver, degrada a buscar por referencia y lo dice en `advertencias`.
   *
   * @param cuadroId ID del cuadro de obra (proceso) destino.
   * @param nitEntidad NIT de la entidad contratante. **Override manual, casi siempre
   *   innecesario**: solo acota la búsqueda en el camino degradado. Si se envía uno
   *   que no coincide con el que publica SECOP, la respuesta trae una advertencia.
   * @param historico `true` para incluir procesos anteriores a 2024.
   * @returns Conteos, oferentes resultantes y advertencias de la importación.
   * @throws 404 si el cuadro de obra no existe; 400 si no hay ni `idDelProceso` ni
   *   número de proceso con que buscar; 503 si SECOP no responde.
   */
  importarOferentes(
    cuadroId: number,
    nitEntidad?: string | null,
    historico = false,
  ): Observable<ImportacionOferentes> {
    let params = new HttpParams();
    if (nitEntidad && nitEntidad.trim().length > 0) {
      params = params.set('nitEntidad', nitEntidad.trim());
    }
    if (historico) {
      params = params.set('historico', 'true');
    }
    return this.http.post<ImportacionOferentes>(
      `${this.apiUrl}/${cuadroId}/importar`,
      null,
      { params },
    );
  }

  /**
   * Lista todos los oferentes registrados en un proceso (válidos y excluidos).
   * @param cuadroId ID del cuadro de obra.
   */
  listarOferentes(cuadroId: number): Observable<OferenteProceso[]> {
    return this.http.get<OferenteProceso[]>(`${this.apiUrl}/${cuadroId}/oferentes`);
  }

  /**
   * Registra un oferente a mano (procesos cuyo SECOP no publica ofertas).
   * @param cuadroId ID del cuadro de obra.
   * @param body Datos del oferente; `nombreOferente` y `valorOferta` son obligatorios.
   * @throws 400 si el nombre viene vacío o el valor no es mayor que cero.
   */
  crearOferente(cuadroId: number, body: OferenteProcesoRequest): Observable<OferenteProceso> {
    return this.http.post<OferenteProceso>(`${this.apiUrl}/${cuadroId}/oferentes`, body);
  }

  /**
   * Actualiza un oferente existente. También es la vía para alternar `valida`,
   * que excluye o reincorpora la oferta a las fórmulas.
   * @param oferenteId ID del oferente.
   * @param body Datos completos del oferente.
   * @throws 404 si el oferente no existe; 400 si los datos no pasan validación.
   */
  actualizarOferente(
    oferenteId: number,
    body: OferenteProcesoRequest,
  ): Observable<OferenteProceso> {
    return this.http.put<OferenteProceso>(`${this.apiUrl}/oferentes/${oferenteId}`, body);
  }

  /**
   * Elimina un oferente. Los importados de SECOP reaparecen en la próxima importación.
   * @param oferenteId ID del oferente.
   * @throws 404 si el oferente no existe.
   */
  eliminarOferente(oferenteId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/oferentes/${oferenteId}`);
  }

  /**
   * Calcula, sobre las ofertas válidas, todos los métodos de ponderación del régimen
   * y el valor de compromiso sugerido.
   *
   * @param cuadroId ID del cuadro de obra.
   * @param params `valorCandidato` (valor a simular), `regimen` y `puntajeMaximo`.
   *   Solo se envían los que tienen valor: si se omiten, manda el default del backend.
   * @throws 404 si el cuadro de obra no existe.
   */
  analizar(cuadroId: number, params: AnalisisParams = {}): Observable<AnalisisSobre2> {
    let httpParams = new HttpParams();
    if (params.valorCandidato !== null && params.valorCandidato !== undefined) {
      httpParams = httpParams.set('valorCandidato', params.valorCandidato.toString());
    }
    if (params.regimen) {
      httpParams = httpParams.set('regimen', params.regimen);
    }
    if (params.puntajeMaximo !== null && params.puntajeMaximo !== undefined) {
      httpParams = httpParams.set('puntajeMaximo', params.puntajeMaximo.toString());
    }
    return this.http.get<AnalisisSobre2>(`${this.apiUrl}/${cuadroId}/analisis`, {
      params: httpParams,
    });
  }

  /**
   * Histórico de un competidor a lo largo de los procesos ya registrados:
   * en cuántos aparece y con qué porcentajes se ha presentado.
   * @param nombre Nombre del oferente tal como aparece en la tabla.
   */
  resumenCompetidor(nombre: string): Observable<ResumenCompetidor> {
    const params = new HttpParams().set('nombre', nombre);
    return this.http.get<ResumenCompetidor>(`${this.apiUrl}/competidores`, { params });
  }
}
