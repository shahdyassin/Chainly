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
        path: 'suppliers/import-files',
        loadComponent: () =>
          import('../suppliers/pages/import-files/import-files').then((m) => m.ImportFiles),
        data: { title: 'Suppliers / Import Files' },
      },
      {
        path: 'suppliers/supplier-edit/:id',
        loadComponent: () =>
          import('../suppliers/pages/supplier-edit/supplier-edit').then((m) => m.SupplierEdit),
        data: { title: 'Suppliers / Supplier Info' },
      },
      {
        path: 'suppliers/supplier-add',
        loadComponent: () =>
          import('../suppliers/pages/supplier-add/supplier-add').then((m) => m.SupplierAdd),
        data: { title: 'Suppliers / Supplier Info' },
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
        path: 'orders',
        loadComponent: () =>
          import('../orders/pages/orders-list/orders-list').then((m) => m.OrdersList),
        data: { title: 'Orders' },
      },
      {
        path: 'orders/:id/edit',
        loadComponent: () =>
          import('../orders/pages/order-edit/order-edit').then((m) => m.OrderEdit),
        data: { title: 'Orders / Order Details / Edit Order' },
      },
      {
        path: 'orders/:id',
        loadComponent: () =>
          import('../orders/pages/order-details/order-details').then((m) => m.OrderDetails),
        data: { title: 'Orders / Order Details' },
      },
      {
        path: 'rising-demands',
        loadComponent: () =>
          import('../rising-demands/pages/rising-demands/rising-demands').then(
            (m) => m.RisingDemands
          ),
        data: { title: 'Rising Demands' },
      },
      {
        path: 'users-list',
        loadComponent: () =>
          import('../users/pages/users-list/users-list').then(
            (m) => m.UsersList
          ),
        data: { title: 'Users Management' },
      },
      {
        path: 'roles-list',
        loadComponent: () =>
          import('../users/pages/roles-list/roles-list').then(
            (m) => m.RolesList
          ),
        data: { title: 'Users Management / Roles' },
      },
      {
        path: 'roles-list/:id',
        loadComponent: () =>
          import('../users/pages/role-details/role-details')
            .then(m => m.RoleDetails),
        data: { title: 'Users Management / Roles' }
      },
      {
        path: 'roles-list/:id/edit',
        loadComponent: () =>
          import('../users/pages/role-edit/role-edit')
            .then(m => m.RoleEdit),
        data: { title: 'Users Management / Roles ' }
      },
      {
        path: 'insights-list',
        loadComponent: () =>
          import('../insights/pages/insights-list/insights-list').then(
            (m) => m.InsightsList
          ),
        data: { title: 'Insights' },
      }
    ],
  },
];
