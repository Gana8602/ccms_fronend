import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layouts/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'live_monitoring',
        loadComponent: () => import('./pages/live-monitoring/live-monitoring.component').then(m => m.LiveMonitoringComponent)
      },
      {
        path: 'system_settings',
        loadComponent: () => import('./pages/system-settings/system-settings.component').then(m => m.SystemSettingsComponent)
      }
    ]
  },
  { path: '**', redirectTo: 'dashboard' }
];
