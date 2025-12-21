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
      {
        path: 'supplies-list',
        data: { title: 'Supplies' },
        loadChildren: () =>
          import('../supplies/supplies.routes').then((m) => m.SUPPLIES_LIST_ROUTES),
      },
      {
        path: 'suppliers',
        loadComponent: () =>
          import('../suppliers/pages/suppliers-list/suppliers').then((m) => m.Suppliers),
        data: { title: 'Suppliers' },
      },
      {
        path: 'suppliers/supplier-info/:id',
        loadComponent: () =>
          import('../suppliers/pages/suppliers-info/suppliers-info').then(
            (m) => m.SuppliersInfo
          ),
        data: { title: 'Suppliers / Supplier Info' },
      },
      {
        path: 'suppliers/import-files',
        loadComponent: () =>
          import('../suppliers/pages/import-files/import-files').then((m) => m.ImportFiles),
        data: { title: 'Suppliers / Import Files' }, // ✅ مهم
      },
      {
        path: 'suppliers/supplier-add',
        loadComponent: () =>
          import('../suppliers/pages/supplier-add/supplier-add').then((m) => m.SupplierAdd),
        data: { title: 'Suppliers / Supplier Info' },
      },
      {
        path: 'suppliers/supplier-edit/:id',
        loadComponent: () =>
          import('../suppliers/pages/supplier-edit/supplier-edit').then((m) => m.SupplierEdit),
        data: { title: 'Suppliers / Supplier Info' },
      },

    ],
  },
];
