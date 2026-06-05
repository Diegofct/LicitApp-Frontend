import { Routes } from '@angular/router';
import { authGuard, loginGuard, roleGuard } from './auth/guard/auth.guard';

// Roles que pueden operar todo el flujo de escritura.
const OPERATIVOS = ['ANALISTA', 'ADMIN'] as const;

export const routes: Routes = [
    {
        path: 'login',
        canActivate: [loginGuard],
        loadComponent: () => import('./pages/Login/login').then(m => m.LoginComponent)
    },
    {
        path: '',
        loadComponent: () => import('./layout/shell/shell.component').then(m => m.ShellComponent),
        canActivate: [authGuard],
        children: [
            {
                path: '',
                redirectTo: 'busqueda-secop',
                pathMatch: 'full'
            },
            {
                path: 'busqueda-secop',
                canActivate: [roleGuard([...OPERATIVOS])],
                loadComponent: () => import('./pages/Licitaciones/licitaciones/licitaciones').then(m => m.Licitaciones)
            },
            {
                path: 'cuadro-de-obra',
                canActivate: [roleGuard([...OPERATIVOS])],
                loadComponent: () => import('./pages/CuadroDeObra/cuadro-de-obra/cuadro-de-obra').then(m => m.CuadroDeObra)
            },
            {
                path: 'analisis-cumplimiento',
                canActivate: [roleGuard([...OPERATIVOS])],
                loadComponent: () => import('./pages/AnalisisCumplimiento/analisis-cumplimiento/analisis-cumplimiento').then(m => m.AnalisisCumplimiento)
            },
            {
                path: 'empresas',
                canActivateChild: [roleGuard([...OPERATIVOS])],
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
            },
            {
                path: 'usuarios',
                canActivate: [roleGuard(['ADMIN'])],
                loadComponent: () => import('./pages/Usuarios/usuarios').then(m => m.UsuariosComponent)
            }
        ]
    },
    {
        path: '**',
        redirectTo: ''
    }
];
