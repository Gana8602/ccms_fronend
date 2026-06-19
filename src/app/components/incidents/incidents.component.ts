import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-incidents',
  standalone: true,
  imports: [CommonModule],
  template: `
    <table class="w-full text-left border-collapse">
      <thead class="sticky top-0 bg-navy-900/90 backdrop-blur z-10">
        <tr>
          <th class="py-1 px-1 text-[8px] font-bold text-slate-500 uppercase">Time</th>
          <th class="py-1 px-1 text-[8px] font-bold text-slate-500 uppercase">Location</th>
          <th class="py-1 px-1 text-[8px] font-bold text-slate-500 uppercase">Type</th>
          <th class="py-1 px-1 text-[8px] font-bold text-slate-500 uppercase text-right">Status</th>
        </tr>
      </thead>
      <tbody>
        @for (inc of incidents(); track inc.id) {
          <tr class="border-b border-glass-light hover:bg-glass-light cursor-pointer transition-colors group">
            <td class="py-1.5 px-1 text-[8px] text-slate-400 whitespace-nowrap">{{ inc.time }}</td>
            <td class="py-1.5 px-1 text-[9px] text-slate-300 truncate max-w-[80px]">{{ inc.location }}</td>
            <td class="py-1.5 px-1 text-[9px] text-slate-300">{{ inc.type }}</td>
            <td class="py-1.5 px-1 text-right">
              <span class="text-[7px] px-1.5 py-0.5 rounded font-bold tracking-wider uppercase"
                    [ngClass]="{
                      'bg-red-500/20 text-neon-red border border-neon-red/30': inc.status === 'Active',
                      'bg-green-500/20 text-neon-green border border-neon-green/30': inc.status === 'Resolved'
                    }">
                {{ inc.status }}
              </span>
            </td>
          </tr>
        }
      </tbody>
    </table>
  `
})
export class IncidentsComponent {
  incidents = signal([
    { id: 1, time: '10:39 AM', location: 'Sannidhanam', type: 'High Density', status: 'Active' },
    { id: 2, time: '10:31 AM', location: 'Pamba', type: 'Medical', status: 'Active' },
    { id: 3, time: '10:18 AM', location: 'Sabaripedam', type: 'Distress', status: 'Active' },
    { id: 4, time: '10:10 AM', location: 'Nilakkal', type: 'Traffic Slow', status: 'Resolved' },
    { id: 5, time: '09:58 AM', location: 'Pamba', type: 'Lost & Found', status: 'Resolved' },
    { id: 6, time: '09:40 AM', location: 'Sannidhanam', type: 'Medical', status: 'Resolved' },
    { id: 7, time: '09:30 AM', location: 'Nilakkal', type: 'Suspicious', status: 'Resolved' }
  ]);
}
