import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';

import { routes } from './app.routes';
import { authInterceptor } from './auth/interceptor/auth.interceptor';
import { AuthService } from './auth/service/auth.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    // Rehidrata la sesión (GET /auth/me) antes de arrancar la app.
    provideAppInitializer(() => lastValueFrom(inject(AuthService).cargarSesion())),
  ],
};
