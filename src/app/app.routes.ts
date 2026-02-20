import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: '',
        redirectTo: 'busqueda-secop',
        pathMatch: 'full'
    },
    {
        path: 'busqueda-secop',
        loadComponent: () => import('./pages/Licitaciones/licitaciones/licitaciones').then(m => m.Licitaciones)
    },
    {
        path: 'cuadro-de-obra',
        loadComponent: () => import('./pages/CuadroDeObra/cuadro-de-obra/cuadro-de-obra').then(m => m.CuadroDeObra)
    }
];
