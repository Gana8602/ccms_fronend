import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-alerts',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col gap-1.5">
      @for (alert of alerts(); track alert.id) {
        <div class="flex items-start gap-2 p-1.5 bg-glass-light hover:bg-glass-medium rounded border-l-2 cursor-pointer transition-colors"
             [ngClass]="{
               'border-neon-red': alert.severity === 'high',
               'border-neon-orange': alert.severity === 'medium',
               'border-neon-blue': alert.severity === 'low'
             }">
          <i class="mt-0.5 text-xs" 
             [class.pi-exclamation-triangle]="alert.severity === 'high'" [class.text-neon-red]="alert.severity === 'high'"
             [class.pi-info-circle]="alert.severity === 'medium'" [class.text-neon-orange]="alert.severity === 'medium'"
             [class.pi-bell]="alert.severity === 'low'" [class.text-neon-blue]="alert.severity === 'low'"
             class="pi"></i>
          
          <div class="flex flex-col flex-grow min-w-0">
            <div class="text-[9px] 2xl:text-[10px] text-slate-200 font-bold truncate">{{ alert.title }}</div>
            <div class="text-[8px] text-slate-400 truncate">{{ alert.location }}</div>
          </div>
          <div class="text-[7px] text-slate-500 whitespace-nowrap">{{ alert.time }}</div>
        </div>
      }
    </div>
  `
})
export class AlertsComponent {
  alerts = signal([
    { id: 1, title: 'High Crowd Density', location: 'Sannidhanam - Sector 4', time: '10:28 AM', severity: 'high' },
    { id: 2, title: 'Medical Emergency', location: 'Pamba Base Camp', time: '10:21 AM', severity: 'high' },
    { id: 3, title: 'Traffic Slow Movement', location: 'Nilakkal - 3rd Mile', time: '10:15 AM', severity: 'medium' },
    { id: 4, title: 'Child Separated', location: 'Sabaripedam', time: '10:10 AM', severity: 'medium' },
    { id: 5, title: 'VIP Movement', location: 'Route 1', time: '09:45 AM', severity: 'low' },
    { id: 6, title: 'Weather Advisory', location: 'All Sectors', time: '09:00 AM', severity: 'low' }
  ]);
}
