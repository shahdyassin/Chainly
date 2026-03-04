import { Routes } from '@angular/router';
import { ProductionLines } from './production-lines/production-lines';

export const PRODUCTION_LINES_ROUTES: Routes = [
  {
    path: '',
    component: ProductionLines,
    data: { title: 'Production Lines' },
  },
  {
    path: ':id/report',
    loadComponent: () =>
      import('../pages/insights-report/insights-report')
        .then(m => m.InsightsReport),
    data: { title: 'Production Lines / Insight Report' }
  }
];
