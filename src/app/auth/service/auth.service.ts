import { HttpClient } from '@angular/common/http';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { LoginRequest, LoginResponse, Rol, Usuario } from '../interface/auth';

/**
 * Centraliza la sesión del usuario: login, logout, token, rehidratación y rol.
 * El estado del usuario se expone mediante signals para que la UI reaccione.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = 'http://localhost:8080/api/v1/auth';
  private readonly TOKEN_KEY = 'licitapp_token';

  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  // --- ESTADO REACTIVO ---
  private readonly _usuario = signal<Usuario | null>(null);
  /** Usuario autenticado actual (null si no hay sesión). */
  readonly usuario = this._usuario.asReadonly();
  /** true si existe una sesión válida cargada en memoria. */
  readonly isAuthenticated = computed(() => this._usuario() !== null);
  /** Rol del usuario actual o null. */
  readonly rol = computed<Rol | null>(() => this._usuario()?.rol ?? null);
  /** true si el rol puede ejecutar acciones de escritura (todos menos PROPIETARIO). */
  readonly puedeEscribir = computed(() => this.rol() !== 'PROPIETARIO');

  /**
   * Autentica al usuario contra el backend y persiste el token.
   */
  login(credenciales: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, credenciales).pipe(
      tap((res) => {
        this.guardarToken(res.token);
        this._usuario.set({
          id: res.usuarioId,
          nombre: res.nombre,
          correo: res.correo,
          rol: res.rol,
          activo: true,
        });
      })
    );
  }

  /**
   * Rehidrata la sesión al iniciar la app: si hay token, valida contra /auth/me.
   * Si el token es inválido/expiró, limpia la sesión silenciosamente.
   */
  cargarSesion(): Observable<Usuario | null> {
    const token = this.getToken();
    if (!token) return of(null);

    return this.http.get<Usuario>(`${this.apiUrl}/me`).pipe(
      tap((usuario) => this._usuario.set(usuario)),
      catchError(() => {
        this.limpiarSesion();
        return of(null);
      })
    );
  }

  /** Cierra la sesión y redirige al login. */
  logout(): void {
    this.limpiarSesion();
    this.router.navigate(['/login']);
  }

  /** Borra el token y el usuario en memoria, sin redirigir. */
  limpiarSesion(): void {
    if (this.isBrowser) localStorage.removeItem(this.TOKEN_KEY);
    this._usuario.set(null);
  }

  getToken(): string | null {
    return this.isBrowser ? localStorage.getItem(this.TOKEN_KEY) : null;
  }

  /** Devuelve el usuario actual de forma imperativa (no reactiva). */
  getUsuarioActual(): Usuario | null {
    return this._usuario();
  }

  /** Indica si el rol actual está dentro de los permitidos. */
  tieneRol(roles: Rol[]): boolean {
    const rol = this.rol();
    return rol !== null && roles.includes(rol);
  }

  /** Ruta de inicio según el rol (PROPIETARIO no puede ver Búsqueda SECOP). */
  rutaInicial(): string {
    return this.rol() === 'PROPIETARIO' ? '/resultados' : '/busqueda-secop';
  }

  private guardarToken(token: string): void {
    if (this.isBrowser) localStorage.setItem(this.TOKEN_KEY, token);
  }
}
