import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  ActualizarUsuarioRequest,
  CambiarEstadoUsuarioRequest,
  CrearUsuarioRequest,
  RestablecerContrasenaRequest,
  Usuario,
} from '../../../auth/interface/auth';
import { environment } from '../../../../environments/environment';

/**
 * Operaciones de gestión de usuarios. Todos los endpoints requieren rol ADMIN
 * (el backend lo valida; el token lo adjunta el interceptor automáticamente).
 */
@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private readonly apiUrl = `${environment.apiBaseUrl}/usuarios`;
  private readonly http = inject(HttpClient);

  /** Lista todos los usuarios registrados (GET /usuarios). */
  listarUsuarios(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(this.apiUrl);
  }

  /** Crea un nuevo usuario (POST /usuarios). Correo duplicado → 409. */
  crearUsuario(usuario: CrearUsuarioRequest): Observable<Usuario> {
    return this.http.post<Usuario>(this.apiUrl, usuario);
  }

  /**
   * Actualiza nombre, correo y rol de un usuario (PUT /usuarios/{id}).
   * @param id Identificador del usuario a actualizar.
   * @param body Nuevos datos (nombre, correo, rol).
   * @returns El usuario actualizado.
   * Errores: 404 si no existe · 409 si el correo pertenece a otro usuario ·
   * 400 si se intenta degradar/bloquear al propio ADMIN o al último ADMIN activo.
   */
  actualizarUsuario(id: number, body: ActualizarUsuarioRequest): Observable<Usuario> {
    return this.http.put<Usuario>(`${this.apiUrl}/${id}`, body);
  }

  /**
   * Activa o desactiva un usuario (PATCH /usuarios/{id}/estado). Borrado lógico.
   * @param id Identificador del usuario.
   * @param activo Nuevo estado del usuario.
   * @returns El usuario con su estado actualizado.
   * Errores: 404 si no existe · 400 si un ADMIN intenta autodesactivarse o
   * desactivar al último ADMIN activo.
   */
  cambiarEstado(id: number, activo: boolean): Observable<Usuario> {
    const body: CambiarEstadoUsuarioRequest = { activo };
    return this.http.patch<Usuario>(`${this.apiUrl}/${id}/estado`, body);
  }

  /**
   * Restablece la contraseña de un usuario (PATCH /usuarios/{id}/contrasena).
   * El backend rehashea con BCrypt y responde 204 sin cuerpo.
   * @param id Identificador del usuario.
   * @param contrasena Nueva contraseña (mín. 8 caracteres).
   * Errores: 404 si no existe · 400 si la contraseña no cumple la validación.
   */
  restablecerContrasena(id: number, contrasena: string): Observable<void> {
    const body: RestablecerContrasenaRequest = { contrasena };
    return this.http.patch<void>(`${this.apiUrl}/${id}/contrasena`, body);
  }
}
