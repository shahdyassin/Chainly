// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { AUTH_ROUTES } from './features/auth/auth.routes';
import { DASHBOARD_ROUTES } from './features/dashboard/dashboard.routes';
import { AuthGuard } from './core/guards/authGuard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/landing/pages/home-page/home-page')
        .then((m) => m.HomePage),
  },

  {
    path: 'auth',
    children: AUTH_ROUTES,
  },

  {
    path: 'dashboard',
    canActivate: [AuthGuard],   
    children: DASHBOARD_ROUTES,
  },

  { path: '**', redirectTo: '' },
];
