import { Routes } from '@angular/router';
import { AUTH_ROUTES } from './features/auth/auth.routes';

export const routes: Routes = [
 {
    path: '',
    loadComponent: () =>
      import('./features/landing/pages/home-page/home-page').then(m => m.HomePage),
  },
  {
    path: 'auth',
    children: AUTH_ROUTES,
  },
  { path: '**', redirectTo: '' },
];
