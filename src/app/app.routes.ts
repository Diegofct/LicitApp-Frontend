import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: 'busqueda-secop',
        loadComponent: () => import('./pages/Licitaciones/licitaciones/licitaciones').then(m => m.Licitaciones)
    }
];
