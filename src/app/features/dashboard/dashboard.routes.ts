// src/app/features/dashboard/dashboard.routes.ts
import { Routes } from '@angular/router';
import { DashboardShell } from './layout/dashboard-shell/dashboard-shell';
import { HomeDashboard } from './pages/home-dashboard/home-dashboard';

export const DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    component: DashboardShell,   // الـ layout اللي فيه السايدبار والتوب بار
    children: [
      {
        path: '',
        component: HomeDashboard, // /dashboard
      },
      {
        path: 'home',
        component: HomeDashboard, // /dashboard/home (اختياري بس مفيد)
      },
      // هنا بعدين تزودي بقية صفحات الداشبورد:
      // { path: 'orders', component: OrdersPage },
      // { path: 'suppliers', component: SuppliersPage },
    ],
  },
];
