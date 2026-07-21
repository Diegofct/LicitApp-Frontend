import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../service/auth.service';
import { AlertService } from '../../services/alert.service';
import { environment } from '../../../environments/environment';

const API_BASE = environment.apiBaseUrl;

/**
 * Interceptor funcional:
 *  - Adjunta `Authorization: Bearer <token>` a toda petición hacia la API si hay token.
 *  - Ante un 401 (token inválido/expirado), limpia la sesión y redirige a /login,
 *    avisando al usuario cuando tenía una sesión activa.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const alerta = inject(AlertService);

  const esApi = req.url.startsWith(API_BASE);
  const esLogin = req.url.includes('/auth/login');
  const token = auth.getToken();

  const peticion =
    token && esApi
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(peticion).pipe(
    catchError((error: HttpErrorResponse) => {
      // El 401 del propio login lo gestiona la pantalla de login (credenciales incorrectas).
      if (error.status === 401 && !esLogin) {
        const teniaSesion = auth.isAuthenticated();
        auth.limpiarSesion();
        if (teniaSesion) {
          alerta.warning('Tu sesión expiró, ingresa de nuevo.', 'Sesión finalizada');
        }
        router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
};
