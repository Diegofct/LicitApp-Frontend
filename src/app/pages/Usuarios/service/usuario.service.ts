import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CrearUsuarioRequest, Usuario } from '../../../auth/interface/auth';

/**
 * Operaciones de gestión de usuarios. Todos los endpoints requieren rol ADMIN
 * (el backend lo valida; el token lo adjunta el interceptor automáticamente).
 */
@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private readonly apiUrl = 'http://localhost:8080/api/v1/usuarios';
  private readonly http = inject(HttpClient);

  /** Lista todos los usuarios registrados (GET /usuarios). */
  listarUsuarios(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(this.apiUrl);
  }

  /** Crea un nuevo usuario (POST /usuarios). Correo duplicado → 409. */
  crearUsuario(usuario: CrearUsuarioRequest): Observable<Usuario> {
    return this.http.post<Usuario>(this.apiUrl, usuario);
  }
}
