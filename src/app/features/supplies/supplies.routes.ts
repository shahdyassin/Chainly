import { Routes } from '@angular/router';
import { SuppliesList } from './pages/supplies-list/supplies-list';

export const SUPPLIES_LIST_ROUTES: Routes = [
  {
    path: '',
    component: SuppliesList,
    data: { title: 'Supplies' },
  },

  {
    path: 'supplies-info/:id',
    loadComponent: () =>
      import('./pages/supplies-info/supplies-info')
        .then(m => m.SuppliesInfo),
    data: { title: 'Supplies / Supply Info' } 
  }
];
