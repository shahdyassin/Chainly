import { Routes } from '@angular/router';
import { ProductionLines } from './production-lines/production-lines';

export const PRODUCTION_LINES_ROUTES: Routes = [
  {
    path: '',
    component: ProductionLines,
    data: { title: 'Production Lines' }, 
  },
];
