import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./features/overview/overview.component') },
  {
    path: 'transactions',
    loadComponent: () => import('./features/transactions/transactions.component'),
  },
  { path: 'trend', loadComponent: () => import('./features/trend/trend.component') },
  { path: 'upload', loadComponent: () => import('./features/upload/upload.component') },
  { path: 'settings', loadComponent: () => import('./features/settings/settings.component') },
];
