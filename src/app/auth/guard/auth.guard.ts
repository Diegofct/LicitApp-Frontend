import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../service/auth.service';
import { Rol } from '../interface/auth';

/**
 * Protege las rutas internas: si no hay sesión válida, redirige a /login.
 */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isAuthenticated() ? true : router.createUrlTree(['/login']);
};

/**
 * Evita que un usuario ya autenticado vuelva a /login: lo lleva a su inicio.
 */
export const loginGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isAuthenticated() ? router.createUrlTree([auth.rutaInicial()]) : true;
};

/**
 * Restringe una ruta a un conjunto de roles. Si el rol no aplica, redirige
 * silenciosamente al inicio del usuario (el menú ya oculta lo que no puede ver).
 */
export const roleGuard = (rolesPermitidos: Rol[]): CanActivateFn => {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    if (auth.tieneRol(rolesPermitidos)) return true;
    return router.createUrlTree([auth.rutaInicial()]);
  };
};
