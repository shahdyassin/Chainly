import { Routes } from '@angular/router';
import { SuppliesInfo } from './pages/supplies-info/supplies-info';

export const SUPPLIES_INFO_ROUTES: Routes = [
  {
    path: ':id',
    component: SuppliesInfo,
    data: { title: '', hidePageTitle: true },
  },
];
