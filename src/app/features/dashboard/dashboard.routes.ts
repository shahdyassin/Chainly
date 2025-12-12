import { Routes } from '@angular/router';
import { DashboardShell } from './layout/dashboard-shell/dashboard-shell';
import { HomeDashboard } from './pages/home-dashboard/home-dashboard';

export const DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    component: DashboardShell,
    children: [
      {
        path: '',
        component: HomeDashboard,
      },
      {
        path: 'home',
        component: HomeDashboard,
      },

      // { path: 'orders', component: OrdersPage },
      // { path: 'suppliers', component: SuppliersPage },
    ],
  },
];
