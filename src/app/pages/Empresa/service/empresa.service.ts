import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Empresa, IndicadoresFinancieros, CapacidadResidual, RupExtraido } from '../interface/empresa';
import { PaginatedResponse } from '../../Licitaciones/interface/paginated-response';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class EmpresaService {
  private readonly apiUrl = `${environment.apiBaseUrl}/empresas`;
  private readonly http = inject(HttpClient);

  /**
   * Obtiene la lista completa de empresas registradas.
   */
  listarEmpresas(): Observable<Empresa[]> {
    return this.http.get<Empresa[]>(this.apiUrl);
  }

  /**
   * Busca una empresa específica por su número de identificación tributaria (NIT).
   * @param nit El NIT de la empresa a buscar.
   */
  obtenerEmpresaPorNit(nit: string): Observable<Empresa> {
    return this.http.get<Empresa>(`${this.apiUrl}/${nit}`);
  }

  /**
   * Registra una nueva empresa en el sistema.
   * @param empresa El objeto de tipo Empresa con toda la información necesaria.
   */
  crearEmpresa(empresa: Empresa): Observable<Empresa> {
    return this.http.post<Empresa>(this.apiUrl, empresa);
  }

  /**
   * Actualiza la información de una empresa existente.
   * @param nit El NIT de la empresa a actualizar.
   * @param empresa Los nuevos datos de la empresa.
   */
  actualizarEmpresa(nit: string, empresa: Empresa): Observable<Empresa> {
    return this.http.put<Empresa>(`${this.apiUrl}/${nit}`, empresa);
  }

  /**
   * Elimina una empresa del sistema.
   * @param nit El NIT de la empresa a eliminar.
   */
  eliminarEmpresa(nit: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${nit}`);
  }

  /**
   * Calcula los indicadores financieros enviando los valores absolutos al backend.
   * @param indicadores Valores absolutos (activoCorriente, etc).
   */
  calcularIndicadores(indicadores: Partial<IndicadoresFinancieros>): Observable<IndicadoresFinancieros> {
    return this.http.post<IndicadoresFinancieros>(`${this.apiUrl}/calcular-indicadores`, indicadores);
  }

  /**
   * Preview del cálculo de capacidad residual sin persistir (no requiere id).
   * Usado para el cálculo en vivo mientras el usuario edita el formulario.
   */
  previewCapacidadResidual(capacidad: Partial<CapacidadResidual>): Observable<CapacidadResidual> {
    return this.http.post<CapacidadResidual>(`${this.apiUrl}/calcular-capacidad-residual`, capacidad);
  }

  /**
   * Calcula y persiste la capacidad residual asociada a una empresa existente.
   * @param id El ID de la empresa.
   * @param capacidad Valores para el cálculo.
   */
  calcularCapacidadResidual(id: number, capacidad: Partial<CapacidadResidual>): Observable<CapacidadResidual> {
    return this.http.post<CapacidadResidual>(`${this.apiUrl}/${id}/capacidad-residual`, capacidad);
  }

  /**
   * Extrae con IA la información de un RUP en PDF y devuelve un borrador editable
   * para precargar el formulario de empresa. La IA NO persiste nada: el guardado
   * continúa con crearEmpresa/actualizarEmpresa.
   *
   * Posibles errores HTTP:
   *  - 422: el PDF no es legible o no corresponde a un RUP.
   *  - 500: falló el proveedor de IA (reintentar).
   *
   * @param archivo Único PDF del RUP (campo multipart `archivo`).
   */
  extraerRup(archivo: File): Observable<RupExtraido> {
    const formData = new FormData();
    formData.append('archivo', archivo);
    return this.http.post<RupExtraido>(`${this.apiUrl}/extraer-rup`, formData);
  }
}
