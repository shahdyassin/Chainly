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
        data: { title: 'Dashboard' },
      },
      {
        path: 'home',
        component: HomeDashboard,
        data: { title: 'Dashboard' },
      },

      {
        path: 'production-lines',
        data: { title: 'Production Lines' }, 
        loadChildren: () =>
          import('../production-lines/pages/production-lines.routes').then(
            (m) => m.PRODUCTION_LINES_ROUTES
          ),
      },
    ],
  },
];
