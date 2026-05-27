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
    },
    {
        path: 'analisis-cumplimiento',
        loadComponent: () => import('./pages/AnalisisCumplimiento/analisis-cumplimiento/analisis-cumplimiento').then(m => m.AnalisisCumplimiento)
    },
    {
        path: 'empresas',
        children: [
            {
                path: '',
                loadComponent: () => import('./pages/Empresa/empresa-list/empresa-list').then(m => m.EmpresaListComponent)
            },
            {
                path: 'nueva',
                loadComponent: () => import('./pages/Empresa/empresa-form/empresa-form').then(m => m.EmpresaFormComponent)
            },
            {
                path: 'editar/:nit',
                loadComponent: () => import('./pages/Empresa/empresa-form/empresa-form').then(m => m.EmpresaFormComponent)
            }
        ]
    },
    {
        path: 'seguimiento',
        children: [
            {
                path: '',
                loadComponent: () => import('./pages/Seguimiento/seguimiento-list/seguimiento-list').then(m => m.SeguimientoListComponent)
            },
            {
                path: ':id',
                loadComponent: () => import('./pages/Seguimiento/seguimiento-detail/seguimiento-detail').then(m => m.SeguimientoDetailComponent)
            }
        ]
    },
    {
        path: 'resultados',
        loadComponent: () => import('./pages/Resultados/resultados/resultados').then(m => m.Resultados)
    }
];
